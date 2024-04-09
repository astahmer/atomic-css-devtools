import { IconButton } from "#components/icon-button";
import * as Toast from "#components/toast";
import * as TooltipPrimitive from "#components/tooltip";
import { Collapsible, Editable, Portal } from "@ark-ui/react";
import { createToaster } from "@ark-ui/react/toast";
import {
  BugIcon,
  Eye,
  EyeOffIcon,
  LayersIcon,
  MonitorSmartphone,
  Undo2,
  XIcon,
} from "lucide-react";
import {
  Dispatch,
  Fragment,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { match } from "ts-pattern";
import { css, cx } from "../../styled-system/css";
import {
  Center,
  Flex,
  HStack,
  Stack,
  Wrap,
  styled,
} from "../../styled-system/jsx";
import { flex, hstack } from "../../styled-system/patterns";
import { evaluator } from "./eval";
import { InspectResult, MatchedStyleRule } from "./inspect-api";
import { hypenateProperty } from "./lib/hyphenate-proprety";
import { isColor } from "./lib/is-color";
import {
  StyleRuleWithProp,
  computeStyles,
  filterRulesByEnv,
  symbols,
} from "./lib/rules";

type Override = { value: string; computed: string | null };
type OverrideMap = Record<string, Override | null>;

export function SidebarPane() {
  const inspected = useInspectedResult();
  const size = useWindowSize();

  const rulesMatchingEnv = useMemo(
    () =>
      inspected
        ? filterRulesByEnv(inspected.rules, { ...inspected.env, ...size })
        : [],
    [inspected, size]
  );

  const api = useUndoRedo(null as OverrideMap | null);
  const overrides = api.state;
  const setOverrides = api.setState;

  useHotkeys("mod+z", api.undo, []);
  useHotkeys("mod+shift+z", api.redo, []);

  const [groupByLayer, setGroupByLayer] = useState(false);
  const [groupByMedia, setGroupByMedia] = useState(false);
  const [visibleLayersState, setVisibleLayers] = useState<string[]>([]);
  const [filter, setFilter] = useState("");

  // Add platform class to apply targeted styles
  useEffect(() => {
    browser.runtime.getPlatformInfo().then((info) => {
      document.body.classList.add("platform-" + info.os);
    });
  }, []);

  const computed = computeStyles(rulesMatchingEnv, {
    filter,
  });

  // In case the visible layers somehow contain a layer that is not in the inspected document
  // (most likely after visiting a different website) -> Ignore it
  // always fallback to showing the implicit layer
  const visibleLayers = useMemo(() => {
    if (!inspected?.layersOrder) return [symbols.implicitOuterLayer];

    const filtered = visibleLayersState.filter((layer) =>
      inspected.layersOrder.includes(layer)
    );

    return filtered.length > 0 ? filtered : [symbols.implicitOuterLayer];
  }, [inspected?.layersOrder, visibleLayersState]);
  const availableLayers = useMemo(
    () => Array.from(computed.rulesByLayer.keys()),
    [computed.rulesByLayer]
  );

  // Reset visible layers when visiting a different website that have different @layers
  const prevLocation = useRef(null as string | null);
  useEffect(() => {
    if (!inspected?.env.location) return;
    prevLocation.current = inspected?.env.location;
  }, [inspected?.env.location]);

  useEffect(() => {
    if (
      prevLocation.current &&
      prevLocation.current !== inspected?.env.location &&
      availableLayers.length
    ) {
      setVisibleLayers(availableLayers);
    }
  }, [inspected?.env.location, visibleLayers.length, inspected?.layersOrder]);

  if (!inspected) {
    return (
      <Center px="4" h="100%">
        <Stack textStyle="2xl" fontFamily="sans-serif">
          Select an element in the element panel
        </Stack>
      </Center>
    );
  }

  // TODO toggle show source (next to layer/media)
  // TODO toggle btn to remove selectors with `*`
  // TODO highlight things matching filter + part of the selector matching current element (`.dark xxx, xxx .dark`) + parseSelectors from panda
  // TODO CSS vars
  // TODO only atomic (filter out rules with more than 1 declaration)
  // TODO light mode
  // TODO right click (context menu) + mimic the one from `Styles` devtools panel (Copy all declarations as CSS/JS, Copy all changes, Revert to default, etc)
  // TODO revert all to default
  // TODO edit component styles (match all elements with the same classes as the current element, allow updating class names that are part of the class list)
  // TODO allow toggling any declaration (not just atomic)
  // TODO add a button to add a new declaration (inline style)
  // TODO EditableValue for property name
  // TODO auto-completions for property names
  // TODO auto-completions for CSS vars
  // TODO collapse/expand all
  // TODO blue highlight for every elements matching the hovered selector
  // TODO save preferences in idb ?

  const inlineStyleKeys = Object.keys(inspected.style);

  return (
    <>
      <Collapsible.Root
        open={groupByLayer || groupByMedia}
        className={css({
          borderBottom: "1px solid #474747ff", // border-neutral-30
          position: "sticky",
          backgroundColor: "#282828", // neutral-15
          top: "0",
          transform: "translateY(-3px)",
          overflow: "hidden",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          px: "2px",
        })}
      >
        <Flex alignItems="center" position="relative" zIndex="2">
          <styled.input
            placeholder="Filter"
            flex="1"
            overflow="hidden"
            whiteSpace="nowrap"
            backgroundColor="var(--sys-color-state-hover-on-subtle, rgb(40, 40, 40))"
            border="1px solid var(--sys-color-neutral-outline, rgb(117, 117, 117))"
            h="19px"
            padding="4px 3px 3px"
            borderRadius="4px"
            css={{
              color: "var(--sys-color-on-surface, #e3e3e3)",
              _placeholder: {
                color: "var(--sys-color-token-subtle, rgb(143, 143, 143))",
              },
              "&:hover:not(:focus)": {
                backgroundColor:
                  "var(--sys-color-state-hover-on-subtle, rgba(253, 252, 251, 0.1))",
              },
              _focusVisible: {
                outline: "1px solid rgb(153, 200, 255)",
                border: "1px solid transparent",
                outlineColor: "rgb(153, 200, 255)",
              },
            }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Tooltip content="Log inspected element">
            <styled.button
              ml="auto"
              className="group"
              display="flex"
              justifyContent="center"
              alignItems="center"
              px="4px"
              height="26px"
              minWidth="28px"
              _hover={{
                backgroundColor:
                  "var(--sys-color-state-hover-on-subtle, rgb(253 252 251/10%))",
              }}
              _selected={{
                backgroundColor:
                  "var(--sys-color-neutral-container, rgb(60, 60, 60))",
                color: "var(--icon-toggled, rgb(124, 172, 248))",
              }}
              onClick={() =>
                console.log(
                  inspected,
                  {
                    groupByMedia,
                    groupByLayer,
                    visibleLayers,
                    visibleLayersState,
                  },
                  computed
                )
              }
            >
              <BugIcon
                className={css({
                  w: "16px",
                  h: "16px",
                  opacity: { base: 0.8, _groupHover: 1 },
                })}
              />
            </styled.button>
          </Tooltip>
          <Tooltip content="Group elements by @layer">
            <Collapsible.Trigger asChild>
              <styled.button
                aria-selected={groupByLayer}
                className="group"
                display="flex"
                justifyContent="center"
                alignItems="center"
                px="4px"
                height="26px"
                minWidth="28px"
                _hover={{
                  backgroundColor:
                    "var(--sys-color-state-hover-on-subtle, rgb(253 252 251/10%))",
                }}
                _selected={{
                  backgroundColor:
                    "var(--sys-color-neutral-container, rgb(60, 60, 60))",
                  color: "var(--icon-toggled, rgb(124, 172, 248))",
                }}
                onClick={() => {
                  const update = !groupByLayer;
                  if (update) {
                    setVisibleLayers(Array.from(computed.rulesByLayer.keys()));
                  }

                  setGroupByLayer(update);
                }}
              >
                <LayersIcon
                  className={css({
                    w: "16px",
                    h: "16px",
                    opacity: { base: 0.8, _groupHover: 1 },
                  })}
                />
              </styled.button>
            </Collapsible.Trigger>
          </Tooltip>
          <Tooltip content="Group elements by @media">
            <styled.button
              aria-selected={groupByMedia}
              className="group"
              display="flex"
              justifyContent="center"
              alignItems="center"
              px="4px"
              mr="2px"
              height="26px"
              minWidth="28px"
              _hover={{
                backgroundColor:
                  "var(--sys-color-state-hover-on-subtle, rgb(253 252 251/10%))",
              }}
              _selected={{
                backgroundColor:
                  "var(--sys-color-neutral-container, rgb(60, 60, 60))",
                color: "var(--icon-toggled, rgb(124, 172, 248))",
              }}
              onClick={() => {
                setGroupByMedia((current) => !current);
              }}
            >
              <MonitorSmartphone
                className={css({
                  w: "16px",
                  h: "16px",
                  opacity: { base: 0.8, _groupHover: 1 },
                })}
              />
            </styled.button>
          </Tooltip>
        </Flex>
        <Collapsible.Content>
          {/* var(--color-text-secondary) */}
          <styled.div mt="-20px" mb="6px" fontSize="12px" color="#9aa0a6">
            Toggle layer visibility
          </styled.div>
          <Wrap gap="2" alignItems="center" mb="2px">
            {Array.from(computed.rulesByLayer.keys()).map((layer) => {
              return (
                <HStack gap="2px" alignItems="center" key={layer}>
                  <input
                    key={layer}
                    type="checkbox"
                    name="layers"
                    id={"layer-" + layer}
                    value={layer}
                    className={checkbox}
                    checked={visibleLayersState.includes(layer)}
                    disabled={
                      visibleLayers.length === 1 &&
                      layer === symbols.implicitOuterLayer
                    }
                    onChange={(e) =>
                      setVisibleLayers(
                        e.target.checked
                          ? [...visibleLayers, layer]
                          : visibleLayers.filter((l) => l !== layer)
                      )
                    }
                  />
                  <label htmlFor={"layer-" + layer}>
                    {layer}
                    {""}({computed.rulesByLayer.get(layer)?.length})
                  </label>
                </HStack>
              );
            })}
            {visibleLayers.length === 0 ? (
              <button
                className={cx(
                  "group",
                  hstack({ gap: "4px", cursor: "pointer" })
                )}
                onClick={() =>
                  setVisibleLayers(Array.from(computed.rulesByLayer.keys()))
                }
              >
                <Eye
                  className={css({
                    w: "12px",
                    h: "12px",
                    opacity: { base: 0.5, _groupHover: 1 },
                  })}
                />{" "}
                Show all
              </button>
            ) : (
              <button
                className={cx(
                  visibleLayers.length === 1 &&
                    visibleLayers[0]! === symbols.implicitOuterLayer
                    ? undefined
                    : "group",
                  hstack({
                    gap: "4px",
                    cursor:
                      visibleLayers.length === 1 &&
                      visibleLayers[0]! === symbols.implicitOuterLayer
                        ? undefined
                        : "pointer",
                  })
                )}
                onClick={() => setVisibleLayers([])}
                disabled={
                  visibleLayers.length === 1 &&
                  visibleLayers[0]! === symbols.implicitOuterLayer
                }
              >
                <EyeOffIcon
                  className={css({
                    w: "12px",
                    h: "12px",
                    opacity: { base: 0.5, _groupHover: 1 },
                  })}
                />{" "}
                Hide all
              </button>
            )}
          </Wrap>
        </Collapsible.Content>
      </Collapsible.Root>

      <Toaster />
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
          {inlineStyleKeys.length ? (
            <>
              <styled.div mt="4">
                {inlineStyleKeys.map((key, index) => {
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
                          selector: symbols.inlineStyleSelector,
                          style: { [key]: value },
                          parentRule: null,
                          source: symbols.inlineStyleSelector,
                        },
                        inspected,
                        override: overrides?.["style:" + key] ?? null,
                        setOverride: (value, computed) =>
                          setOverrides((overrides) => ({
                            ...overrides,
                            ["style:" + key]:
                              value != null ? { value, computed } : null,
                          })),
                      }}
                    />
                  );
                })}
              </styled.div>
              <styled.hr my="1" opacity="0.2" />
            </>
          ) : null}
          {match(groupByLayer)
            .with(false, () => {
              if (groupByMedia) {
                return (
                  <Stack>
                    {Array.from(computed.rulesInMedia.entries()).map(
                      ([media, rules]) => {
                        return (
                          <DeclarationGroup
                            key={media}
                            label={
                              (media === symbols.noMedia ? "" : "@media ") +
                              `${media} (${rules.length})`
                            }
                            content={
                              <DeclarationList
                                rules={rules}
                                inspected={inspected}
                                overrides={overrides}
                                setOverrides={setOverrides}
                              />
                            }
                          />
                        );
                      }
                    )}
                  </Stack>
                );
              }

              return Array.from(computed.order).map((key, index) => (
                <Declaration
                  {...{
                    key,
                    index,
                    prop: key,
                    matchValue: computed.styles[key],
                    rule: computed.ruleByProp[key],
                    inspected,
                    override: overrides?.[key] ?? null,
                    setOverride: (value, computed) =>
                      setOverrides((overrides) => ({
                        ...overrides,
                        [key]: value != null ? { value, computed } : null,
                      })),
                  }}
                />
              ));
            })
            .with(true, () => {
              if (groupByMedia) {
                console.log(computed.rulesByLayerInMedia);
                return (
                  <Stack>
                    {Array.from(computed.rulesByLayerInMedia.entries())
                      .filter(([layer]) => visibleLayers.includes(layer))
                      .map(([layer, mediaMap]) => {
                        const mediaKeys = Object.keys(mediaMap);
                        return (
                          <DeclarationGroup
                            key={layer}
                            label={
                              (layer === symbols.implicitOuterLayer
                                ? ""
                                : "@layer ") + `${layer} (${mediaKeys.length})`
                            }
                            content={
                              <Stack ml="12px">
                                {mediaKeys.map((media) => {
                                  const mediaRules = mediaMap[media];
                                  return (
                                    <DeclarationGroup
                                      key={media}
                                      label={
                                        (media === symbols.noMedia
                                          ? ""
                                          : "@media ") +
                                        `${media} (${mediaRules.length})`
                                      }
                                      content={
                                        <DeclarationList
                                          rules={mediaRules}
                                          inspected={inspected}
                                          overrides={overrides}
                                          setOverrides={setOverrides}
                                        />
                                      }
                                    />
                                  );
                                })}
                              </Stack>
                            }
                          />
                        );
                      })}
                  </Stack>
                );
              }

              return (
                <Stack>
                  {Array.from(computed.rulesByLayer.entries())
                    .filter(([layer]) => visibleLayers.includes(layer))
                    .map(([layer, rules]) => {
                      return (
                        <DeclarationGroup
                          key={layer}
                          label={
                            (layer === symbols.implicitOuterLayer
                              ? ""
                              : "@layer ") + `${layer} (${rules.length})`
                          }
                          content={
                            <DeclarationList
                              rules={rules}
                              inspected={inspected}
                              overrides={overrides}
                              setOverrides={setOverrides}
                            />
                          }
                        />
                      );
                    })}
                </Stack>
              );
            })
            .exhaustive()}
        </Flex>
      </Stack>
    </>
  );
}

interface DeclarationGroupProps {
  label: string;
  content: ReactNode;
}

const DeclarationGroup = (props: DeclarationGroupProps) => {
  const { label, content } = props;

  return (
    <styled.div className="group">
      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger asChild>
          <styled.div
            role="button"
            className={cx(flex(), "group-btn")}
            cursor="pointer"
            w="100%"
            alignItems="center"
            fontSize="11px"
            opacity={{ base: 0.7, _hover: 1 }}
            _hover={{
              backgroundColor: "rgba(253, 252, 251, 0.1)",
            }}
            ml="3px"
            mb="3px"
          >
            <span
              className={css({
                _before: {
                  content: {
                    base: "'▶︎'",
                    // @ts-expect-error
                    ".group-btn[aria-expanded=true] &": "'▼'",
                  },
                },
                w: "12px",
                h: "12px",
                cursor: "pointer",
              })}
            />
            <styled.span
              textDecoration={{
                base: "none",
                // @ts-expect-error
                ".group-btn:hover &": "underline",
              }}
            >
              {label}
            </styled.span>
          </styled.div>
        </Collapsible.Trigger>
        <Collapsible.Content>{content}</Collapsible.Content>
      </Collapsible.Root>
    </styled.div>
  );
};

interface DeclarationListProps {
  rules: StyleRuleWithProp[];
  inspected: InspectResult;
  overrides: OverrideMap | null;
  setOverrides: Dispatch<SetStateAction<OverrideMap | null>>;
}

const DeclarationList = (props: DeclarationListProps) => {
  const { rules, inspected, overrides, setOverrides } = props;
  return rules.map((rule, index) => {
    const prop = rule.prop;
    return (
      <Declaration
        {...{
          key: index,
          index,
          prop,
          matchValue: rule.style[prop],
          rule,
          inspected,
          override: overrides?.[prop] ?? null,
          setOverride: (value, computed) =>
            setOverrides((overrides) => ({
              ...overrides,
              [prop]: value != null ? { value, computed } : null,
            })),
        }}
      />
    );
  });
};

interface DeclarationProps
  extends Pick<EditableValueProps, "prop" | "override" | "setOverride"> {
  index: number;
  matchValue: string;
  rule: MatchedStyleRule;
  inspected: InspectResult;
}

const checkboxStyles = css.raw({
  fontSize: "10px",
  width: "13px",
  height: "13px",
  px: "4px",
  accentColor: "rgb(124, 172, 248)", // var(--sys-color-primary-bright)
  color: "rgb(6, 46, 111)", // var(--sys-color-on-primary)
});
const checkbox = css(checkboxStyles);

const Declaration = (props: DeclarationProps) => {
  const { prop, index, matchValue, rule, inspected, override, setOverride } =
    props;

  const computedValue =
    override?.computed ||
    inspected.computedStyle[prop] ||
    inspected.cssVars[matchValue];

  const prettySelector = unescapeString(rule.selector);
  const isTogglableClass =
    prettySelector.startsWith(".") && !prettySelector.includes(" ");

  const [enabled, setEnabled] = useState(true);
  const id = useId();

  return (
    <styled.code
      display="flex"
      flexDirection="column"
      gap="1px"
      // var(--sys-color-state-hover-on-subtle)
      _hover={{ backgroundColor: "rgba(253, 252, 251, 0.1)" }}
      textDecoration={enabled ? "none" : "line-through !important"}
    >
      <styled.div display="flex" alignItems="flex-start" mr="2">
        <input
          id={id}
          type="checkbox"
          defaultChecked
          className={css({
            ...checkboxStyles,
            opacity: isTogglableClass ? "1" : "0",
            visibility: "hidden",
            _groupHover: {
              visibility: "visible",
            },
          })}
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
        {/* TODO editable property */}

        <styled.label
          htmlFor={id}
          pl="4px"
          className={css({ color: "rgb(92, 213, 251)" })}
          whiteSpace="nowrap"
        >
          {hypenateProperty(prop)}
        </styled.label>
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
          selector={rule.selector}
          matchValue={matchValue}
          override={override}
          setOverride={setOverride}
        />
        {matchValue.startsWith("var(--") && computedValue && (
          <TooltipPrimitive.Root
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
            <TooltipPrimitive.Trigger asChild>
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
            </TooltipPrimitive.Trigger>
            <Portal>
              <TooltipPrimitive.Positioner>
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
        <styled.div ml="auto" display="flex" gap="2">
          {(rule.media || rule.layer) && (
            <styled.span display="none" opacity="0.4" ml="6px">
              {rule.media}
              {rule.layer ? `@layer ${rule.layer}` : ""}
            </styled.span>
          )}
          <Tooltip
            positioning={{ placement: "left" }}
            content={
              <>
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
                <styled.span ml={rule.media || rule.layer ? "4" : "0"}>
                  {prettySelector}
                </styled.span>
                {rule.media && <styled.span ml="2">{"}"}</styled.span>}
                {rule.layer && <span>{"}"}</span>}
                <styled.span mt="4">{rule.source}</styled.span>
              </>
            }
          >
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
          </Tooltip>
        </styled.div>
      </styled.div>
    </styled.code>
  );
};

interface EditableValueProps {
  /**
   * Selector computed from the inspected element (window.$0 in content script)
   * By traversing the DOM tree until reaching HTML so we can uniquely identify the element
   */
  elementSelector: string;
  /**
   * One of the key of the MatchedStyleRule.style (basically an atomic CSS declaration)
   */
  prop: string;
  /**
   * Selector from the MatchedStyleRule
   */
  selector: string;
  /**
   * Value that was matched with this MatchedStyleRule for this property
   */
  matchValue: string;
  override: { value: string; computed: string | null } | null;
  /**
   * When user overrides the value, we need the computed value (from window.getComputedStyle.getPropertyValue)
   * This is mostly useful when the override is a CSS variable
   * so we can show the underlying value as inlay hint and show the appropriate color preview
   */
  setOverride: (value: string | null, computed: string | null) => void;
}

const EditableValue = (props: EditableValueProps) => {
  const { elementSelector, prop, selector, matchValue, override, setOverride } =
    props;

  const ref = useRef(null as HTMLDivElement | null);
  const [key, setKey] = useState(0);

  const propValue = override?.value || matchValue;
  const updateValue = (update: string) => {
    const kind =
      selector === symbols.inlineStyleSelector ? "inlineStyle" : "cssRule";
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

        const { hasUpdated, computedValue } = await updateValue(update.value);
        if (hasUpdated) {
          setOverride(update.value, computedValue);
        }
      }}
    >
      <Editable.Area ref={ref}>
        <Editable.Input
          defaultValue={propValue}
          onBlur={() => setKey((key) => key + 1)}
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
        <Editable.Preview className={css({ whiteSpace: "normal!" })} />
      </Editable.Area>
      {override !== null && (
        <Tooltip
          content={
            <styled.div fontSize="10px" lineHeight="1.2" gap="1">
              <span>Revert to default</span>
              <span>({matchValue})</span>
            </styled.div>
          }
        >
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
                setOverride(null, null);
              }
            }}
          />
        </Tooltip>
      )}
    </Editable.Root>
  );
};

const useInspectedResult = () => {
  const [result, setResult] = useState(null as InspectResult | null);

  // Refresh on inspected element changed
  useEffect(() => {
    return evaluator.onSelectionChanged((update) => {
      // console.log(update);
      setResult(update);
    });
  }, []);

  // Refresh on pane shown, maybe styles were updated in the official `Styles` devtools panel
  useEffect(() => {
    return evaluator.onPaneShown(async () => {
      const update = await evaluator.inspectElement();
      // console.log(update);

      setResult(update ?? null);
    });
  }, []);

  // Keep track of the location of the inspected element
  const prevLocation = useRef(null as string | null);
  useEffect(() => {
    if (!result?.env.location) return;
    prevLocation.current = result?.env.location;

    const run = async () => {
      const update = await evaluator.inspectElement();
      setResult(update ?? null);
    };
    run();
  }, [result?.env.location]);

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

interface TooltipProps extends PropsWithChildren<TooltipPrimitive.RootProps> {
  content: ReactNode;
  portalled?: boolean;
}

const Tooltip = (props: TooltipProps) => {
  const { children, content, portalled = true, ...rest } = props;
  const Portallish = portalled ? Portal : Fragment;

  return (
    <TooltipPrimitive.Root
      openDelay={0}
      closeDelay={0}
      positioning={{ placement: "bottom" }}
      lazyMount
      {...rest}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <Portallish>
        <TooltipPrimitive.Positioner>
          <TooltipPrimitive.Content
            maxW="var(--available-width)"
            animation="unset"
            display="flex"
            flexDirection="column"
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Positioner>
      </Portallish>
    </TooltipPrimitive.Root>
  );
};

function useUndoRedo<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const historyRef = useRef<T[]>([initialState]);
  const indexRef = useRef(0);

  const setCurrentState = (newState: React.SetStateAction<T>) => {
    const resolvedState =
      typeof newState === "function" ? (newState as Function)(state) : newState;
    const newHistory = historyRef.current.slice(0, indexRef.current + 1);
    newHistory.push(resolvedState);

    historyRef.current = newHistory;
    indexRef.current += 1;
    setState(resolvedState);
  };

  const undo = () => {
    const newIndex = Math.max(indexRef.current - 1, 0);
    if (newIndex !== indexRef.current) {
      indexRef.current = newIndex;
      setState(historyRef.current[newIndex]);
    }
  };

  const redo = () => {
    const newIndex = Math.min(
      indexRef.current + 1,
      historyRef.current.length - 1
    );
    if (newIndex !== indexRef.current) {
      indexRef.current = newIndex;
      setState(historyRef.current[newIndex]);
    }
  };

  return {
    state,
    setState: setCurrentState,
    undo,
    redo,
    canUndo: indexRef.current > 0,
    canRedo: indexRef.current < historyRef.current.length - 1,
  };
}
