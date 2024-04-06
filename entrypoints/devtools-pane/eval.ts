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
  // element
  inspectElement: () => evalEl(inspectElement),
  // event
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
};
window.evaluator = evaluator;
globalThis.evaluator = evaluator;

export function inspectElement(element: HTMLElement) {
  function getAppliedCSS(element: Element): CSSRuleSet {
    let cssRules: CSSRuleSet = {};

    // Function to check if a CSS rule applies to the element
    function ruleAppliesToElement(rule: CSSStyleRule, el: Element): boolean {
      try {
        return el.matches(rule.selectorText);
      } catch (e) {
        return false;
      }
    }

    // Iterating through all stylesheets
    for (let sheet of Array.from(document.styleSheets)) {
      try {
        const cssRulesList = sheet.cssRules ? Array.from(sheet.cssRules) : [];
        // Accessing the rules in each stylesheet
        for (let rule of cssRulesList) {
          // console.log(rule);
          // Check if the rule is a style rule and applies to the element
          if (
            rule instanceof CSSStyleRule &&
            ruleAppliesToElement(rule, element)
          ) {
            for (let i = 0; i < rule.style.length; i++) {
              const cssProperty = rule.style[i];
              cssRules[cssProperty] = rule.style.getPropertyValue(cssProperty);
            }
          }
        }
      } catch (e) {
        // Ignoring cross-origin stylesheets
        console.warn("Skipped a cross-origin stylesheet");
      }
    }

    return cssRules;
  }

  function getInheritedCSS(element: Element): InheritedStyles {
    // const computed = window.getComputedStyle(element)
    const styleMap = element.computedStyleMap();
    const props = Array.from(styleMap.keys());

    let inheritedStyles: InheritedStyles = {};

    // Fetch inheritable properties
    // element.forEach((prop) => {
    //   inheritedStyles[prop] = computed.getPropertyValue(prop);
    // });

    // Get all CSS variables from :root
    // const rootStyles = getComputedStyle(document.documentElement);
    // for (const name of rootStyles) {
    //   if (name.startsWith("--")) {
    //     inheritedStyles[name] = rootStyles.getPropertyValue(name).trim();
    //   }
    // }

    // Traverse up the DOM tree and override with any explicitly set properties
    let parent = element.parentNode;
    while (parent && parent.nodeType === 1) {
      const parentComputed = window.getComputedStyle(parent as Element);
      // Node type 1 is an element
      props.forEach((prop) => {
        if (prop.startsWith("--")) {
          return;
          // inheritedStyles[prop] = parentComputed.getPropertyValue(prop);
        }

        // Check if the parent's style for this property differs
        const parentStyle = parentComputed.getPropertyValue(prop);
        if (parentStyle !== inheritedStyles[prop]) {
          inheritedStyles[prop] = parentStyle;
        }
      });
      parent = parent.parentNode;
    }

    return inheritedStyles;
  }

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
      .map((v) => serialize(v))
      .filter(Boolean) as MatchedRule[];
  }

  interface MatchedStyleRule {
    type: "style";
    source: string;
    selector: string;
    parentRule: MatchedMediaRule | MatchedLayerBlockRule | null;
    style: Record<string, string>;
  }
  interface MatchedMediaRule {
    type: "media";
    source: string;
    parentRule: MatchedLayerBlockRule | null;
    media: string;
  }
  interface MatchedLayerBlockRule {
    type: "layer";
    source: string;
    parentRule: MatchedLayerBlockRule | null;
    layer: string;
  }
  type MatchedRule =
    | MatchedStyleRule
    | MatchedMediaRule
    | MatchedLayerBlockRule;

  const getCssStyleRuleDeclarations = (rule: CSSStyleRule) => {
    const styles = {} as Record<string, string>;
    for (const property in rule.style) {
      if (
        isNaN(property as any) &&
        (property.startsWith("--")
          ? true
          : rule.style.hasOwnProperty(property) && rule.style[property])
      ) {
        styles[property] = rule.style[property];
      }
    }
    if (Object.keys(styles).length === 0) {
      console.log(rule);
    }

    return styles;
  };

  // Object.keys(temp1.style).filter((key) => isNaN(key) && temp1.style[key]).map((key) => ({ [key]: temp1.style[key]  })

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
    } else if (rule instanceof CSSMediaRule) {
      const matched: MatchedMediaRule = {
        type: "media",
        source: getRuleSource(rule),
        parentRule: rule.parentRule
          ? (serialize(rule.parentRule) as any)
          : null,
        media: rule.media.mediaText,
      };
      cache.set(rule, matched);
      return matched;
    } else if (rule instanceof CSSLayerBlockRule) {
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
    } else {
      console.warn("Unknown rule type", rule, typeof rule);
      return null;
    }
  };

  // Function to determine the source of the CSS rule
  function getRuleSource(rule: CSSRule): string {
    if (rule.parentStyleSheet?.href) {
      return rule.parentStyleSheet.href;
    } else if (rule.parentStyleSheet?.ownerNode instanceof HTMLStyleElement) {
      return "<style> tag";
    } else {
      return "inline style";
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

  // const styles = getStylesForElement();
  // const matchedRules = getMatchedCSSRules('.your-element-selector');

  const serialized = {
    // css: getAppliedCSS(element),
    // css2: getInheritedCSS(element),
    // css: window.getComputedStyle(element),
    matchedRules: getMatchedCSSRules(element),
    classes: [...element.classList].filter(Boolean),
    displayName: element.nodeName.toLowerCase(),
  };
  return serialized;
}

interface CSSRuleSet {
  [property: string]: string;
}

//

interface InheritedStyles {
  [property: string]: string;
}

//

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
