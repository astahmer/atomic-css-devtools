import type {
  MatchResult,
  MatchedLayerBlockRule,
  MatchedMediaRule,
  MatchedRule,
} from "./eval";

import { compileQuery, matches } from "media-query-fns";
import { longhands, shorthandProperties } from "./shorthands";

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

/**
 * Computes the final applied styles for a set of CSS rules
 * (Does not include default styles)
 *
 * Rules needs to have been sorted and filtered (with only relevant @media queries) beforehand
 */
export const computeStyles = (rules: MatchedRule[]) => {
  const styles: Record<string, { rule: MatchedRule; value: string }> = {};
  const insertOrder = [] as string[];
  rules.forEach((rule) => {
    if (rule.type === "style") {
      Object.keys(rule.style).forEach((key) => {
        insertOrder.push(key);
        styles[key] = {
          rule: rule,
          value: rule.style[key],
        };
      });
    }
  });
  const order = new Set(Array.from(insertOrder).reverse());
  return { styles, order };
};

/**
 * Is this rule applied to the current environment? (window.innerWidth, window.innerHeight, etc)
 * This checks for the presence of a @media query and if so, matches it against the env
 */
export const isRuleApplied = (
  styleRule: MatchedRule,
  env: MatchResult["env"]
): boolean => {
  if (!styleRule.parentRule) return true;
  if (styleRule.type === "media") {
    const isMatching = matches(compileQuery(styleRule.media), env);
    return isMatching;
  }

  if (styleRule.parentRule.type === "layer") return true;

  return isRuleApplied(styleRule.parentRule, env);
};

export const sortRules = (rules: MatchedRule[], env: MatchResult["env"]) => {
  return Array.from(rules).filter((rule) => {
    if (!isRuleApplied(rule, env)) {
      return false;
    }

    return true;
  });
};

// TODO
export function compactCSS(styles: Record<string, string>) {
  Object.keys(shorthandProperties).forEach((shorthand) => {
    const allEqual = longhands.every(
      (longhand) => styles[longhand] === styles[shorthand]
    );

    if (allEqual) {
      // All longhand values are equal to the shorthand, so remove longhands
      longhands.forEach((longhand) => delete styles[longhand]);
    } else {
      // At least one longhand differs, so remove the shorthand
      delete styles[shorthand];
    }
  });

  return styles;
}
