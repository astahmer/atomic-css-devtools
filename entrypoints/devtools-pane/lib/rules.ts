import type {
  InspectResult,
  MatchedLayerBlockRule,
  MatchedMediaRule,
  MatchedRule,
  MatchedStyleRule,
} from "../inspect-api";

import { hypenateProperty } from "@pandacss/shared";
import { compileQuery, matches } from "media-query-fns";
import {
  longhands,
  shorthandForLonghand,
  shorthandProperties,
} from "./shorthands";
import { unescapeString } from "./unescape-string";

/**
 * Goes through each parent rule until finding one that matches the predicate
 */
export const getAncestor = <TRule extends MatchedRule>(
  from: MatchedRule,
  predicate: (rule: MatchedRule) => rule is TRule
) => {
  let current = from.parentRule;
  while (current) {
    if (predicate(current)) return current;
    current = current.parentRule;
  }

  return;
};

export const isLayer = (rule: MatchedRule): rule is MatchedLayerBlockRule =>
  rule.type === "layer";
export const isMedia = (rule: MatchedRule): rule is MatchedMediaRule =>
  rule.type === "media";

export const getLayer = (rule: MatchedRule) => getAncestor(rule, isLayer);
export const getMedia = (rule: MatchedRule) => getAncestor(rule, isMedia);

/** Goes through each parent Layer to compute the final dot-delimited layer name */
export const getComputedLayerStack = (rule: MatchedLayerBlockRule) => {
  const stack = [rule];
  let current = rule;
  while (current) {
    if (current.parentRule) {
      current = current.parentRule;
      stack.push(current);
    } else break;
  }

  return stack;
};

export const getComputedLayerName = (rule: MatchedLayerBlockRule) => {
  return getComputedLayerStack(rule)
    .reverse()
    .map((r) => r.layer)
    .join(".");
};

export const getLayerName = (rule: CSSLayerBlockRule) => {
  const stack = [rule];
  let current = rule;
  while (current) {
    if (current.parentRule) {
      current = current.parentRule as CSSLayerBlockRule;
      stack.push(current);
    } else break;
  }

  return stack
    .reverse()
    .map((r) => r.name)
    .join(".");
};

/**
 * Reorders layer names so that nested layers appear immediately before their root layers.
 * @param layers Array of layer names including nested layers.
 * @returns New array of layer names with nested layers reordered.
 */
export function reorderNestedLayers(layers: string[]): string[] {
  // Create a new array to store the reordered layers
  const reordered: string[] = [];

  // Iterate over each layer
  layers.forEach((layer) => {
    // Split the layer to detect if it is a nested layer
    const parts = layer.split(".");
    if (parts.length > 1) {
      // It's a nested layer, find its parent index
      const parentName = parts.slice(0, -1).join(".");
      const parentIndex = reordered.findIndex((el) => el === parentName);
      if (parentIndex !== -1) {
        // Insert the nested layer right before its parent
        reordered.splice(parentIndex, 0, layer);
      } else {
        // If parent is not yet in the list, just add at the end
        reordered.push(layer);
      }
    } else {
      // Not a nested layer, add normally at the end
      reordered.push(layer);
    }
  });

  return reordered;
}

export const symbols = {
  implicitOuterLayer: "<implicit_outer_layer>",
  noMedia: "<no_media>",
  inlineStyleSelector: "<style>",
};

export interface StyleRuleWithProp extends MatchedStyleRule {
  prop: string;
  search: string;
}

interface ComputeStylesOptions {
  sortImplicitFirst?: boolean;
  filter?: string;
}

/**
 * Computes the final applied styles for a set of CSS rules
 * (Does not include default styles)
 *
 * Rules needs to have been sorted and filtered (with only relevant @media queries) beforehand
 */
export const computeStyles = (
  rules: MatchedRule[],
  options: ComputeStylesOptions = {}
) => {
  const { sortImplicitFirst = false, filter } = options;

  const appliedRuleOrProp = {} as Record<string, StyleRuleWithProp>;
  const appliedStyles = {} as Record<string, string>;
  const insertOrder = [] as string[];

  const visibleRuleByProp = {} as Record<string, StyleRuleWithProp>;
  const visibleStyles = {} as Record<string, string>;

  const search = filter?.toLowerCase();

  // console.log(rules);
  rules.forEach((rule) => {
    if (rule.type !== "style") return;

    Object.keys(rule.style).forEach((key) => {
      insertOrder.push(key);
      appliedStyles[key] = rule.style[key];
      // console.log({ rule: rule.selector, key, value: rule.style[key] });
      appliedRuleOrProp[key] = {
        ...rule,
        prop: key,
        search:
          `${key} ${key.toLowerCase()} ${rule.style[key]} ${hypenateProperty(key)} ${rule.selector} ${unescapeString(rule.selector)} ${rule.source} ${rule.layer ? `@layer ${rule.layer}` : symbols.implicitOuterLayer} ${rule.media ? `@media ${rule.media}` : symbols.noMedia}`.trim(),
      };
    });
  });

  Object.keys(appliedRuleOrProp).forEach((key) => {
    const rule = appliedRuleOrProp[key];

    if (search && !Boolean(rule.search.includes(search))) {
      return;
    }

    visibleStyles[key] = rule.style[key];
    visibleRuleByProp[key] = rule;
  });

  const order = new Set(Array.from(insertOrder).reverse());
  order.forEach((prop) => {
    if (!visibleRuleByProp[prop]) order.delete(prop);
  });

  const keys = compactCSS(appliedStyles);
  keys.omit.forEach((key) => order.delete(key));

  const updated = pick(visibleStyles, keys.pick);
  // console.log({ insertOrder, order, keys, styles, updated });

  const rulesInMedia = new Map<string, Array<StyleRuleWithProp>>(
    sortImplicitFirst ? [[symbols.noMedia, []]] : undefined
  );
  order.forEach((prop) => {
    const rule = visibleRuleByProp[prop];
    if (!rule) return;

    const media = rule.media || symbols.noMedia;
    rulesInMedia.set(media, (rulesInMedia.get(media) || []).concat(rule));
  });

  const rulesByLayer = new Map<string, Array<StyleRuleWithProp>>(
    sortImplicitFirst ? [[symbols.implicitOuterLayer, []]] : undefined
  );
  order.forEach((prop) => {
    const rule = visibleRuleByProp[prop];
    if (!rule) return;

    const layer = rule.layer || symbols.implicitOuterLayer;
    rulesByLayer.set(layer, (rulesByLayer.get(layer) || []).concat(rule));
  });

  const rulesByLayerInMedia = new Map<
    string,
    Record<string, Array<StyleRuleWithProp>>
  >(
    sortImplicitFirst
      ? [[symbols.implicitOuterLayer, { [symbols.noMedia]: [] }]]
      : undefined
  );
  order.forEach((prop) => {
    const rule = visibleRuleByProp[prop];
    if (!rule) return;

    const layer = rule.layer || symbols.implicitOuterLayer;
    const media = rule.media || symbols.noMedia;

    const currentLayer = rulesByLayerInMedia.get(layer) || {};
    const currentMedia = currentLayer[media] || [];

    currentMedia.push(rule);
    rulesByLayerInMedia.set(layer, { ...currentLayer, [media]: currentMedia });
  });

  // console.log({
  //   appliedRuleOrProp,
  //   appliedStyles,
  //   visibleStyles,
  //   visibleRuleByProp,
  // });

  return {
    styles: updated,
    ruleByProp: visibleRuleByProp,
    order,
    rulesInMedia,
    rulesByLayer,
    rulesByLayerInMedia,
  };
};

/** Pick given properties in object */
export function pick<T, K extends keyof T>(obj: T, paths: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;

  Object.keys(obj as any).forEach((key) => {
    if (!paths.includes(key as K)) return;
    // @ts-expect-error
    result[key] = obj[key];
  });

  return result as Pick<T, K>;
}

/**
 * Is this rule applied to the current environment? (window.innerWidth, window.innerHeight, etc)
 * This checks for the presence of a @media query and if so, matches it against the env
 */
export const isRuleApplied = (
  styleRule: MatchedRule,
  env: InspectResult["env"]
): boolean => {
  if (!styleRule.parentRule) return true;
  if (styleRule.type === "media") {
    const isMatching = matches(compileQuery(styleRule.media), env);
    return isMatching;
  }

  if (styleRule.parentRule.type === "layer") return true;

  return isRuleApplied(styleRule.parentRule, env);
};

export const filterRulesByEnv = (
  rules: MatchedRule[],
  env: InspectResult["env"]
) => {
  return Array.from(rules).filter((rule) => {
    if (!isRuleApplied(rule, env)) {
      return false;
    }

    return true;
  });
};

/**
 * Only keep relevant properties, filtering longhands/shorthands when possible
 */
export function compactCSS(styles: Record<string, any>) {
  const picked = new Set<string>();
  const omit = new Set<string>();

  const props = Object.keys(styles);
  const visited = new Set<string>();

  props.forEach((prop) => {
    let shorthand = Boolean(
      shorthandProperties[prop as keyof typeof shorthandProperties]
    )
      ? prop
      : undefined;

    if (!shorthand) {
      const isLongHand = longhands.includes(prop);
      if (!isLongHand) {
        // anything that is not a shorthand or a longhand
        // e.g `color` or `display`
        picked.add(prop);
        return;
      }

      shorthand =
        shorthandForLonghand[prop as keyof typeof shorthandProperties];

      if (visited.has(shorthand)) {
        return;
      }
    }

    if (!shorthand) {
      // anything that is not a shorthand or a longhand
      // e.g `color` or `display`
      picked.add(prop);
      return;
    }

    visited.add(shorthand);

    const longhandsForShorthand =
      shorthandProperties[shorthand as keyof typeof shorthandProperties];
    const longhandsInProps = longhandsForShorthand.filter(
      (longhand) => styles[longhand]
    );

    const shorthandValue = styles[shorthand!];
    const firstLonghandValue = styles[longhandsInProps[0]];
    const allEqual = longhandsInProps.every(
      (longhand) => styles[longhand] === shorthandValue
    );

    if (longhandsForShorthand.length !== longhandsInProps.length && !allEqual) {
      // At least one longhand differs but not all longhands are in the styles
      // so we need to keep both
      // e.g `padding: "1px"; `paddingTop: "2px"
      //      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      picked.add(shorthand);
      longhandsInProps.forEach((longhand) => picked.add(longhand));
    } else if (allEqual) {
      // All longhand values are equal to the shorthand, so remove longhands
      // e.g `padding: "1px"; paddingTop: "1px"; paddingBottom: "1px"; paddingLeft: "1px"; paddingRight: "1px"`
      //      ^^^^^^^^^^^^^^
      picked.add(shorthand);
      longhandsForShorthand.forEach((longhand) => omit.add(longhand));
    } else if (
      !shorthandValue &&
      longhandsForShorthand.length === longhandsInProps.length &&
      longhandsInProps.every(
        (longhand) => styles[longhand] === firstLonghandValue
      )
    ) {
      // All longhand values are equal, but the shorthand is missing
      // so we can safely remove longhands & add the shorthand to the styles object
      // e.g `paddingTop: "1px"; paddingBottom: "1px"; paddingLeft: "1px"; paddingRight: "1px"`
      picked.add(shorthand);
      longhandsForShorthand.forEach((longhand) => omit.add(longhand));
      styles[shorthand!] = firstLonghandValue;
    } else {
      // At least one longhand differs, so remove the shorthand
      // e.g `padding: "1px"; paddingTop: "2px"; paddingBottom: "1px"; paddingLeft: "1px"; paddingRight: "1px"`
      //                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      longhandsForShorthand.forEach((longhand) => picked.add(longhand));
      omit.add(shorthand);
    }
  });

  return { pick: Array.from(picked), omit: Array.from(omit) };
}
