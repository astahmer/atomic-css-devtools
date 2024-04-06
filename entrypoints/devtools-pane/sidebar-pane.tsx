import { useEffect, useMemo, useState } from "react";
import { css } from "../../styled-system/css";
import { Box, Flex, Stack, styled } from "../../styled-system/jsx";
import {
  MatchResult,
  MatchedLayerBlockRule,
  MatchedMediaRule,
  MatchedRule,
  MatchedStyleRule,
  evaluator,
} from "./eval";
import { compileQuery, matches, toEnglishString } from "media-query-fns";

import { ChevronDownIcon } from "lucide-react";
import * as Accordion from "#components/accordion";
import { Button } from "../../components/button";
import { isColor } from "./is-color";

export function SidebarPane() {
  const [result, setResult] = useState(
    null as Awaited<ReturnType<typeof evaluator.inspectElement>> | null
  );
  const size = useWindowSize();

  const sorted = useMemo(
    () => (result ? sortRules(result.rules, { ...result.env, ...size }) : []),
    [result, size]
  );
  const { styles, order } = computeStyles(sorted);

  return (
    <>
      <Button
        onClick={async () => {
          const result = await evaluator.inspectElement();
          console.log(result);
          setResult(result);
        }}
      >
        run
      </Button>
      {/* <Demo /> */}
      {result && (
        <Stack>
          <Box textStyle="lg">
            {"<"}
            {result.displayName}
            {">"} matched {result?.rules?.length} rules
          </Box>
          <code>{result.classes}</code>
          <Flex
            direction="column"
            textStyle="sm"
            fontFamily="monospace"
            fontSize="11px"
            lineHeight="1.2"
            px="4"
          >
            {Object.keys(result.style).map((key) => {
              const value = result.style[key] as string;

              return (
                <styled.code display="flex" alignItems="center" key={key}>
                  <styled.span color="rgb(92, 213, 251)">{key}</styled.span>
                  <styled.span mr="6px">:</styled.span>
                  {isColor(value) && (
                    <styled.div
                      display="inline-block"
                      border="1px solid #757575"
                      width="12px"
                      height="12px"
                      mr="4px"
                      style={{ backgroundColor: value }}
                    />
                  )}
                  <styled.span>{value}</styled.span>
                  {/* <styled.span opacity="0.4" ml="6px">
                    {"// style"}
                  </styled.span> */}
                  <styled.span ml="auto" opacity="0.7">
                    style
                  </styled.span>
                </styled.code>
              );
            })}
            <styled.hr my="1" opacity="0.2" />
            {Array.from(order).map((key) => {
              const match = styles[key];
              const rule = match.rule as MatchedStyleRule;

              const parentMedia = getMedia(rule);
              const parentLayer = getLayer(rule);

              const computedValue = result.computedStyle[key];

              return (
                <styled.code
                  display="flex"
                  flexDirection="column"
                  key={key}
                  gap="1px"
                >
                  <styled.div display="flex" alignItems="center">
                    {/* <styled.span>
                      {rule.type === "style" ? rule.selector + "{" : ""}
                    </styled.span> */}
                  </styled.div>
                  <styled.div display="flex" alignItems="center">
                    <styled.span color="rgb(92, 213, 251)">{key}</styled.span>
                    <styled.span mr="6px">:</styled.span>
                    {/* {} */}
                    {isColor(computedValue) && (
                      <styled.div
                        display="inline-block"
                        border="1px solid #757575"
                        width="12px"
                        height="12px"
                        mr="4px"
                        style={{ backgroundColor: computedValue }}
                      />
                    )}
                    <styled.span>{match.value}</styled.span>
                    <styled.div ml="auto" display="flex" gap="2">
                      {(parentMedia || parentLayer) && (
                        <styled.span display="none" opacity="0.4" ml="6px">
                          {parentMedia ? parentMedia.media : ""}{" "}
                          {parentLayer
                            ? `@layer ${getComputedLayer(parentLayer)
                                .reverse()
                                .map((r) => r.layer)
                                .join(".")}`
                            : ""}
                        </styled.span>
                      )}
                      <styled.span
                        // textDecoration="underline"
                        maxWidth="200px"
                        textOverflow="ellipsis"
                        overflow="hidden"
                        whiteSpace="nowrap"
                        opacity="0.7"
                      >
                        {rule.selector}
                      </styled.span>
                    </styled.div>
                  </styled.div>
                  {/* <styled.span>{rule.type === "style" ? "}" : ""}</styled.span> */}
                </styled.code>
              );
            })}
          </Flex>
          {/* <code>{JSON.stringify(computeStyle(sorted), null, 2)}</code> */}
          {/* {sorted.map((rule, index) => (
            <RenderRule key={rule.type + index} rule={rule} />
          ))} */}

          {/* <pre>{JSON.stringify(result?.rules, null, 2)}</pre> */}
        </Stack>
      )}
    </>
  );
}

const getAncestor = <TRule extends MatchedRule>(
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
const isLayer = (rule: MatchedRule): rule is MatchedLayerBlockRule =>
  rule.type === "layer";
const isMedia = (rule: MatchedRule): rule is MatchedMediaRule =>
  rule.type === "media";

const getLayer = (rule: MatchedRule) => getAncestor(rule, isLayer);
const getMedia = (rule: MatchedRule) => getAncestor(rule, isMedia);

const getComputedLayer = (rule: MatchedLayerBlockRule) => {
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

// const getLayer = (rule: MatchedRule) => {
//   if (rule.type === "style") {
//     return rule.parentRule?.layer;
//   }
//   return rule.layer;
// };

const computeStyles = (rules: MatchedRule[]) => {
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

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({} as MatchResult["env"]);

  useEffect(() => {
    return evaluator.onWindowResize((ev) => {
      setWindowSize(ev);
    });
  }, []);

  return windowSize;
};

const isRuleApplied = (
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

const sortRules = (rules: MatchedRule[], env: MatchResult["env"]) => {
  return Array.from(rules).filter((rule) => {
    if (!isRuleApplied(rule, env)) {
      return false;
    }

    return true;
  });
};

function compactCSS(styles: Record<string, string>) {
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

const RenderRule = ({ rule }: { rule: MatchedRule }) => {
  if (rule.type === "style") {
    return (
      <Stack>
        <Box fontWeight="bold">{rule.selector}</Box>
        <pre>{JSON.stringify(compactCSS(rule.style), null, 2)}</pre>
      </Stack>
    );
  }

  if (rule.type === "media") {
    return (
      <Stack>
        <Box fontWeight="bold">{rule.media}</Box>
        {/* <pre>{JSON.stringify(rule.style, null, 2)}</pre> */}
      </Stack>
    );
  }

  if (rule.type === "layer") {
    return (
      <Stack>
        <Box fontWeight="bold">{rule.layer}</Box>
        {/* <pre>{JSON.stringify(rule.style, null, 2)}</pre> */}
      </Stack>
    );
  }

  return null;
};

const Demo = (props: Accordion.RootProps) => {
  const items = ["React", "Solid", "Svelte", "Vue"];
  return (
    <Accordion.Root defaultValue={["React"]} multiple {...props}>
      {items.map((item, id) => (
        <Accordion.Item key={id} value={item} disabled={item === "Svelte"}>
          <Accordion.ItemTrigger>
            {item}
            <Accordion.ItemIndicator>
              <ChevronDownIcon />
            </Accordion.ItemIndicator>
          </Accordion.ItemTrigger>
          <Accordion.ItemContent>
            Pudding donut gummies chupa chups oat cake marzipan biscuit tart.
            Dessert macaroon ice cream bonbon jelly. Jelly topping tiramisu
            halvah lollipop.
          </Accordion.ItemContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
};

const shorthandProperties = {
  animation: [
    "animationName",
    "animationDuration",
    "animationTimingFunction",
    "animationDelay",
    "animationIterationCount",
    "animationDirection",
    "animationFillMode",
    "animationPlayState",
  ],
  background: [
    "backgroundImage",
    "backgroundPosition",
    "backgroundSize",
    "backgroundRepeat",
    "backgroundAttachment",
    "backgroundOrigin",
    "backgroundClip",
    "backgroundColor",
  ],
  backgroundPosition: ["backgroundPositionX", "backgroundPositionY"],
  border: ["borderWidth", "borderStyle", "borderColor"],
  borderBlockEnd: [
    "borderBlockEndWidth",
    "borderBlockEndStyle",
    "borderBlockEndColor",
  ],
  borderBlockStart: [
    "borderBlockStartWidth",
    "borderBlockStartStyle",
    "borderBlockStartColor",
  ],
  borderBottom: ["borderBottomWidth", "borderBottomStyle", "borderBottomColor"],
  borderColor: [
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
  ],
  borderImage: [
    "borderImageSource",
    "borderImageSlice",
    "borderImageWidth",
    "borderImageOutset",
    "borderImageRepeat",
  ],
  borderInlineEnd: [
    "borderInlineEndWidth",
    "borderInlineEndStyle",
    "borderInlineEndColor",
  ],
  borderInlineStart: [
    "borderInlineStartWidth",
    "borderInlineStartStyle",
    "borderInlineStartColor",
  ],
  borderLeft: ["borderLeftWidth", "borderLeftStyle", "borderLeftColor"],
  borderRadius: [
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
  ],
  borderRight: ["borderRightWidth", "borderRightStyle", "borderRightColor"],
  borderStyle: [
    "borderTopStyle",
    "borderRightStyle",
    "borderBottomStyle",
    "borderLeftStyle",
  ],
  borderTop: ["borderTopWidth", "borderTopStyle", "borderTopColor"],
  borderWidth: [
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
  ],
  columnRule: ["columnRuleWidth", "columnRuleStyle", "columnRuleColor"],
  columns: ["columnWidth", "columnCount"],
  container: ["contain", "content"],
  containIntrinsicSize: [
    "containIntrinsicSizeInline",
    "containIntrinsicSizeBlock",
  ],
  cue: ["cueBefore", "cueAfter"],
  flex: ["flexGrow", "flexShrink", "flexBasis"],
  flexFlow: ["flexDirection", "flexWrap"],
  font: [
    "fontStyle",
    "fontVariantCaps",
    "fontVariantEastAsian",
    "fontVariantLigatures",
    "fontVariantNumeric",
    "fontVariantPosition",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "lineHeight",
    "fontFamily",
  ],
  fontSynthesis: [
    "fontSynthesisWeight",
    "fontSynthesisStyle",
    "fontSynthesisSmallCaps",
  ],
  fontVariant: [
    "fontVariantCaps",
    "fontVariantEastAsian",
    "fontVariantLigatures",
    "fontVariantNumeric",
    "fontVariantPosition",
  ],
  gap: ["columnGap", "rowGap"],
  grid: [
    "gridTemplateColumns",
    "gridTemplateRows",
    "gridTemplateAreas",
    "gridAutoColumns",
    "gridAutoRows",
    "gridAutoFlow",
  ],
  gridArea: ["gridRowStart", "gridColumnStart", "gridRowEnd", "gridColumnEnd"],
  gridColumn: ["gridColumnStart", "gridColumnEnd"],
  gridGap: ["gridColumnGap", "gridRowGap"],
  gridRow: ["gridRowStart", "gridRowEnd"],
  gridTemplate: [
    "gridTemplateColumns",
    "gridTemplateRows",
    "gridTemplateAreas",
  ],
  inset: ["top", "right", "bottom", "left"],
  listStyle: ["listStyleType", "listStylePosition", "listStyleImage"],
  margin: ["marginTop", "marginRight", "marginBottom", "marginLeft"],
  mask: [
    "maskImage",
    "maskMode",
    "maskRepeat",
    "maskPosition",
    "maskClip",
    "maskOrigin",
    "maskSize",
    "maskComposite",
  ],
  maskBorder: [
    "maskBorderSource",
    "maskBorderMode",
    "maskBorderSlice",
    "maskBorderWidth",
    "maskBorderOutset",
    "maskBorderRepeat",
  ],
  offset: [
    "offsetPosition",
    "offsetPath",
    "offsetDistance",
    "offsetRotate",
    "offsetAnchor",
  ],
  outline: ["outlineWidth", "outlineStyle", "outlineColor"],
  overflow: ["overflowX", "overflowY"],
  padding: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
  pause: ["pauseBefore", "pauseAfter"],
  placeContent: ["alignContent", "justifyContent"],
  placeItems: ["alignItems", "justifyItems"],
  placeSelf: ["alignSelf", "justifySelf"],
  rest: ["restBefore", "restAfter"],
  scrollMargin: [
    "scrollMarginTop",
    "scrollMarginRight",
    "scrollMarginBottom",
    "scrollMarginLeft",
  ],
  scrollPadding: [
    "scrollPaddingTop",
    "scrollPaddingRight",
    "scrollPaddingBottom",
    "scrollPaddingLeft",
  ],
  scrollPaddingBlock: ["scrollPaddingBlockStart", "scrollPaddingBlockEnd"],
  scrollPaddingInline: ["scrollPaddingInlineStart", "scrollPaddingInlineEnd"],
  scrollSnapMargin: [
    "scrollSnapMarginTop",
    "scrollSnapMarginRight",
    "scrollSnapMarginBottom",
    "scrollSnapMarginLeft",
  ],
  scrollSnapMarginBlock: [
    "scrollSnapMarginBlockStart",
    "scrollSnapMarginBlockEnd",
  ],
  scrollSnapMarginInline: [
    "scrollSnapMarginInlineStart",
    "scrollSnapMarginInlineEnd",
  ],
  scrollTimeline: ["scrollTimelineSource", "scrollTimelineOrientation"],
  textDecoration: [
    "textDecorationLine",
    "textDecorationStyle",
    "textDecorationColor",
  ],
  textEmphasis: ["textEmphasisStyle", "textEmphasisColor"],
  transition: [
    "transitionProperty",
    "transitionDuration",
    "transitionTimingFunction",
    "transitionDelay",
  ],
};

const longhands = Object.values(shorthandProperties).reduce(
  (a, b) => [...a, ...b],
  []
);
