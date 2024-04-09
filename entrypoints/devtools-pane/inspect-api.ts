import { getComputedLayer, getLayer, getMedia } from "./lib/rules";

class InspectAPI {
  /**
   * Inspects an element and returns all matching CSS rules
   * This needs to contain every functions as it will be stringified/evaluated in the browser
   */
  inspectElement(selector: string) {
    const element = document.querySelector(selector) as HTMLElement;
    // console.log("inspectElement", { selector }, element);
    if (!element) return;

    const computed = getComputedStyle(element);
    const matches = this.getMatchingRules(element);
    const cssVars = this.getCssVars(element);
    const layersOrder = matches.layerOrders.flat();

    const serialized = {
      selector,
      rules: matches.rules,
      layersOrder,
      cssVars,
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
      style: this.getInlineStyleProps(element),
      /**
       * This is needed to match rules that are nested in media queries
       * and filter them out if they are not applied with this environment
       */
      env: this.getWindowEnv(),
    };

    const layers = new Map<string, MatchedStyleRule[]>();
    serialized.rules.forEach((_rule) => {
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

    if (layersOrder.length > 0) {
      serialized.rules = serialized.rules.sort((a, b) => {
        if (!a.layer && !b.layer) return 0;
        if (!a.layer) return -1;
        if (!b.layer) return 1;

        const aIndex = layersOrder.indexOf(a.layer);
        const bIndex = layersOrder.indexOf(b.layer);
        return aIndex - bIndex;
      });
    }

    return serialized;
  }

  getWindowEnv(): WindowEnv {
    return {
      widthPx: window.innerWidth,
      heightPx: window.innerHeight,
      deviceWidthPx: window.screen.width,
      deviceHeightPx: window.screen.height,
      dppx: window.devicePixelRatio,
    } as WindowEnv;
  }

  getInlineStyleProps(element: HTMLElement) {
    if (!element.style.cssText) return {};
    return Object.fromEntries(
      Array.from(element.style).map((key) => {
        const important = element.style.getPropertyPriority(key);
        return [
          key,
          element.style[key as keyof typeof element.style] +
            (important ? " !" + important : ""),
        ];
      })
    );
  }

  /**
   * Traverses the document stylesheets and returns all matching CSS rules
   */
  getMatchingRules(element: Element) {
    const layerOrders = [] as Array<string[]>;
    const matchedRules: Array<
      CSSStyleRule | CSSMediaRule | CSSLayerBlockRule
    >[] = [];

    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (sheet.cssRules) {
          const rules = Array.from(sheet.cssRules);
          const matchingRules = this.findMatchingRules(rules, element);
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

    const serialize = this.createSerializer();

    const serialized = matchedRules
      .flat()
      .map((v) => {
        return serialize(v);
      })
      .filter(Boolean) as MatchedStyleRule[];

    return { rules: serialized, layerOrders };
  }

  /**
   * Returns the computed value of a CSS variable
   */
  getComputedCSSVariableValue(element: HTMLElement, variable: string): string {
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

  findStyleRule(selector: string) {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      if (!sheet.cssRules) return;

      const rule = this.findStyleRuleBySelector(
        Array.from(sheet.cssRules),
        selector
      );

      if (rule) {
        return rule;
      }
    }
  }

  updateStyleRule(selector: string, prop: string, value: string) {
    const styleRule = this.findStyleRule(selector);
    if (styleRule) {
      styleRule.style.setProperty(prop, value);
      return true;
    }
  }
  updateElementStyle(element: HTMLElement, prop: string, value: string) {
    if (element) {
      element.style.setProperty(prop, value);
      return true;
    }
  }

  private createSerializer() {
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
          source: this.getRuleSource(rule),
          selector: (rule as CSSStyleRule).selectorText,
          parentRule: rule.parentRule
            ? (serialize(rule.parentRule) as any)
            : null,
          style: this.filterStyleDeclarations(rule as CSSStyleRule),
        };
        cache.set(rule, matched);
        return matched;
      }

      if (rule instanceof CSSMediaRule) {
        const matched: MatchedMediaRule = {
          type: "media",
          source: this.getRuleSource(rule),
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
          source: this.getRuleSource(rule),
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

    return serialize;
  }

  private getCssVars(element: HTMLElement) {
    const cssVars = {} as Record<string, string>;
    // Store every CSS variable (and their computed values) from matched rules
    for (const rule of this.getMatchingRules(element).rules) {
      if (rule.type === "style") {
        for (const property in rule.style) {
          const value = rule.style[property];
          if (value.startsWith("var(--")) {
            cssVars[value] = this.getComputedCSSVariableValue(element, value);
          }
        }
      }
    }
    return cssVars;
  }

  /**
   * Recursively finds all matching CSS rules, traversing @media queries and @layer blocks
   */
  private findMatchingRules(rules: CSSRule[], element: Element) {
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
          this.findMatchingRules(Array.from(rule.cssRules), element)
        );
      }
    }

    return matchingRules;
  }

  /**
   * Recursively finds all matching CSS rules, traversing @media queries and @layer blocks
   */
  private findStyleRuleBySelector(
    rules: CSSRule[],
    selector: string
  ): CSSStyleRule | undefined {
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
        const styleRule = this.findStyleRuleBySelector(
          Array.from(cssRule.cssRules),
          selector
        );
        if (styleRule) {
          return styleRule;
        }
      }
    }
  }

  private getRuleSource(rule: CSSRule): string {
    if (rule.parentStyleSheet?.href) {
      return rule.parentStyleSheet.href;
    } else if (rule.parentStyleSheet?.ownerNode instanceof HTMLStyleElement) {
      return "<style> tag";
    } else {
      return "inline style attribute";
    }
  }

  /**
   * Filter `CSSStyleDeclaration` with CSS vars and only applied (from any CSS rule) properties, add !important when needed
   * Basically, this removes properties that only have default inherited values from an unrelevant source from the dev PoV
   */
  private filterStyleDeclarations(rule: CSSStyleRule) {
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
  }
}

const extractVariableName = (value: string) => {
  const endIndex = value.indexOf(",") || value.length - 1;
  return [value.slice(4, endIndex), value.slice(endIndex + 1)];
};

export const inspectApi = new InspectAPI();

export type InspectResult = NonNullable<
  Awaited<ReturnType<typeof inspectApi.inspectElement>>
>;

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

export interface WindowEnv {
  widthPx: number;
  heightPx: number;
  deviceWidthPx: number;
  deviceHeightPx: number;
  dppx: number;
}
