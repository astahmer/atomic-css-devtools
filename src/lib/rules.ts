import type { InspectResult } from "../inspect-api";
import type {
  MatchedLayerBlockRule,
  MatchedMediaRule,
  MatchedRule,
  MatchedStyleRule,
} from "../devtools-types";

import { hypenateProperty } from "@pandacss/shared";
import { compileQuery, matches } from "media-query-fns";
import { compactCSS } from "./compact-css";
import { pick } from "./pick";
import { symbols } from "./symbols";
import { unescapeString } from "./unescape-string";
import { sortAtRules } from "./sort-at-rules";

/**
 * Goes through each parent rule until finding one that matches the predicate
 */
const getAncestor = <TRule extends MatchedRule>(
  from: MatchedRule,
  predicate: (rule: MatchedRule) => rule is TRule,
) => {
  let current = from.parentRule;
  while (current) {
    if (predicate(current)) return current;
    current = current.parentRule;
  }

  return;
};

const isLayer = (rule: MatchedRule): rule is MatchedLayerBlockRule =>
  rule.type === "layer";
const isMedia = (rule: MatchedRule): rule is MatchedMediaRule =>
  rule.type === "media";

export const getLayer = (rule: MatchedRule) => getAncestor(rule, isLayer);
export const getMedia = (rule: MatchedRule) => getAncestor(rule, isMedia);

/** Goes through each parent Layer to compute the final dot-delimited layer name */
const getComputedLayerStack = (rule: MatchedLayerBlockRule) => {
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
 * Gets the full dot-delimited layer name based on a MatchedLayerBlockRule
 */
export const getMatchedLayerFullName = (rule: MatchedLayerBlockRule) => {
  return getComputedLayerStack(rule)
    .reverse()
    .map((r) => r.layer)
    .join(".");
};

/**
 * Gets the full dot-delimited layer name based on a CSSLayerBlockRule
 */
export const getLayerBlockFullName = (rule: CSSLayerBlockRule) => {
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

export interface StyleRuleWithProp extends MatchedStyleRule {
  prop: string;
  search: string;
}

interface ComputeStylesOptions {
  sortImplicitFirst?: boolean;
  filter?: string;
  hideResetStyles?: boolean
}

const resetSelectors = ['*, ::after, ::before', '*, :after, :before']
const isMatchingSelector = (selector: string, patterns: string[]) => {
  const shortcut = patterns.includes(selector)
  if (shortcut) return true;

  const trimmedPatterns = patterns.map(p => p.split(',').map(s => s.trim()));
  const selectorTrimmedParts = selector.split(',').map(s => s.trim());

  if (trimmedPatterns.some(patternParts => patternParts.every(part => selectorTrimmedParts.includes(part)))) return true;

  return false;
}

/**
 * Computes the final applied styles for a set of CSS rules
 * (Does not include default styles)
 *
 * Rules needs to have been sorted and filtered (with only relevant @media queries) beforehand
 */
export const computeStyles = (
  rules: MatchedRule[],
  options: ComputeStylesOptions = {},
) => {
  const { sortImplicitFirst = false, filter, hideResetStyles } = options;

  const appliedRuleOrProp = {} as Record<string, StyleRuleWithProp>;
  const appliedStyles = {} as Record<string, string>;
  const insertOrder = [] as string[];
  const mediaList = new Set<string>(
    rules
      .filter((r) => r.type === "style" && r.media)
      .map((r) => r.type === "style" && r.media) as string[],
  );
  const mediaOrder = Array.from(mediaList)
    .sort((a, b) => sortAtRules(a, b))
    .concat(symbols.noMedia);

  const visibleRuleByProp = {} as Record<string, StyleRuleWithProp>;
  const visibleStyles = {} as Record<string, string>;

  const search = filter?.toLowerCase();

  // console.log(rules);
  rules.forEach((rule) => {
    if (rule.type !== "style") return;
    if (hideResetStyles && isMatchingSelector(rule.selector, resetSelectors)) {
      return
    }

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

  const rulesInMedia = new Map<string, Array<StyleRuleWithProp>>(
    mediaOrder.map((media) => [media, []]),
  );
  order.forEach((prop) => {
    const rule = visibleRuleByProp[prop];
    if (!rule) return;

    const media = rule.media || symbols.noMedia;
    rulesInMedia.set(media, (rulesInMedia.get(media) || []).concat(rule));
  });

  const rulesByLayer = new Map<string, Array<StyleRuleWithProp>>(
    sortImplicitFirst ? [[symbols.implicitOuterLayer, []]] : undefined,
  );
  order.forEach((prop) => {
    const rule = visibleRuleByProp[prop];
    if (!rule) return;

    const layer = rule.layer || symbols.implicitOuterLayer;
    rulesByLayer.set(layer, (rulesByLayer.get(layer) || []).concat(rule));
  });

  const rulesByLayerInMedia = new Map<
    string,
    Map<string, Array<StyleRuleWithProp>>
  >(
    sortImplicitFirst
      ? [
          [
            symbols.implicitOuterLayer,
            new Map(mediaOrder.map((media) => [media, []])),
          ],
        ]
      : undefined,
  );
  order.forEach((prop) => {
    const rule = visibleRuleByProp[prop];
    if (!rule) return;

    const layer = rule.layer || symbols.implicitOuterLayer;
    const media = rule.media || symbols.noMedia;

    const currentLayer =
      rulesByLayerInMedia.get(layer) ||
      new Map(mediaOrder.map((media) => [media, []]));
    const currentMedia = currentLayer.get(media) || [];

    currentMedia.push(rule);
    currentLayer.set(media, currentMedia);
    rulesByLayerInMedia.set(layer, currentLayer);
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

/**
 * Is this rule applied to the current environment? (window.innerWidth, window.innerHeight, etc)
 * This checks for the presence of a @media query and if so, matches it against the env
 */
const isRuleApplied = (
  styleRule: MatchedRule,
  env: InspectResult["env"],
): boolean => {
  if (!styleRule.parentRule) return true;
  if (styleRule.type === "media") {
    const isMatching = matches(compileQuery(styleRule.media), env);
    return isMatching;
  }

  if (styleRule.parentRule.type === "layer") return true;

  return isRuleApplied(styleRule.parentRule, env);
};

export const filterMatchedRulesByEnv = (
  rules: MatchedRule[],
  env: InspectResult["env"],
) => {
  return Array.from(rules).filter((rule) => {
    if (!isRuleApplied(rule, env)) {
      return false;
    }

    return true;
  });
};
