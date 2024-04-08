import type { InspectResult, MatchedStyleRule } from "../inspect-api";
import type {
  MatchedLayerBlockRule,
  MatchedMediaRule,
  MatchedRule,
} from "../inspect-api";

import { compileQuery, matches } from "media-query-fns";
import {
  longhands,
  shorthandForLonghand,
  shorthandProperties,
} from "./shorthands";

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
export const getComputedLayer = (rule: MatchedLayerBlockRule) => {
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

export const symbols = {
  implicitOuterLayer: "<implicit_outer_layer>",
  noMedia: "<no_media>",
  inlineStyleSelector: "<style>",
};

export interface StyleRuleWithProp extends MatchedStyleRule {
  prop: string;
}

interface ComputeStylesOptions {
  sortImplicitFirst?: boolean;
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
  const { sortImplicitFirst = false } = options;

  const ruleByProp = {} as Record<string, StyleRuleWithProp>;
  const styles = {} as Record<string, string>;
  const insertOrder = [] as string[];

  rules.forEach((rule) => {
    if (rule.type !== "style") return;

    Object.keys(rule.style).forEach((key) => {
      insertOrder.push(key);
      styles[key] = rule.style[key];
      ruleByProp[key] = { ...rule, prop: key };
    });
  });

  const order = new Set(Array.from(insertOrder).reverse());
  const keys = compactCSS(styles);
  keys.omit.forEach((key) => order.delete(key));

  const updated = pick(styles, keys.pick);

  const rulesInMedia = new Map<string, Array<StyleRuleWithProp>>(
    sortImplicitFirst ? [[symbols.noMedia, []]] : undefined
  );
  order.forEach((prop) => {
    const rule = ruleByProp[prop];
    if (!rule) return;

    const media = rule.media || symbols.noMedia;
    rulesInMedia.set(media, (rulesInMedia.get(media) || []).concat(rule));
  });

  const rulesByLayer = new Map<string, Array<StyleRuleWithProp>>(
    sortImplicitFirst ? [[symbols.implicitOuterLayer, []]] : undefined
  );
  order.forEach((prop) => {
    const rule = ruleByProp[prop];
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
    const rule = ruleByProp[prop];
    if (!rule) return;

    const layer = rule.layer || symbols.implicitOuterLayer;
    const media = rule.media || symbols.noMedia;

    const currentLayer = rulesByLayerInMedia.get(layer) || {};
    const currentMedia = currentLayer[media] || [];

    currentMedia.push(rule);
    rulesByLayerInMedia.set(layer, { ...currentLayer, [media]: currentMedia });
  });

  return {
    styles: updated,
    ruleByProp,
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

export const sortRules = (rules: MatchedRule[], env: InspectResult["env"]) => {
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
