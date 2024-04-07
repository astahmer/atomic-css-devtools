import { getMedia, getLayer, getComputedLayer } from "./rules";

const devtools = browser.devtools;
const inspectedWindow = devtools.inspectedWindow;

type AnyFunction = (...args: any[]) => any;
type AnyElementFunction = (element: HTMLElement, ...args: any[]) => any;
type WithoutFirst<T extends AnyFunction> =
  Parameters<T> extends [any, ...infer R] ? R : never;

const evalEl = <T extends AnyElementFunction>(
  fn: T,
  ...args: WithoutFirst<T>
) => {
  return new Promise<ReturnType<T>>(async (resolve, reject) => {
    const stringified =
      "(" +
      fn.toString() +
      ")(" +
      ["$0 || (document.documentElement)"]
        .concat(args as any)
        .map((arg, index) => (index === 0 ? arg : JSON.stringify(arg)))
        .join() +
      ")";
    const [result, error] = await inspectedWindow.eval(stringified);
    if (error) {
      // console.error("{evalEl} error");
      console.log({ stringified });
      return reject(error.value);
    }

    return resolve(result);
  });
};

const evalFn = <T extends AnyFunction>(fn: T, ...args: Parameters<T>) => {
  return new Promise<ReturnType<T>>(async (resolve, reject) => {
    const stringified =
      "(" +
      fn.toString() +
      ")(" +
      args.map((arg) => JSON.stringify(arg)).join() +
      ")";
    const [result, error] = await inspectedWindow.eval(stringified);
    if (error) {
      // console.error("{eval} error");
      console.log({ stringified });
      return reject(error.value);
    }

    return resolve(result);
  });
};

const inspect = async () => {
  const result = await evalEl(inspectElement);

  const layers = new Map<string, MatchedStyleRule[]>();
  result.rules.forEach((_rule) => {
    const rule = _rule as MatchedStyleRule;
    const parentMedia = getMedia(rule);
    const parentLayer = getLayer(rule);

    if (parentLayer) {
      rule.layer = getComputedLayer(parentLayer)
        .reverse()
        .map((r) => r.layer)
        .join(".");

      if (!layers.has(rule.layer)) {
        layers.set(rule.layer, []);
      }
      layers.get(rule.layer)!.push(rule);
    }

    if (parentMedia) {
      rule.media = parentMedia.media;
    }
  });

  return {
    ...result,
    layers,
  };
};

export const evaluator = {
  fn: evalFn,
  el: evalEl,
  copy: (valueToCopy: string) => {
    return evalFn(
      // @ts-expect-error https://developer.chrome.com/docs/devtools/console/utilities/#copy-function
      (value: string) => window.copy(value),
      valueToCopy
    );
  },
  inspectElement: inspect,
  onSelectionChanged: (cb: (element: MatchResult) => void) => {
    const handleSelectionChanged = async () => {
      const element = await inspect();
      cb(element);
    };
    devtools.panels.elements.onSelectionChanged.addListener(
      handleSelectionChanged
    );

    handleSelectionChanged();

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
  findMatchingRule: (selector: string, prop: string, value: string) => {
    return evalFn((selector) => {
      /**
       * Recursively finds all matching CSS rules, traversing @media queries and @layer blocks
       */
      function findMatchingRule(rules: CSSRule[]): CSSStyleRule | undefined {
        for (const cssRule of rules) {
          if (cssRule instanceof CSSStyleRule) {
            if (cssRule.selectorText === selector) {
              return cssRule;
            }
          }

          if (
            cssRule instanceof CSSMediaRule ||
            cssRule instanceof CSSLayerBlockRule
          ) {
            const styleRule = findMatchingRule(Array.from(cssRule.cssRules));
            if (styleRule) {
              return styleRule;
            }
          }
        }
      }

      // console.log({ el, className, selector });
      const findStyleRule = () => {
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
          if (!sheet.cssRules) return;

          const rule = findMatchingRule(Array.from(sheet.cssRules));

          if (rule) {
            return rule;
          }
        }
      };

      const styleRule = findStyleRule();
      if (styleRule) {
        console.log(styleRule);
        // styleRule.style.setProperty(prop, value);
        return styleRule;
      }
    }, selector);
  },
};

export interface MatchedStyleRule {
  type: "style";
  source: string;
  selector: string;
  parentRule: MatchedMediaRule | MatchedLayerBlockRule | null;
  style: Record<string, string>;
  /**
   * Computed layer name from traversing `parentRule`
   */
  layer?: string;
  /**
   * Computed media query from traversing `parentRule`
   */
  media?: string;
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

/**
 * Inspects an element and returns all matching CSS rules
 * This needs to contain every functions as it will be stringified/evaluated in the browser
 */
function inspectElement(element: HTMLElement) {
  const layerOrders = [] as Array<string[]>;

  /**
   * Traverses the document stylesheets and returns all matching CSS rules
   */
  function getMatchingCssRules(element: Element): MatchedRule[] {
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
            rules.forEach((rule) => {
              if (rule instanceof CSSLayerStatementRule) {
                layerOrders.push(Array.from(rule.nameList));
              }
            });
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

  /**
   * Filter `CSSStyleDeclaration` with CSS vars and only applied (from any CSS rule) properties, add !important when needed
   * Basically, this removes properties that only have default inherited values from an unrelevant source from the dev PoV
   */
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

  /**
   * Serializes a CSSRule into a MatchedRule
   * This is needed because we're sending this data to the devtools panel
   */
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

  function getRuleSource(rule: CSSRule): string {
    if (rule.parentStyleSheet?.href) {
      return rule.parentStyleSheet.href;
    } else if (rule.parentStyleSheet?.ownerNode instanceof HTMLStyleElement) {
      return "<style> tag";
    } else {
      return "inline style attribute";
    }
  }

  /**
   * Recursively finds all matching CSS rules, traversing @media queries and @layer blocks
   */
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
  const rules = getMatchingCssRules(element);

  const extractVariableName = (value: string) => {
    const endIndex = value.indexOf(",") || value.length - 1;
    return [value.slice(4, endIndex), value.slice(endIndex + 1)];
  };

  /**
   * Returns the computed value of a CSS variable
   */
  function getComputedCSSVariableValue(variable: string): string {
    const stack: string[] = [variable];
    const seen = new Set<string>();
    let currentValue: string = "";

    while (stack.length > 0) {
      const currentVar = stack.pop()!;
      const [name, fallback] = extractVariableName(currentVar);

      const computed = getComputedStyle(element);
      currentValue = computed.getPropertyValue(name).trim();

      if (!currentValue && fallback) {
        if (!fallback.startsWith("var(--")) return fallback;
        if (!seen.has(fallback)) return fallback;

        seen.add(fallback);
        stack.push(fallback);
      }
    }

    return currentValue;
  }

  const cssVars = {} as Record<string, string>;
  // Store every CSS variable (and their computed values) from matched rules
  for (const rule of rules) {
    if (rule.type === "style") {
      for (const property in rule.style) {
        const value = rule.style[property];
        if (value.startsWith("var(--")) {
          cssVars[value] = getComputedCSSVariableValue(value);
        }
      }
    }
  }

  const serialized = {
    rules,
    cssVars,
    layerOrders,
    classes: [...element.classList].filter(Boolean),
    displayName: element.nodeName.toLowerCase(),
    /**
     * This contains the final style object with all the CSS rules applied on the element
     * including stuff we don't care about
     */
    computedStyle: Object.fromEntries(
      Array.from(computed).map((key) => [key, computed.getPropertyValue(key)])
    ),
    /**
     * This contains the `style` attribute resulting object applied on the element
     */
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
    /**
     * This is needed to match rules that are nested in media queries
     * and filter them out if they are not applied with this environment
     */
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

export type MatchResult = Awaited<ReturnType<typeof inspect>>;

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
