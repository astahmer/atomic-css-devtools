import { parseColor } from "@zag-js/color-utils";
import * as TooltipPrimitive from "#components/tooltip";
import { Portal } from "@ark-ui/react";
import { useSelector } from "@xstate/store/react";
import { useId, useState } from "react";
import { css } from "#styled-system/css";
import { styled } from "#styled-system/jsx";
import { Tooltip } from "#components/tooltip";
import { EditableValue, EditableValueProps } from "./editable-value";
import { HighlightMatch } from "./highlight-match";
import type { InspectResult } from "./inspect-api";
import type { MatchedStyleRule } from "./devtools-types";
import { hypenateProperty } from "./lib/hyphenate-proprety";
import { isColor } from "./lib/is-color";
import { symbols } from "./lib/symbols";
import { unescapeString } from "./lib/unescape-string";
import { store } from "./store";
import { useDevtoolsContext } from "./devtools-context";

interface DeclarationProps
  extends Pick<
    EditableValueProps,
    "prop" | "override" | "setOverride" | "isRemovable" | "refresh"
  > {
  index: number;
  matchValue: string;
  rule: MatchedStyleRule;
  inspected: InspectResult;
  hasLineThrough?: boolean;
}

export const checkboxStyles = css.raw({
  width: "13px",
  height: "13px",
  px: "4px",
  color: "devtools.on-primary",
  accentColor: "devtools.primary-bright",
  fontSize: "10px",
});

export const Declaration = (props: DeclarationProps) => {
  const {
    prop,
    index,
    matchValue,
    rule,
    inspected,
    override,
    setOverride,
    hasLineThrough,
    isRemovable,
    refresh,
  } = props;

  let computedValue = override?.computed;

  if (matchValue.includes("var(--") && inspected.cssVars[matchValue]) {
    computedValue = inspected.cssVars[matchValue];
  }

  if (computedValue == null) {
    if (rule.selector === symbols.inlineStyleSelector) {
      computedValue = matchValue;
    } else {
      computedValue = inspected.computedStyle[prop];
    }
  }

  const prettySelector = unescapeString(rule.selector);
  const isTogglable =
    rule.selector === symbols.inlineStyleSelector ||
    (prettySelector.startsWith(".") && !prettySelector.includes(" "));

  const [enabled, setEnabled] = useState(true);
  const id = useId();
  const filter = useSelector(store, (s) => s.context.filter);
  const showSelector = useSelector(store, (s) => s.context.showSelector);

  const { evaluator, contentScript } = useDevtoolsContext();
  const colorPickerId = useId();

  return (
    <styled.code
      data-declaration={index}
      display="flex"
      alignItems="flex-start"
      mr="2"
      textDecoration={
        !enabled || hasLineThrough ? "line-through !important" : "none"
      }
      _hover={{ backgroundColor: "devtools.state-hover-on-subtle" }}
    >
      <input
        id={id}
        type="checkbox"
        checked={enabled}
        className={css({
          ...checkboxStyles,
          visibility: "hidden",
          opacity: isTogglable ? "1" : "0!",
          _groupHover: {
            visibility: "visible",
            opacity: 1,
          },
        })}
        disabled={!isTogglable}
        onChange={async (e) => {
          if (rule.selector === symbols.inlineStyleSelector) {
            const enabled = e.target.checked;
            const result = await contentScript.updateStyleRule({
              selectors: inspected.elementSelectors,
              prop: prop,
              value: matchValue,
              kind: "inlineStyle",
              atIndex: index,
              isCommented: !enabled,
            });

            if (result.hasUpdated) {
              setEnabled(enabled);
            }

            return;
          }

          // We can only toggle atomic classes
          if (!isTogglable) {
            return;
          }

          const isEnabled = await evaluator.el((el, className) => {
            try {
              return el.classList.toggle(className);
            } catch (err) {
              console.log(err);
            }
          }, prettySelector.slice(1));

          if (typeof isEnabled === "boolean") {
            setEnabled(isEnabled);
          }
        }}
      />
      {/* TODO editable property */}

      <styled.label
        className={css({
          color: "devtools.token-property-special",
        })}
        htmlFor={id}
        aria-label="Property name"
        pl="4px"
        whiteSpace="nowrap"
      >
        <HighlightMatch highlight={filter}>
          {hypenateProperty(prop)}
        </HighlightMatch>
      </styled.label>
      <styled.span mr="6px">:</styled.span>
      {isColor(computedValue) && (
        <label htmlFor={colorPickerId}>
          {rule.selector === symbols.inlineStyleSelector && (
            <input
              id={colorPickerId}
              hidden
              type="color"
              value={parseColor(computedValue).toString("hex")}
              onChange={(e) => {
                if (rule.selector !== symbols.inlineStyleSelector) {
                  return;
                }

                const update = e.target.value;

                contentScript.updateStyleRule({
                  selectors: inspected.elementSelectors,
                  prop: hypenateProperty(prop),
                  value: update,
                  kind: "inlineStyle",
                  atIndex: index,
                  isCommented: false,
                });
              }}
            />
          )}
          <styled.div
            style={{ backgroundColor: computedValue }}
            aria-label="Color preview"
            display="inline-block"
            alignSelf="center"
            borderColor="devtools.neutral-outline"
            borderWidth="1px"
            width="9.6px"
            height="9.6px"
            mx="4px"
            borderStyle="solid"
          />
        </label>
      )}
      <EditableValue
        index={index}
        prop={prop}
        elementSelector={inspected.elementSelectors}
        selector={rule.selector}
        matchValue={matchValue}
        override={override}
        setOverride={setOverride}
        isRemovable={isRemovable}
        refresh={refresh}
      />
      {matchValue.startsWith("var(--") &&
        computedValue &&
        computedValue !== (override?.value ?? matchValue) && (
          <TooltipPrimitive.Root
            openDelay={0}
            closeDelay={0}
            positioning={{ placement: "bottom" }}
            lazyMount
            // Restore textDecoration on close
            onOpenChange={(details) => {
              const tooltipTrigger = document.querySelector(
                `[data-tooltipid="trigger${prop + index}" ]`,
              ) as HTMLElement;
              if (!tooltipTrigger) return;

              if (details.open) {
                const tooltipContent = document.querySelector(
                  `[data-tooltipid="content${prop + index}" ]`,
                )?.parentElement as HTMLElement;
                if (!tooltipContent) return;

                if (!tooltipContent.dataset.overflow) return;

                tooltipTrigger.style.textDecoration = "underline";
                return;
              }

              tooltipTrigger.style.textDecoration = "";
              return;
            }}
          >
            <TooltipPrimitive.Trigger asChild>
              <styled.span
                data-tooltipid={`trigger${prop}` + index}
                aria-label="Computed value"
                maxWidth="130px"
                ml="11px"
                textOverflow="ellipsis"
                fontSize="10px"
                opacity="0.7"
                overflow="hidden"
                whiteSpace="nowrap"
              >
                {computedValue}
              </styled.span>
            </TooltipPrimitive.Trigger>
            <Portal>
              <TooltipPrimitive.Positioner>
                <span
                  // Only show tooltip if text is overflowing
                  ref={(node) => {
                    const tooltipTrigger = document.querySelector(
                      `[data-tooltipid="trigger${prop + index}" ]`,
                    ) as HTMLElement;
                    if (!tooltipTrigger) return;

                    const tooltipContent = node as HTMLElement;
                    if (!tooltipContent) return;

                    if (
                      tooltipTrigger.offsetWidth < tooltipTrigger.scrollWidth
                    ) {
                      // Text is overflowing, add tooltip
                      tooltipContent.style.display = "";
                      tooltipContent.dataset.overflow = "true";
                    } else {
                      tooltipContent.style.display = "none";
                    }
                  }}
                >
                  <TooltipPrimitive.Content
                    data-tooltipid={`content${prop}` + index}
                    maxW="var(--available-width)"
                    animation="unset"
                  >
                    {computedValue}
                  </TooltipPrimitive.Content>
                </span>
              </TooltipPrimitive.Positioner>
            </Portal>
          </TooltipPrimitive.Root>
        )}
      {showSelector && (
        <styled.div
          className={css({ display: "none", "@/md": { display: "flex" } })}
          gap="2"
          ml="auto"
        >
          <Tooltip
            positioning={{ placement: "left" }}
            content={
              <>
                {rule.layer && (
                  <HighlightMatch highlight={filter}>
                    {`@layer ${rule.layer} \n\n `}
                  </HighlightMatch>
                )}
                {rule.media && (
                  <HighlightMatch highlight={filter} css={{ ml: "2" }}>
                    {`@media ${rule.media} \n\n `}
                  </HighlightMatch>
                )}
                <HighlightMatch
                  highlight={filter}
                  css={{ ml: rule.media || rule.layer ? "4" : "0" }}
                >
                  {prettySelector}
                </HighlightMatch>
                {rule.media && <styled.span ml="2">{"}"}</styled.span>}
                {rule.layer && <span>{"}"}</span>}
                <styled.span mt="4">{rule.source}</styled.span>
              </>
            }
          >
            <styled.span
              onClick={async () => {
                await evaluator.copy(prettySelector);
              }}
              onMouseOver={() => {
                contentScript.highlightSelector({
                  selectors:
                    rule.selector === symbols.inlineStyleSelector
                      ? inspected.elementSelectors
                      : [rule.selector],
                });
              }}
              onMouseOut={(e) => {
                // Skip if the mouse is hovering same selector
                if (
                  e.target instanceof HTMLElement &&
                  e.relatedTarget instanceof HTMLElement &&
                  e.target.innerText === e.relatedTarget.innerText
                ) {
                  return;
                }

                // Clear highlights
                contentScript.highlightSelector({ selectors: [] });
              }}
              maxWidth={{
                base: "150px",
                sm: "200px",
                md: "300px",
              }}
              // cursor="pointer"
              textDecoration={{
                _hover: "underline",
              }}
              textOverflow="ellipsis"
              opacity="0.7"
              overflow="hidden"
              whiteSpace="nowrap"
            >
              <HighlightMatch highlight={filter}>
                {prettySelector}
              </HighlightMatch>
            </styled.span>
          </Tooltip>
        </styled.div>
      )}
    </styled.code>
  );
};
