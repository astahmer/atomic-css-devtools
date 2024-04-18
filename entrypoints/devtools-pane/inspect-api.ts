import { asserts } from "./asserts";
import { inlineStylesToObject } from "./lib/astish";
import {
  getComputedLayerName,
  getLayer,
  getLayerName,
  getMedia,
  reorderNestedLayers,
} from "./lib/rules";

class InspectAPI {
  traverseSelectors(selectors: string[]): HTMLElement | null {
    let currentContext: Document | Element | ShadowRoot = document; // Start at the main document

    for (let i = 0; i < selectors.length; i++) {
      let selector = selectors[i];

      if (selector === "::shadow-root") {
        // Assume the next selector targets inside the shadow DOM
        if (
          i + 1 < selectors.length &&
          asserts.isElement(currentContext) &&
          currentContext.shadowRoot
        ) {
          i++; // Move to the next selector which is inside the shadow DOM
          const shadowRoot = currentContext.shadowRoot as ShadowRoot;
          if (shadowRoot) {
            const el = shadowRoot.querySelector(selectors[i]);
            if (el) {
              currentContext = el;
            }
          }
        } else {
          console.error(
            "No shadow root available for selector:",
            selector,
            currentContext
          );
          return null;
        }
      } else if (asserts.isHTMLIFrameElement(currentContext)) {
        // If the current context is an iframe, switch to its content document
        currentContext = currentContext.contentDocument as Document;
        if (currentContext) {
          currentContext = currentContext.querySelector(
            selector
          ) as HTMLElement;
        } else {
          console.error(
            "Content document not accessible in iframe for selector:",
            selector,
            currentContext
          );
          return null;
        }
      } else if (
        asserts.isDocument(currentContext) ||
        asserts.isElement(currentContext) ||
        asserts.isShadowRoot(currentContext)
      ) {
        if (asserts.isElement(currentContext) && currentContext.shadowRoot) {
          currentContext = currentContext.shadowRoot;
        }

        // Regular DOM traversal
        const found = currentContext.querySelector(selector) as HTMLElement;
        if (found) {
          currentContext = found;
        } else {
          console.error(
            "Element not found at selector:",
            selector,
            currentContext
          );
          return null; // Element not found at this selector, exit early
        }
      } else {
        console.error(
          "Current context is neither Document, Element, nor ShadowRoot:",
          currentContext
        );
        return null;
      }
    }

    return currentContext as HTMLElement; // Return the final element, cast to Element since it's not null
  }

  /**
   * Inspects an element and returns all matching CSS rules
   * This needs to contain every functions as it will be stringified/evaluated in the browser
   */
  inspectElement(elementSelectors: string[]) {
    const element = this.traverseSelectors(elementSelectors);
    // console.log({ elementSelectors, element });
    if (!element) return;

    const matches = this.getMatchingRules(element);
    if (!matches) return;

    const computed = getComputedStyle(element);
    const cssVars = this.getCssVars(matches.rules, element);
    const layersOrder = matches.layerOrders.flat();
    const styleEntries = this.getAppliedStyleEntries(element);

    const serialized = {
      elementSelectors,
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
       * This contains only the applied `style` attributes as an array of [property, value] pairs
       */
      styleEntries,
      /**
       * This contains all declared `style` attributes as an array of [property, value] pairs
       */
      styleDeclarationEntries: this.getStyleAttributeEntries(element),
      /**
       * This contains the `style` attribute resulting object applied on the element
       */
      // style: Object.fromEntries(styleEntries),
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
        rule.layer = getComputedLayerName(parentLayer);

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
      location: window.location.href,
      widthPx: window.innerWidth,
      heightPx: window.innerHeight,
      deviceWidthPx: window.screen.width,
      deviceHeightPx: window.screen.height,
      dppx: window.devicePixelRatio,
    } as WindowEnv;
  }

  /**
   * Returns all style entries applied to an element
   * @example
   * `color: red; color: blue;` -> `["color", "blue"]`
   */
  getAppliedStyleEntries(element: HTMLElement) {
    if (!element.style.cssText) return [];
    // console.log(element.style);
    return Array.from(element.style).map((key) => {
      const important = element.style.getPropertyPriority(key);
      return [
        key,
        element.style[key as keyof typeof element.style] +
          (important ? " !" + important : ""),
      ];
    });
  }

  /**
   * Returns all style entries applied to an element
   * @example
   * `color: red; color: blue;` -> `[["color", "red"], ["color", "blue"]]`
   */
  getStyleAttributeEntries(element: HTMLElement) {
    if (!element.style.cssText) return [];
    // console.log(element.style);
    return inlineStylesToObject(element.getAttribute("style") ?? "");
  }

  /**
   * Traverses the document stylesheets and returns all matching CSS rules
   */
  getMatchingRules(element: Element) {
    const seenLayers = new Set<string>();

    const matchedRules: Array<
      CSSStyleRule | CSSMediaRule | CSSLayerBlockRule
    >[] = [];

    const doc = element.getRootNode() as Document;
    if (!doc) return;

    for (const sheet of Array.from(doc.styleSheets)) {
      try {
        if (sheet.cssRules) {
          const rules = Array.from(sheet.cssRules);
          const matchingRules = this.findMatchingRules(
            rules,
            element,
            (rule) => {
              if (asserts.isCSSLayerStatementRule(rule)) {
                rule.nameList.forEach((layer) => seenLayers.add(layer));
              } else if (asserts.isCSSLayerBlockRule(rule)) {
                seenLayers.add(getLayerName(rule));
              }
            }
          );

          if (matchingRules.length > 0) {
            matchedRules.push(matchingRules);
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

    return {
      rules: serialized,
      layerOrders: reorderNestedLayers(Array.from(seenLayers)),
    };
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

  findStyleRule(doc: Document, selector: string) {
    const sheets = Array.from(doc.styleSheets);
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

  computePropertyValue(selectors: string[], prop: string) {
    const element = this.traverseSelectors(selectors);
    if (!element) return;

    const computed = getComputedStyle(element);
    return computed.getPropertyValue(prop);
  }

  updateStyleRule({
    doc,
    selector,
    prop,
    value,
  }: {
    doc: Document;
    selector: string;
    prop: string;
    value: string;
  }) {
    const styleRule = this.findStyleRule(doc, selector);
    if (styleRule) {
      styleRule.style.setProperty(prop, value);
      return true;
    }
  }

  updateInlineStyle(params: InlineStyleUpdate & { element: HTMLElement }) {
    const { element, prop, value, atIndex, mode, isCommented } = params;
    if (element) {
      // element.style.cssText += `${prop}: ${value};`;
      // will not work, it will only the last property+value declaration for a given property

      const cssText = element.getAttribute("style") || "";
      const updated = this.getUpdatedCssText({
        cssText,
        prop,
        value,
        atIndex,
        mode,
        isCommented,
      });
      // but this is fine for some reason
      element.setAttribute("style", updated);
      return true;
    }
  }

  /**
   * getUpdatedCssText("color: red; color: blue;", "color", "green", 0)
   * => "color: red; color: green; color: blue;"
   */
  getUpdatedCssText(params: InlineStyleUpdate & { cssText: string }) {
    const { cssText, prop, value, atIndex, isCommented, mode } = params;
    let declaration = ` ${prop}: ${value}`;
    if (isCommented) {
      declaration = `/* ${declaration} */`;
    }

    if (atIndex === null) {
      return cssText + declaration + ";";
    }

    const split = cssText.split(";").filter(Boolean);

    if (mode === "insert") {
      return split
        .slice(0, atIndex)
        .concat(declaration)
        .concat(split.slice(atIndex).concat(""))
        .join(";");
    }

    split[atIndex] = declaration;
    return split.filter(Boolean).join(";") + ";";
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

      if (asserts.isCSSStyleRule(rule) || rule.type === rule.STYLE_RULE) {
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

      if (asserts.isCSSMediaRule(rule)) {
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

      if (asserts.isCSSLayerBlockRule(rule)) {
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

  private getCssVars(rules: MatchedStyleRule[], element: HTMLElement) {
    const cssVars = {} as Record<string, string>;

    // Store every CSS variable (and their computed values) from matched rules
    for (const rule of rules) {
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
   * Recursively finds all matching CSS rules, traversing `@media` queries and `@layer` blocks
   */
  private findMatchingRules(
    rules: CSSRule[],
    element: Element,
    cb: (rule: CSSRule) => void
  ) {
    let matchingRules: Array<CSSStyleRule | CSSMediaRule | CSSLayerBlockRule> =
      [];

    for (const rule of rules) {
      cb(rule);

      if (asserts.isCSSStyleRule(rule) && element.matches(rule.selectorText)) {
        matchingRules.push(rule);
      } else if (
        asserts.isCSSMediaRule(rule) ||
        asserts.isCSSLayerBlockRule(rule)
      ) {
        matchingRules = matchingRules.concat(
          this.findMatchingRules(Array.from(rule.cssRules), element, cb)
        );
      }
    }

    return matchingRules;
  }

  /**
   * Recursively finds all matching CSS rules, traversing `@media` queries and `@layer` blocks
   */
  private findStyleRuleBySelector(
    rules: CSSRule[],
    selector: string
  ): CSSStyleRule | undefined {
    for (const cssRule of rules) {
      if (asserts.isCSSStyleRule(cssRule)) {
        if (cssRule.selectorText === selector) {
          return cssRule;
        }
      }

      if (
        asserts.isCSSMediaRule(cssRule) ||
        asserts.isCSSLayerBlockRule(cssRule)
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
    } else if (asserts.isHTMLStyleElement(rule.parentStyleSheet?.ownerNode)) {
      const data = rule.parentStyleSheet?.ownerNode.dataset;
      if (data.viteDevId) {
        return data.viteDevId;
      }

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

export interface InlineStyleUpdate {
  prop: string;
  value: string;
  atIndex: number | null;
  mode: "insert" | "edit";
  isCommented: boolean;
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
  location: string;
  widthPx: number;
  heightPx: number;
  deviceWidthPx: number;
  deviceHeightPx: number;
  dppx: number;
}
