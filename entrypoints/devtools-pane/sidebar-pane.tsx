import { useEffect, useMemo, useState } from "react";
import { css } from "../../styled-system/css";
import { Box, Center, Flex, Stack, styled } from "../../styled-system/jsx";
import { MatchResult, MatchedStyleRule, evaluator } from "./eval";

import { isColor } from "./is-color";

import { Editable } from "@ark-ui/react";

import * as Tooltip from "#components/tooltip";
import { Portal } from "@ark-ui/react";

import { IconButton } from "#components/icon-button";
import * as Toast from "#components/toast";
import { createToaster } from "@ark-ui/react/toast";
import { XIcon } from "lucide-react";
import { computeStyles, sortRules } from "./rules";

export function SidebarPane() {
  const [result, setResult] = useState(null as MatchResult | null);
  const size = useWindowSize();

  useEffect(() => {
    return evaluator.onSelectionChanged((update) => {
      console.log(update);
      setResult(update);
    });
  }, []);

  const sorted = useMemo(
    () => (result ? sortRules(result.rules, { ...result.env, ...size }) : []),
    [result, size]
  );
  const { styles, order, ruleByProp } = computeStyles(sorted);

  if (!result) {
    return (
      <Center px="4" h="100%">
        <Stack textStyle="2xl" fontFamily="sans-serif">
          Select an element in the element panel
        </Stack>
      </Center>
    );
  }

  return (
    <>
      <Toaster />
      {result && (
        <Stack pb="4" fontFamily="sans-serif">
          <Box textStyle="lg">
            {"<"}
            {result.displayName}
            {">"} matched {result?.rules?.length} rules
          </Box>
          <code>{result.classes.join(" ")}</code>
          <Flex
            direction="column"
            textStyle="sm"
            fontFamily="monospace"
            fontSize="11px"
            lineHeight="1.2"
            className="group"
          >
            {/* TODO style */}
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
                  <styled.span ml="auto" opacity="0.7">
                    style
                  </styled.span>
                </styled.code>
              );
            })}
            <styled.hr my="1" opacity="0.2" />
            {/* TODO layer separation */}
            {/* TODO media separation */}
            {Array.from(order).map((key, index) => {
              const matchValue = styles[key];
              const rule = ruleByProp[key] as MatchedStyleRule;

              const computedValue =
                result.computedStyle[key] || result.cssVars[matchValue];

              const prettySelector = unescapeString(rule.selector);
              const isTogglableClass =
                prettySelector.startsWith(".") && !prettySelector.includes(" ");

              return (
                <styled.code
                  display="flex"
                  flexDirection="column"
                  key={key}
                  gap="1px"
                  // var(--sys-color-state-hover-on-subtle)
                  _hover={{ backgroundColor: "rgba(253, 252, 251, 0.1)" }}
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
                      onChange={(e) => {
                        console.log(rule.selector);
                        evaluator.el((el, className) => {
                          try {
                            el.classList.toggle(className);
                          } catch {}
                        }, prettySelector.slice(1));
                      }}
                    />
                    {/* TODO editable */}
                    <Editable.Root
                      activationMode="focus"
                      placeholder={key}
                      // var(--webkit-css-property-color,var(--sys-color-token-property-special))
                      className={css({ color: "rgb(92, 213, 251)" })}
                      autoResize
                    >
                      <Editable.Area>
                        <Editable.Input />
                        <Editable.Preview />
                      </Editable.Area>
                    </Editable.Root>
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
                    <styled.span>{matchValue}</styled.span>
                    {matchValue.startsWith("var(--") && computedValue && (
                      <Tooltip.Root
                        openDelay={0}
                        closeDelay={0}
                        positioning={{ placement: "bottom" }}
                        lazyMount
                        // Restore textDecoration on close
                        onOpenChange={(details) => {
                          const tooltipTrigger = document.querySelector(
                            `[data-tooltipid="trigger${key + index}" ]`
                          ) as HTMLElement;
                          if (!tooltipTrigger) return;

                          if (details.open) {
                            const tooltipContent = document.querySelector(
                              `[data-tooltipid="content${key + index}" ]`
                            )?.parentElement as HTMLElement;

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
                            data-tooltipid={`trigger${key}` + index}
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
                                  `[data-tooltipid="trigger${key + index}" ]`
                                ) as HTMLElement;
                                if (!tooltipTrigger) return;

                                const tooltipContent = node as HTMLElement;
                                if (!tooltipContent) return;

                                if (
                                  tooltipTrigger.offsetWidth <
                                  tooltipTrigger.scrollWidth
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
                                data-tooltipid={`content${key}` + index}
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
                              {rule.media && (
                                <styled.span ml="2">{"}"}</styled.span>
                              )}
                              {rule.layer && <span>{"}"}</span>}
                            </Tooltip.Content>
                          </Tooltip.Positioner>
                        </Portal>
                      </Tooltip.Root>
                    </styled.div>
                  </styled.div>
                </styled.code>
              );
            })}
          </Flex>
        </Stack>
      )}
    </>
  );
}

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({} as MatchResult["env"]);

  useEffect(() => {
    return evaluator.onWindowResize((ev) => {
      setWindowSize(ev);
    });
  }, []);

  return windowSize;
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
