import { IconButton } from "#components/icon-button";
import * as Toast from "#components/toast";
import * as Tooltip from "#components/tooltip";
import { Editable, Portal } from "@ark-ui/react";
import { createToaster } from "@ark-ui/react/toast";
import { Undo2, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { css } from "../../styled-system/css";
import { Center, Flex, Stack, styled } from "../../styled-system/jsx";
import { evaluator } from "./eval";
import { InspectResult, MatchedStyleRule } from "./inspect-api";
import { hypenateProperty } from "./lib/hyphenate-proprety";
import { isColor } from "./lib/is-color";
import { computeStyles, sortRules } from "./lib/rules";

export function SidebarPane() {
  const inspected = useInspectedResult();
  const size = useWindowSize();

  const sorted = useMemo(
    () =>
      inspected
        ? sortRules(inspected.rules, { ...inspected.env, ...size })
        : [],
    [inspected, size]
  );
  const { styles, order, ruleByProp } = computeStyles(sorted);
  const [overrides, setOverrides] = useState(
    null as Record<string, string | null> | null
  );

  if (!inspected) {
    return (
      <Center px="4" h="100%">
        <Stack textStyle="2xl" fontFamily="sans-serif">
          Select an element in the element panel
        </Stack>
      </Center>
    );
  }

  // TODO group by layer/media
  // TODO filter
  // TODO only atomic (filter out rules with more than 1 declaration)
  // TODO light mode
  // TODO revert all to default
  // TODO edit component styles (match all elements with the same classes as the current element, allow updating class names that are part of the class list)
  // TODO allow toggling any declaration (not just atomic)
  // TODO add a button to add a new declaration (inline style)
  // TODO EditableValue for property name
  // TODO auto-completions for property names
  // TODO auto-completions for CSS vars

  return (
    <>
      <Toaster />
      {inspected && (
        <Stack pb="4" fontFamily="sans-serif">
          <Flex
            direction="column"
            textStyle="sm"
            fontFamily="monospace"
            fontSize="11px"
            lineHeight="1.2"
            className="group"
          >
            {/* TODO style */}
            <styled.div mt="4">
              {Object.keys(inspected.style).map((key, index) => {
                const value = inspected.style[key] as string;

                return (
                  <Declaration
                    {...{
                      key,
                      index,
                      prop: key,
                      matchValue: value,
                      rule: {
                        type: "style",
                        selector: inlineStyleSelector,
                        style: { [key]: value },
                        parentRule: null,
                        source: inlineStyleSelector,
                      },
                      inspected,
                      override: overrides?.["style-" + key] ?? null,
                      setOverride: (value) =>
                        setOverrides((overrides) => ({
                          ...overrides,
                          ["style-" + key]: value,
                        })),
                    }}
                  />
                );
              })}
            </styled.div>
            <styled.hr my="1" opacity="0.2" />
            {/* TODO layer separation */}
            {/* TODO media separation */}
            {Array.from(order).map((key, index) => (
              <Declaration
                {...{
                  key,
                  index,
                  prop: key,
                  matchValue: styles[key],
                  rule: ruleByProp[key],
                  inspected,
                  override: overrides?.[key] ?? null,
                  setOverride: (value) =>
                    setOverrides((overrides) => ({
                      ...overrides,
                      [key]: value,
                    })),
                }}
              />
            ))}
          </Flex>
        </Stack>
      )}
    </>
  );
}

const inlineStyleSelector = "<style>";

interface DeclarationProps {
  prop: string;
  index: number;
  matchValue: string;
  rule: MatchedStyleRule;
  inspected: InspectResult;
  override: string | null;
  setOverride: (value: string | null) => void;
}

const Declaration = (props: DeclarationProps) => {
  {
    const { prop, index, matchValue, rule, inspected, override, setOverride } =
      props;

    const computedValue =
      inspected.computedStyle[prop] || inspected.cssVars[matchValue];

    const prettySelector = unescapeString(rule.selector);
    const isTogglableClass =
      prettySelector.startsWith(".") && !prettySelector.includes(" ");

    const [enabled, setEnabled] = useState(true);

    return (
      <styled.code
        display="flex"
        flexDirection="column"
        gap="1px"
        // var(--sys-color-state-hover-on-subtle)
        _hover={{ backgroundColor: "rgba(253, 252, 251, 0.1)" }}
        textDecoration={enabled ? "none" : "line-through !important"}
      >
        <styled.div display="flex" alignItems="center" mx="2">
          <styled.input
            type="checkbox"
            defaultChecked
            css={{
              opacity: isTogglableClass ? "1" : "0",
              visibility: "hidden",
              _groupHover: {
                visibility: "visible",
              },
              fontSize: "10px",
              width: "13px",
              height: "13px",
              mr: "4px",
              accentColor: "rgb(124, 172, 248)", // var(--sys-color-primary-bright)
              color: "rgb(6, 46, 111)", // var(--sys-color-on-primary)
            }}
            onChange={async () => {
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
          {/* TODO editable */}

          <styled.span className={css({ color: "rgb(92, 213, 251)" })}>
            {prop}
          </styled.span>
          <styled.span mr="6px">:</styled.span>
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
          <EditableValue
            prop={prop}
            elementSelector={inspected.selector}
            selector={prettySelector}
            matchValue={matchValue}
            override={override}
            setOverride={setOverride}
          />
          {matchValue.startsWith("var(--") && computedValue && (
            <Tooltip.Root
              openDelay={0}
              closeDelay={0}
              positioning={{ placement: "bottom" }}
              lazyMount
              // Restore textDecoration on close
              onOpenChange={(details) => {
                const tooltipTrigger = document.querySelector(
                  `[data-tooltipid="trigger${prop + index}" ]`
                ) as HTMLElement;
                if (!tooltipTrigger) return;

                if (details.open) {
                  const tooltipContent = document.querySelector(
                    `[data-tooltipid="content${prop + index}" ]`
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
              <Tooltip.Trigger asChild>
                <styled.span
                  data-tooltipid={`trigger${prop}` + index}
                  ml="11px"
                  fontSize="10px"
                  opacity="0.7"
                  textOverflow="ellipsis"
                  overflow="hidden"
                  whiteSpace="nowrap"
                  maxWidth="130px"
                >
                  {computedValue}
                </styled.span>
              </Tooltip.Trigger>
              <Portal>
                <Tooltip.Positioner>
                  <span
                    // Only show tooltip if text is overflowing
                    ref={(node) => {
                      const tooltipTrigger = document.querySelector(
                        `[data-tooltipid="trigger${prop + index}" ]`
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
                    <Tooltip.Content
                      data-tooltipid={`content${prop}` + index}
                      maxW="var(--available-width)"
                      animation="unset"
                    >
                      {computedValue}
                    </Tooltip.Content>
                  </span>
                </Tooltip.Positioner>
              </Portal>
            </Tooltip.Root>
          )}
          <styled.div ml="auto" display="flex" gap="2">
            {(rule.media || rule.layer) && (
              <styled.span display="none" opacity="0.4" ml="6px">
                {rule.media}
                {rule.layer ? `@layer ${rule.layer}` : ""}
              </styled.span>
            )}
            <Tooltip.Root
              openDelay={0}
              closeDelay={0}
              positioning={{ placement: "left" }}
              lazyMount
            >
              <Tooltip.Trigger asChild>
                <styled.span
                  maxWidth={{
                    base: "150px",
                    sm: "200px",
                    md: "300px",
                  }}
                  textOverflow="ellipsis"
                  overflow="hidden"
                  whiteSpace="nowrap"
                  opacity="0.7"
                  // cursor="pointer"
                  textDecoration={{
                    _hover: "underline",
                  }}
                  onClick={async () => {
                    await evaluator.copy(prettySelector);
                  }}
                >
                  {prettySelector}
                </styled.span>
              </Tooltip.Trigger>
              <Portal>
                <Tooltip.Positioner>
                  <Tooltip.Content
                    maxW="var(--available-width)"
                    animation="unset"
                    display="flex"
                    flexDirection="column"
                  >
                    {rule.layer && (
                      <span>
                        @layer {rule.layer} {"{\n\n"}{" "}
                      </span>
                    )}
                    {rule.media && (
                      <styled.span ml="2">
                        @media {rule.media} {"{\n\n"}{" "}
                      </styled.span>
                    )}
                    <styled.span ml={rule.media ? "4" : "2"}>
                      {prettySelector}
                    </styled.span>
                    {rule.media && <styled.span ml="2">{"}"}</styled.span>}
                    {rule.layer && <span>{"}"}</span>}
                  </Tooltip.Content>
                </Tooltip.Positioner>
              </Portal>
            </Tooltip.Root>
          </styled.div>
        </styled.div>
      </styled.code>
    );
  }
};

interface EditableValueProps {
  elementSelector: string;
  prop: string;
  selector: string;
  matchValue: string;
  override: string | null;
  setOverride: (value: string | null) => void;
}

const EditableValue = (props: EditableValueProps) => {
  const { elementSelector, prop, selector, matchValue, override, setOverride } =
    props;

  // TODO cmd+z undo/redo
  // TODO btn to revert to default
  const ref = useRef(null as HTMLDivElement | null);
  const [key, setKey] = useState(0);

  // Blur contentEditable when leaving `Atomic CSS` pane
  useEffect(() => {
    const resetFocus = () => {
      if (ref.current?.dataset.focus != null) {
        setKey((key) => key + 1);
      }
    };

    const callback: Parameters<
      typeof browser.runtime.onMessage.addListener
    >[0] = (request, _sender, _sendResponse) => {
      if (request.type === "devtools-hidden") {
        resetFocus();
      }
    };

    browser.runtime.onMessage.addListener(callback);

    return () => {
      browser.runtime.onMessage.removeListener(callback);
      resetFocus();
    };
  }, []);

  const propValue = override || matchValue;
  const updateValue = (update: string) => {
    const kind = selector === inlineStyleSelector ? "inlineStyle" : "cssRule";
    return evaluator.updateStyleRule({
      selector: kind === "inlineStyle" ? elementSelector : selector,
      prop: hypenateProperty(prop),
      value: update,
      kind,
    });
  };

  return (
    <Editable.Root
      key={key}
      autoResize
      selectOnFocus
      value={propValue}
      className={css({ display: "flex", alignItems: "center" })}
      activationMode="focus"
      placeholder={propValue}
      // var(--webkit-css-property-color,var(--sys-color-token-property-special))
      onValueCommit={async (update) => {
        if (!update.value || update.value === propValue) return;

        const hasUpdated = await updateValue(update.value);
        if (hasUpdated) {
          setOverride(update.value);
        }
      }}
    >
      <Editable.Area ref={ref}>
        <Editable.Input
          defaultValue={propValue}
          className={css({
            // boxShadow: "var(--drop-shadow)",
            boxShadow:
              "0 0 0 1px rgb(255 255 255/20%),0 2px 4px 2px rgb(0 0 0/20%),0 2px 6px 2px rgb(0 0 0/10%)!",
            backgroundColor: "#282828ff!",
            textOverflow: "clip!",
            margin: "0 -2px -1px!",
            padding: "0 2px 1px!",
            opacity: "100%!",
            _selection: {
              // --sys-color-tonal-container
              // #004a77ff
              backgroundColor: "#004a77ff",
            },
          })}
        />
        <Editable.Preview />
      </Editable.Area>
      {/* TODO revert to default */}
      {override !== null && (
        <Tooltip.Root
          openDelay={0}
          closeDelay={0}
          positioning={{ placement: "bottom" }}
          lazyMount
        >
          <Tooltip.Trigger asChild>
            <Undo2
              className={css({
                ml: "4px",
                w: "10px",
                h: "10px",
                opacity: { base: 0.5, _hover: 1 },
                cursor: "pointer",
              })}
              onClick={async () => {
                const hasUpdated = await updateValue(matchValue);
                if (hasUpdated) {
                  setOverride(null);
                }
              }}
            />
          </Tooltip.Trigger>
          <Portal>
            <Tooltip.Positioner>
              <Tooltip.Content
                maxW="var(--available-width)"
                animation="unset"
                display="flex"
                fontSize="10px"
                lineHeight="1.2"
                gap="1"
              >
                <span>Revert to default</span>
                <span>({matchValue})</span>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Portal>
        </Tooltip.Root>
      )}
    </Editable.Root>
  );
};

const useInspectedResult = () => {
  const [result, setResult] = useState(null as InspectResult | null);

  // Refresh on inspected element changed
  useEffect(() => {
    return evaluator.onSelectionChanged((update) => {
      console.log(update);
      setResult(update);
    });
  }, []);

  // Refresh on pane shown, maybe styles were updated in the official `Styles` devtools panel
  useEffect(() => {
    return evaluator.onPaneShown(async () => {
      const update = await evaluator.inspectElement();
      console.log(update);
      if (!update) return;

      setResult(update);
    });
  }, []);

  return result;
};

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({} as InspectResult["env"]);

  useEffect(() => {
    return evaluator.onWindowResize((ev) => {
      setWindowSize(ev);
    });
  }, []);

  return windowSize;
};

const usePaneHidden = (cb: () => void) => {
  useEffect(() => {
    return evaluator.onPaneHidden(() => {
      cb();
    });
  }, []);
};

const escapeRegex = /\\/g;
const unescapeString = (str: string) => {
  return str.replace(escapeRegex, "");
};

const [Toaster, toast] = createToaster({
  placement: "top-end",
  duration: 600,
  max: 1,
  pauseOnPageIdle: false,

  render(toast) {
    return (
      <Toast.Root onClick={toast.dismiss} p="10px">
        <Toast.Title fontSize="12px">{toast.title}</Toast.Title>
        <Toast.Description>{toast.description}</Toast.Description>
        <Toast.CloseTrigger asChild>
          <IconButton size="sm" variant="link">
            <XIcon />
          </IconButton>
        </Toast.CloseTrigger>
      </Toast.Root>
    );
  },
});
