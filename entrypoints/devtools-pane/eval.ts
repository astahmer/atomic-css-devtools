const devtools = browser.devtools;
const inspectedWindow = devtools.inspectedWindow;

type AnyFunction = (...args: any[]) => any;
type WithoutFirst<T extends AnyFunction> =
  Parameters<T> extends [any, ...infer R] ? R : never;

const evalEl = <T extends AnyFunction>(fn: T, ...args: WithoutFirst<T>) => {
  return new Promise<ReturnType<T>>(async (resolve, reject) => {
    const [result, error] = await inspectedWindow.eval(
      "(" + fn.toString() + ")(" + ["$0"].concat(args as any).join() + ")"
    );
    if (error) {
      // console.error("{evalEl} error");
      return reject(error.value);
    }

    return resolve(result);
  });
};

const evalFn = <T extends AnyFunction>(fn: T, ...args: Parameters<T>) => {
  return new Promise<ReturnType<T>>(async (resolve, reject) => {
    const [result, error] = await inspectedWindow.eval(
      "(" + fn.toString() + ")(" + args.join() + ")"
    );
    if (error) {
      // console.error("{eval} error");
      return reject(error.value);
    }

    return resolve(result);
  });
};

export const evaluator = {
  fn: evalFn,
  el: evalEl,
  inspectElement: () => evalEl(inspectElement),
  onSelectionChanged: (cb: (element: InspectedElement) => void) => {
    const handleSelectionChanged = async () => {
      const element = await evalEl(inspectElement);
      cb(element);
    };
    devtools.panels.elements.onSelectionChanged.addListener(
      handleSelectionChanged
    );

    return () => {
      devtools.panels.elements.onSelectionChanged.removeListener(
        handleSelectionChanged
      );
    };
  },
  onWindowResize: (cb: (env: MatchResult["env"]) => void) => {
    const port = browser.runtime.connect({ name: "devtools" });
    const handlePortMessage = (message: any) => {
      if (message.action == "resize") {
        cb(message.data);
      }
    };
    port.onMessage.addListener(handlePortMessage);

    return () => {
      port.onMessage.removeListener(handlePortMessage);
    };
  },
};

export interface MatchedStyleRule {
  type: "style";
  source: string;
  selector: string;
  parentRule: MatchedMediaRule | MatchedLayerBlockRule | null;
  style: Record<string, string>;
}
export interface MatchedMediaRule {
  type: "media";
  source: string;
  parentRule: MatchedLayerBlockRule | null;
  media: string;
}
export interface MatchedLayerBlockRule {
  type: "layer";
  source: string;
  parentRule: MatchedLayerBlockRule | null;
  layer: string;
}
export type MatchedRule =
  | MatchedStyleRule
  | MatchedMediaRule
  | MatchedLayerBlockRule;

export function inspectElement(element: HTMLElement) {
  function getMatchedCSSRules(element: Element): MatchedRule[] {
    const matchedRules: Array<
      CSSStyleRule | CSSMediaRule | CSSLayerBlockRule
    >[] = [];

    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (sheet.cssRules) {
          const rules = Array.from(sheet.cssRules);
          const matchingRules = findMatchingRules(rules, element);
          if (matchingRules.length > 0) {
            matchedRules.push(matchingRules);
          }
        }
      } catch (e) {
        // Handle cross-origin stylesheets
      }
    }

    return matchedRules
      .flat()
      .map((v) => {
        return serialize(v);
      })
      .filter(Boolean) as MatchedRule[];
  }

  const getCssStyleRuleDeclarations = (rule: CSSStyleRule) => {
    const styles = {} as Record<string, string>;
    for (const property in rule.style) {
      if (
        isNaN(property as any) &&
        (property.startsWith("--")
          ? true
          : rule.style.hasOwnProperty(property) && rule.style[property])
      ) {
        const important = rule.style.getPropertyPriority(property);
        styles[property] =
          rule.style[property] + (important ? " !" + important : "");
      }
    }

    // TODO empty css vars ?
    // if (Object.keys(styles).length === 0) {
    //   console.log(rule);
    // }

    return styles;
  };

  // https://developer.mozilla.org/en-US/docs/Web/API/CSSRule/type
  const cache = new WeakMap<CSSRule, MatchedRule>();
  const serialize = (rule: CSSRule): MatchedRule | null => {
    const cached = cache.get(rule);
    if (cached) {
      return cached;
    }

    if (rule instanceof CSSStyleRule || rule.type === rule.STYLE_RULE) {
      const matched: MatchedStyleRule = {
        type: "style",
        source: getRuleSource(rule),
        selector: (rule as CSSStyleRule).selectorText,
        parentRule: rule.parentRule
          ? (serialize(rule.parentRule) as any)
          : null,
        style: getCssStyleRuleDeclarations(rule as CSSStyleRule),
      };
      cache.set(rule, matched);
      return matched;
    }

    if (rule instanceof CSSMediaRule) {
      const matched: MatchedMediaRule = {
        type: "media",
        source: getRuleSource(rule),
        parentRule: rule.parentRule
          ? (serialize(rule.parentRule) as any)
          : null,
        media: rule.media.mediaText,
        // query: compileQuery(rule.media.mediaText),
      };
      cache.set(rule, matched);
      return matched;
    }

    if (rule instanceof CSSLayerBlockRule) {
      const matched: MatchedLayerBlockRule = {
        type: "layer",
        source: getRuleSource(rule),
        parentRule: rule.parentRule
          ? (serialize(rule.parentRule) as any)
          : null,
        layer: rule.name,
      };
      cache.set(rule, matched);
      return matched;
    }

    console.warn("Unknown rule type", rule, typeof rule);
    return null;
  };

  // Function to determine the source of the CSS rule
  function getRuleSource(rule: CSSRule): string {
    if (rule.parentStyleSheet?.href) {
      return rule.parentStyleSheet.href;
    } else if (rule.parentStyleSheet?.ownerNode instanceof HTMLStyleElement) {
      return "<style> tag";
    } else {
      return "inline style attribute";
    }
  }

  function findMatchingRules(rules: CSSRule[], element: Element) {
    let matchingRules: Array<CSSStyleRule | CSSMediaRule | CSSLayerBlockRule> =
      [];

    for (const rule of rules) {
      if (rule instanceof CSSStyleRule && element.matches(rule.selectorText)) {
        matchingRules.push(rule);
      } else if (
        rule instanceof CSSMediaRule ||
        rule instanceof CSSLayerBlockRule
      ) {
        matchingRules = matchingRules.concat(
          findMatchingRules(Array.from(rule.cssRules), element)
        );
      }
    }

    return matchingRules;
  }

  const computed = getComputedStyle(element);
  const rules = getMatchedCSSRules(element);

  const serialized = {
    rules,
    classes: [...element.classList].filter(Boolean),
    displayName: element.nodeName.toLowerCase(),
    computedStyle: Object.fromEntries(
      Array.from(computed).map((key) => [key, computed.getPropertyValue(key)])
    ),
    style: (element.style.cssText
      ? Object.fromEntries(
          Array.from(element.style).map((key) => {
            const important = element.style.getPropertyPriority(key);
            return [
              key,
              element.style[key as keyof typeof element.style] +
                (important ? " !" + important : ""),
            ];
          })
        )
      : {}) as Record<string, string>,
    env: {
      widthPx: window.innerWidth,
      heightPx: window.innerHeight,
      deviceWidthPx: window.screen.width,
      deviceHeightPx: window.screen.height,
      dppx: window.devicePixelRatio,
    },
  };
  return serialized;
}

export type MatchResult = Awaited<ReturnType<typeof inspectElement>>;

export function compact<T extends Record<string, any>>(value: T) {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([_, value]) => value !== undefined)
  ) as T;
}

export function toggleClassList(
  inspectedElement: HTMLElement,
  name: string,
  active: boolean
) {
  inspectedElement.classList.toggle(name, active);
  return;
}

export function setClassList(inspectedElement: HTMLElement, classList: string) {
  inspectedElement.className = classList;
}

export type InspectedElement = ReturnType<typeof inspectElement>;
