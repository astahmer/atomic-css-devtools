import * as TooltipPrimitive from "#components/tooltip";
import {
  Collapsible,
  Editable,
  Portal,
  useEditableContext,
} from "@ark-ui/react";
import { camelCaseProperty, esc } from "@pandacss/shared";
import { trackInteractOutside } from "@zag-js/interact-outside";
import {
  BoxSelectIcon,
  BugIcon,
  Eye,
  EyeOffIcon,
  LayersIcon,
  MonitorSmartphone,
  RefreshCwIcon,
  Undo2,
} from "lucide-react";
import {
  Dispatch,
  Fragment,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { cq, flex, hstack } from "../../styled-system/patterns";
import { SystemStyleObject } from "../../styled-system/types";
import CrossCircleFilled from "./components/cross-circle-filled.svg";
import { Tooltip } from "./components/tooltip";
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
import { unescapeString } from "./lib/unescape-string";
import { useInspectedResult } from "./lib/use-inspect-result";
import { useUndoRedo } from "./lib/use-undo-redo";
import { useWindowSize } from "./lib/use-window-size";
import { flushSync } from "react-dom";
import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";

type Override = { value: string; computed: string | null };
type OverrideMap = Record<string, Override | null>;
type HistoryState = {
  overrides: OverrideMap | null;
};

const overrideKey = Symbol("overrideKey");

const store = createStore(
  {
    filter: "",
    showSelector: true,
    groupByLayer: false,
    groupByMedia: false,
    visibleLayers: [] as string[],
    visibleLayersState: [] as string[],
  },
  {
    setFilter: {
      filter: (_ctx, event: { filter: string }) => event.filter,
    },
    setShowSelector: {
      showSelector: (_ctx, event: { showSelector: boolean }) =>
        event.showSelector,
    },
    setGroupByLayer: {
      groupByLayer: (_ctx, event: { groupByLayer: boolean }) =>
        event.groupByLayer,
    },
    setGroupByMedia: {
      groupByMedia: (_ctx, event: { groupByMedia: boolean }) =>
        event.groupByMedia,
    },
    setVisibleLayers: {
      visibleLayers: (_ctx, event: { visibleLayers: string[] }) =>
        event.visibleLayers,
    },
  }
);

export function SidebarPane() {
  const { inspected, refresh } = useInspectedResult(() => {
    api.reset();
  });
  const size = useWindowSize();

  const rulesMatchingEnv = useMemo(
    () =>
      inspected
        ? filterRulesByEnv(inspected.rules, { ...inspected.env, ...size })
        : [],
    [inspected, size]
  );

  const api = useUndoRedo({} as HistoryState);
  const overrides = api.state.overrides;
  const setOverrides = api.setNestedState("overrides");

  // TODO
  // useHotkeys(
  //   "mod+z",
  //   () => {
  //     api.undo((prev, next) => {
  //       if (api.getUpdatedKey(prev) === "overrides")
  //       // const { overrides, inserted } = current;
  //       console.log(prev, next);
  //     });
  //   },
  //   []
  // );
  // useHotkeys(
  //   "mod+shift+z",
  //   () => {
  //     api.redo();
  //   },
  //   []
  // );

  const groupByLayer = useSelector(
    store,
    (state) => state.context.groupByLayer
  );
  const groupByMedia = useSelector(
    store,
    (state) => state.context.groupByMedia
  );
  const visibleLayersState = useSelector(
    store,
    (state) => state.context.visibleLayers
  );
  const filter = useSelector(store, (state) => state.context.filter);

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

    const visible = visibleLayersState.filter((layer) =>
      inspected.layersOrder.includes(layer)
    );

    return visible.length > 0 ? visible : [symbols.implicitOuterLayer];
  }, [inspected?.layersOrder, visibleLayersState]);
  const availableLayers = useMemo(
    () => Array.from(computed.rulesByLayer.keys()),
    [computed.rulesByLayer]
  );

  // Keep track of the inspected website location
  const prevLocation = useRef(null as string | null);
  useEffect(() => {
    if (!inspected?.env.location) return;
    prevLocation.current = inspected?.env.location;
  }, [inspected?.env.location]);

  // Reset visible layers when visiting a different website that have different @layers
  useEffect(() => {
    if (
      prevLocation.current &&
      prevLocation.current !== inspected?.env.location &&
      availableLayers.length
    ) {
      store.send({ type: "setVisibleLayers", visibleLayers: availableLayers });
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

  // TODO inspected element in iframe (storybook)
  // TODO when (next) inline style is disabled (line-through), remove disabled state from previous ones (which are now applied)
  // TODO line-through on atomic class row declaration when there's an inline style declaration for the same prop (unless atomic has important, unless style has important)
  // TODO remove inline style line when backspace + no value

  // TODO compactCss inline style
  // TODO color picker on color previews ?

  // TODO add "link effect" on `var(--here)` with tooltip showing computed value
  // TODO add title attribute when possible (and there is not tooltip already)
  // TODO copy raw value on click sur computed value hint
  // TODO light mode
  // TODO blue highlight (in the browser host website) for every elements matching the hovered selector
  // TODO (firefox) button to highlight all elements matching a selector (like the previous one but click to toggle it)
  // TODO (firefox) red filter input on no results
  // TODO (firefox) green highlight (like git diff) on overrides (added inline styles/updated values)

  // TODO exclude list (of selectors), save in idb
  // TODO highlight part of the selector matching current element (`.dark xxx, xxx .dark`) + parseSelectors from panda
  // TODO right click (context menu) + mimic the one from `Styles` devtools panel (Copy all declarations as CSS/JS, Copy all changes, Revert to default, etc)
  // TODO edit component styles (match all elements with the same classes as the current element, allow updating class names that are part of the class list)
  // TODO EditableValue for property name
  // TODO allow toggling any declaration (not just atomic) (just use an override)
  // TODO auto-completions for property names
  // TODO auto-completions for CSS vars
  // TODO toggle show source (next to layer/media)
  // TODO toggle btn to remove selectors with `*`
  // TODO CSS vars
  // TODO only atomic (filter out rules with more than 1 declaration)
  // TODO revert all to default (by group = only in X layer/media/or all if not grouped?)
  // TODO collapse/expand all
  // TODO save preferences in idb ?
  // TODO when adding inlien styles, add warning icon + line-though if property name is invalid ?
  // TODO when property value is using a known number/amount unit, use NumberInput + Scrubber
  // TODO when property value is using a known number/amount unit, allow shortcuts to change the step (0.1, 1, 10, 100)
  // TODO (firefox) IF we want to show the property rules stack (like in Computed devtools panel), use firefox styling

  const hasMatches =
    computed.order.size > 0 || inspected.styleEntries.length > 0;
  const hasNoLayers =
    visibleLayers.length === 1 &&
    visibleLayers[0]! === symbols.implicitOuterLayer;

  return (
    <>
      <Collapsible.Root
        open={groupByLayer || groupByMedia}
        className={css({
          position: "sticky",
          backgroundColor: "#282828", // neutral-15
          top: "0",
          transform: "translateY(-3px)",
          marginTop: "-3px",
          overflow: "hidden",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
        })}
      >
        <Toolbar inspected={inspected} refresh={refresh} computed={computed} />
        <Collapsible.Content
          className={css({
            px: "3px",
            display: hasMatches ? "none" : undefined,
          })}
        >
          <styled.div
            mb="6px"
            fontSize="12px"
            color="var(--color-text-secondary, #9aa0a6)"
          >
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
                      store.send({
                        type: "setVisibleLayers",
                        visibleLayers: e.target.checked
                          ? [...visibleLayers, layer]
                          : visibleLayers.filter((l) => l !== layer),
                      })
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
                  store.send({
                    type: "setVisibleLayers",
                    visibleLayers: Array.from(computed.rulesByLayer.keys()),
                  })
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
                  hasNoLayers ? undefined : "group",
                  hstack({
                    gap: "4px",
                    cursor: hasNoLayers ? undefined : "pointer",
                    opacity: hasNoLayers ? "0.5" : undefined,
                  })
                )}
                onClick={() =>
                  store.send({
                    type: "setVisibleLayers",
                    visibleLayers: [symbols.implicitOuterLayer],
                  })
                }
                disabled={hasNoLayers}
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

      <styled.hr opacity="0.2" />
      <Stack
        py="2px"
        fontFamily="sans-serif"
        className={cq({ name: "rules", type: "inline-size" })}
      >
        <Flex
          direction="column"
          textStyle="sm"
          fontFamily="monospace"
          fontSize="11px"
          lineHeight="1.2"
        >
          {/* TODO toggle inline style */}
          <InsertInlineRow
            inspected={inspected}
            refresh={refresh}
            overrides={overrides}
            setOverrides={setOverrides}
          />
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
                              <HighlightMatch highlight={filter}>{`${
                                media === symbols.noMedia ? "" : "@media "
                              }${media} (${rules.length})`}</HighlightMatch>
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

              return (
                <div className="group">
                  {Array.from(computed.order).map((key, index) => (
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
                            [overrideKey]: key,
                            [key]: value != null ? { value, computed } : null,
                          })),
                      }}
                    />
                  ))}
                </div>
              );
            })
            .with(true, () => {
              if (groupByMedia) {
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
                              <HighlightMatch highlight={filter}>{`${
                                layer === symbols.implicitOuterLayer
                                  ? ""
                                  : "@layer "
                              }${layer} (${mediaKeys.length})`}</HighlightMatch>
                            }
                            content={
                              <Stack ml="12px">
                                {mediaKeys.map((media) => {
                                  const mediaRules = mediaMap[media];
                                  return (
                                    <DeclarationGroup
                                      key={media}
                                      label={
                                        <HighlightMatch highlight={filter}>
                                          {`${
                                            media === symbols.noMedia
                                              ? ""
                                              : "@media "
                                          } ${media} (${mediaRules.length})`}
                                        </HighlightMatch>
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
                            <HighlightMatch
                              highlight={filter}
                            >{`${layer === symbols.implicitOuterLayer ? "" : "@layer "}${layer} (${rules.length})`}</HighlightMatch>
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
          {!hasMatches && (
            <Center
              fontStyle="italic"
              fontSize="12px"
              lineHeight="auto"
              fontFamily="system-ui, sans-serif"
              p="4px"
              textAlign="center"
              whiteSpace="nowrap"
              borderBottom="1px solid #474747ff"
              color="var(--sys-color-token-subtle, rgb(143, 143, 143))"
            >
              <span>No matching selector or style</span>
            </Center>
          )}
        </Flex>
      </Stack>
    </>
  );
}

interface ToolbarProps {
  inspected: InspectResult | null;
  refresh: () => Promise<void>;
  computed: ReturnType<typeof computeStyles>;
}

const Toolbar = (props: ToolbarProps) => {
  const { inspected, refresh, computed } = props;
  const filter = useSelector(store, (state) => state.context.filter);
  const showSelector = useSelector(
    store,
    (state) => state.context.showSelector
  );
  const groupByLayer = useSelector(
    store,
    (state) => state.context.groupByLayer
  );
  const groupByMedia = useSelector(
    store,
    (state) => state.context.groupByMedia
  );
  const visibleLayers = useSelector(
    store,
    (state) => state.context.visibleLayers
  );
  const visibleLayersState = useSelector(
    store,
    (state) => state.context.visibleLayers
  );

  return (
    <Flex alignItems="center" position="relative" zIndex="2" px="5px">
      <styled.div position="relative" flex="1">
        <styled.input
          mt="1px"
          placeholder="Filter"
          w="100%"
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
          onChange={(e) =>
            store.send({ type: "setFilter", filter: e.target.value })
          }
        />
        {filter && (
          <span
            className={css({
              w: "16px",
              h: "16px",
              position: "absolute",
              right: "0",
              top: "2px",
              opacity: { base: "0.7", _hover: "1" },
              backgroundColor: "var(--icon-default, rgb(199, 199, 199))",
            })}
            style={{
              mask: `url(${CrossCircleFilled}) center / contain no-repeat`,
            }}
            onClick={() => store.send({ type: "setFilter", filter: "" })}
          />
        )}
      </styled.div>
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
              // api.state
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
      <Tooltip content="Refresh">
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
          onClick={() => refresh()}
        >
          <RefreshCwIcon
            className={css({
              w: "16px",
              h: "16px",
              opacity: { base: 0.8, _groupHover: 1 },
            })}
          />
        </styled.button>
      </Tooltip>
      <Tooltip content="Show selectors">
        <Collapsible.Trigger asChild>
          <styled.button
            aria-selected={showSelector}
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
              store.send({
                type: "setShowSelector",
                showSelector: !showSelector,
              });
            }}
          >
            <BoxSelectIcon
              className={css({
                w: "16px",
                h: "16px",
                opacity: { base: 0.8, _groupHover: 1 },
              })}
            />
          </styled.button>
        </Collapsible.Trigger>
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
                store.send({
                  type: "setVisibleLayers",
                  visibleLayers: Array.from(computed.rulesByLayer.keys()),
                });
              }

              store.send({ type: "setGroupByLayer", groupByLayer: update });
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
            store.send({
              type: "setGroupByMedia",
              groupByMedia: !groupByMedia,
            });
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
  );
};

interface DeclarationGroupProps {
  label: ReactNode;
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
              [overrideKey]: prop,
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
  disabled?: boolean;
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
  const {
    prop,
    index,
    matchValue,
    rule,
    inspected,
    override,
    setOverride,
    disabled,
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
  const filter = useSelector(store, (state) => state.context.filter);
  const showSelector = useSelector(
    store,
    (state) => state.context.showSelector
  );

  return (
    <styled.code
      display="flex"
      alignItems="flex-start"
      mr="2"
      // var(--sys-color-state-hover-on-subtle)
      _hover={{ backgroundColor: "rgba(253, 252, 251, 0.1)" }}
      textDecoration={enabled && !disabled ? "none" : "line-through !important"}
      data-declaration={index}
    >
      <input
        id={id}
        type="checkbox"
        checked={enabled}
        className={css({
          ...checkboxStyles,
          opacity: isTogglable ? "1" : "0!",
          visibility: "hidden",
          _groupHover: {
            visibility: "visible",
            opacity: 1,
          },
        })}
        disabled={!isTogglable}
        onChange={async (e) => {
          if (rule.selector === symbols.inlineStyleSelector) {
            const enabled = e.target.checked;
            const result = await evaluator.api.updateStyleRule({
              selectors: inspected.elementSelectors,
              prop: prop,
              value: matchValue,
              kind: "inlineStyle",
              atIndex: index + 1,
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
        htmlFor={id}
        pl="4px"
        className={css({
          color: "var(--sys-color-token-property-special, rgb(92, 213, 251))",
        })}
        whiteSpace="nowrap"
      >
        <HighlightMatch highlight={filter}>
          {hypenateProperty(prop)}
        </HighlightMatch>
      </styled.label>
      <styled.span mr="6px">:</styled.span>
      {isColor(computedValue) && (
        <styled.div
          alignSelf="center"
          display="inline-block"
          border="1px solid var(--sys-color-neutral-outline, #757575)"
          width="9.6px"
          height="9.6px"
          mx="4px"
          style={{ backgroundColor: computedValue }}
        />
      )}
      <EditableValue
        index={index}
        prop={prop}
        elementSelector={inspected.elementSelectors}
        selector={rule.selector}
        matchValue={matchValue}
        override={override}
        setOverride={setOverride}
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
      {showSelector && (
        <styled.div
          ml="auto"
          gap="2"
          className={css({ display: "none", "@/md": { display: "flex" } })}
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

interface EditableValueProps {
  index: number;
  /**
   * Selectors computed from the inspected element (window.$0 in content script)
   * By traversing the DOM tree until reaching HTML so we can uniquely identify the element
   * This may have multiple selectors when the inspected element is nested in iframe/shadow roots
   */
  elementSelector: string[];
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
  const {
    index,
    elementSelector,
    prop,
    selector,
    matchValue,
    override,
    setOverride,
  } = props;

  const ref = useRef(null as HTMLDivElement | null);
  const [key, setKey] = useState(0);

  const propValue = override?.value || matchValue;
  const updateValue = (update: string) => {
    const kind =
      selector === symbols.inlineStyleSelector ? "inlineStyle" : "cssRule";
    return evaluator.api.updateStyleRule({
      selectors: kind === "inlineStyle" ? elementSelector : [selector],
      prop: hypenateProperty(prop),
      value: update,
      kind,
      atIndex: index + 1,
      isCommented: false,
    });
  };

  const overrideValue = async (update: string) => {
    if (!update || update === propValue) return;

    const { hasUpdated, computedValue } = await updateValue(update);
    if (hasUpdated) {
      setOverride(update, computedValue);
    }
  };

  const revert = async () => {
    const hasUpdated = await updateValue(matchValue);
    if (hasUpdated) {
      setOverride(null, null);
    }
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
      onValueCommit={(update) => {
        overrideValue(update.value);
      }}
    >
      <Editable.Area
        ref={ref}
        // className={css({ display: "flex!", alignItems: "center" })}
      >
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
        <EditablePreview />
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
            onClick={() => {
              revert();
            }}
          />
        </Tooltip>
      )}
    </Editable.Root>
  );
};

const EditablePreview = () => {
  const ctx = useEditableContext();
  const filter = useSelector(store, (state) => state.context.filter);

  return (
    <span {...ctx.previewProps} className={css({ whiteSpace: "normal!" })}>
      <HighlightMatch highlight={filter}>
        {ctx.previewProps.children}
      </HighlightMatch>
      {ctx.isEditing ? null : <span>;</span>}
    </span>
  );
};

const HighlightMatch = ({
  children,
  highlight,
  variant,
  css,
}: {
  children: string;
  highlight: string | null;
  variant?: "initial" | "blue";
  css?: SystemStyleObject;
}) => {
  if (!highlight?.trim()) {
    return <styled.span css={css}>{children}</styled.span>;
  }

  const regex = new RegExp(`(${esc(highlight)})`, "gi");
  const parts = children.split(regex);

  return (
    <span>
      {parts.map((part, index) => {
        let isMatching = regex.test(part);
        if (!isMatching && children.includes("-")) {
          isMatching = regex.test(camelCaseProperty(part));
        }

        return isMatching ? (
          <styled.mark
            color={variant === "blue" ? "currentColor" : undefined}
            backgroundColor={
              variant === "blue"
                ? "var(--sys-color-tonal-container, rgb(0, 74, 119))"
                : undefined
            }
            key={index}
            css={css}
          >
            {part}
          </styled.mark>
        ) : (
          part
        );
      })}
    </span>
  );
};

interface InsertInlineRowProps {
  inspected: InspectResult;
  refresh: () => Promise<void>;
  overrides: OverrideMap | null;
  setOverrides: Dispatch<SetStateAction<OverrideMap | null>>;
}

type EditingState = "idle" | "key" | "value";

const getState = () =>
  (dom.getInlineContainer().dataset.editing || "idle") as EditingState;

const setState = (state: EditingState) => {
  // console.log(
  //   `setState ${dom.getInlineContainer().dataset.editing} => ${state}`
  // );
  if (state === "idle") {
    delete dom.getInlineContainer().dataset.editing;
    return;
  }

  dom.getInlineContainer().dataset.editing = state;
};

const InsertInlineRow = (props: InsertInlineRowProps) => {
  const { inspected, refresh, overrides, setOverrides } = props;

  const startEditing = (e: MouseEvent, from: "first" | "last") => {
    console.log("start-editing", from);
    const state = getState();

    if (state === "key") {
      return cancelEditing("already editing key");
    }

    if (state === "idle") {
      const target = e.target as HTMLElement;
      const declaration = dom.getClosestDeclaration(target);
      if (declaration && target !== declaration) return;

      const index = declaration?.dataset.declaration
        ? parseInt(declaration.dataset.declaration)
        : from === "first"
          ? -1
          : inspected.styleDeclarationEntries.length - 1;

      // Needed so that the element is rendered before we can focus it
      flushSync(() => {
        setClickedRowIndex(index);

        setState("key");
      });
      dom.getEditableKey().focus();
    }
  };

  const cancelEditing = (reason: string) => {
    console.log("cancel-editing", reason);
    dom.getEditableKey().innerText = "";
    dom.getEditableValue().innerText = "";
    delete dom.getInlineContainer().dataset.editing;
    setState("idle");
  };

  const commit = () => {
    const editableValue = dom.getEditableValue();
    const editableKey = dom.getEditableKey();
    console.log("commit", editableValue.innerText);

    const declaration = {
      prop: editableKey.innerText,
      value: editableValue.innerText,
    };

    return evaluator.api
      .appendInlineStyle({
        selectors: inspected.elementSelectors,
        prop: declaration.prop,
        value: declaration.value,
        atIndex: clickedRowIndex === null ? null : clickedRowIndex + 1,
        isCommented: false,
      })
      .then(({ hasUpdated, computedValue }) => {
        if (!hasUpdated) return cancelEditing("no update");

        const { prop, value } = declaration;
        const key = `style:${prop}`;
        setOverrides((overrides) => ({
          ...overrides,
          [overrideKey]: key,
          [key]: value != null ? { value, computed: computedValue } : null,
        }));

        editableValue.innerText = "";
        editableKey.innerText = "";

        setState("key");
        refresh().then(() => {
          setClickedRowIndex((clickedRowIndex ?? -1) + 1);
        });
      });
  };

  // When focusing the host website window, cancel editing
  useEffect(() => {
    return evaluator.onMsg.focus(() => {
      cancelEditing("focusing host website");
    });
  }, []);

  const [clickedRowIndex, setClickedRowIndex] = useState<number | null>(-1);

  // When clicking outside the editable key while editing it, cancel editing
  useEffect(() => {
    return trackInteractOutside(() => dom.getEditableKey(), {
      exclude: (target) => {
        return dom.getInlineContainer().contains(target);
      },
      onInteractOutside: () => {
        const state = dom.getInlineContainer().dataset.editing;
        if (state === "key") {
          cancelEditing("clicking outside key");
        }
      },
    });
  }, [clickedRowIndex]);

  // When clicking outside the editable value while editing it, cancel editing if empty, otherwise commit
  useEffect(() => {
    return trackInteractOutside(() => dom.getEditableValue(), {
      onInteractOutside: (e) => {
        const state = dom.getInlineContainer().dataset.editing;
        if (state === "value") {
          const editable = e.target as HTMLElement;
          if (editable.innerText == null || editable.innerText.trim() === "") {
            cancelEditing("clicking outside value");
            return;
          }

          commit();
        }
      },
    });
  }, [clickedRowIndex]);

  const EditableRow = (
    <Flex
      className="editable-row"
      pl="17.5px"
      pt="1.5px"
      css={{
        "&:hover:not(:focus)": {
          backgroundColor:
            "var(--sys-color-state-hover-on-subtle, rgba(253, 252, 251, 0.1))",
        },
        display: "none",
        ".group[data-editing] &": { display: "inline-block" },
      }}
    >
      <span
        id="editable-key"
        contentEditable="plaintext-only"
        className={css(contentEditableStyles, {
          ".group[data-editing=key] &": {
            boxShadow: "rgba(255, 255, 255, 0.2) 0px 0px 0px 1px",
            backgroundColor:
              "var(--sys-color-cdt-base-container, rgb(40, 40, 40))",
          },
          ".group[data-editing=value] &": {
            color: "var(--sys-color-token-property-special, rgb(92, 213, 251))",
          },
        })}
        ref={(node) => {
          // Auto focus the editable key when the row is clicked
          if (node && getState() === "key") {
            node.focus();
          }
        }}
        onKeyDown={(e) => {
          const state = getState();
          if (state !== "key") return;

          const editable = e.target as HTMLElement;

          if (e.key === "Escape") {
            return cancelEditing("escaping key");
          }

          if (e.key === "Backspace" && !editable.innerText) {
            return cancelEditing("backspace on empty key");
          }

          if (!["Enter", "Tab"].includes(e.key)) return;

          e.preventDefault();

          // Empty string, exit editing
          if (editable.innerText == null || editable.innerText.trim() === "") {
            return cancelEditing("submitting empty key");
          }

          // Otherwise, commit the key & move to value editing
          setState("value");

          const editableValue = dom.getEditableValue();
          console.log("commit-key", editableValue);
          editableValue.focus();
        }}
      />
      <span
        className={css({
          display: "inline-block",
          width: "14px",
          textDecoration: "inherit",
          whiteSpace: "pre",
        })}
      >
        {":"}
      </span>
      <span
        tabIndex={0}
        id="editable-value"
        contentEditable="plaintext-only"
        className={css(contentEditableStyles, {
          ".group[data-editing=value] &": {
            boxShadow: "rgba(255, 255, 255, 0.2) 0px 0px 0px 1px",
            backgroundColor:
              "var(--sys-color-cdt-base-container, rgb(40, 40, 40))",
          },
        })}
        onKeyDown={(e) => {
          const editable = e.target as HTMLElement;

          if (e.key === "Escape") {
            cancelEditing("escaping value");
            return;
          }

          // Return to key editing when backspace is pressed on an empty value
          if (e.key === "Backspace" && !editable.innerText) {
            e.preventDefault();
            setState("key");

            const editableKey = dom.getEditableKey();
            editableKey.focus();

            const element = editableKey;
            const range = document.createRange();
            range.selectNodeContents(element);

            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
            }

            return;
          }

          if (!["Enter", "Tab"].includes(e.key)) return;

          e.preventDefault();

          // Empty string, exit editing
          if (editable.innerText == null || editable.innerText.trim() === "") {
            cancelEditing("submitting empty value");
            return;
          }

          // Otherwise, commit the value & reset the editing state
          commit();
        }}
      />
      <span>;</span>
    </Flex>
  );

  const applied = Object.fromEntries(inspected.styleEntries);

  return (
    <Flex
      direction="column"
      gap="2px"
      px="4px"
      id="inline-styles"
      className="group"
      onClick={(e) => {
        startEditing(e, "first");
      }}
    >
      <Flex alignItems="center" tabIndex={0}>
        <styled.span
          fontWeight="500"
          color="var(--sys-color-state-disabled, rgba(227, 227, 227, 0.38))"
          mr="6px"
        >
          element.style
        </styled.span>
        <styled.span
          fontWeight="600"
          color="var(--sys-color-on-surface, rgb(227, 227, 227))"
        >
          {"{"}
        </styled.span>
      </Flex>
      {clickedRowIndex === -1 ? EditableRow : null}
      {inspected.styleDeclarationEntries.length ? (
        <styled.div>
          {inspected.styleDeclarationEntries.map(
            ([prop, value], index, arr) => {
              const key = `style:${prop}:${value}`;
              const isAppliedLater = arr
                .slice(index + 1)
                .some(([prop2, value2]) => prop2 === prop && value2 === value);

              return (
                <Fragment key={index}>
                  <Declaration
                    {...{
                      key: prop,
                      index,
                      prop: prop,
                      matchValue: value,
                      rule: {
                        type: "style",
                        selector: symbols.inlineStyleSelector,
                        style: { [prop]: value },
                        parentRule: null,
                        source: symbols.inlineStyleSelector,
                      },
                      inspected,
                      disabled: applied[prop] !== value || isAppliedLater,
                      override: overrides?.[key] ?? null,
                      setOverride: (value, computed) =>
                        setOverrides((overrides) => ({
                          ...overrides,
                          [overrideKey]: key,
                          [key]: value != null ? { value, computed } : null,
                        })),
                    }}
                  />
                  {index === clickedRowIndex ? EditableRow : null}
                </Fragment>
              );
            }
          )}
        </styled.div>
      ) : null}
      <styled.span
        fontWeight="600"
        color="var(--sys-color-on-surface, rgb(227, 227, 227))"
        onClick={(e) => {
          e.stopPropagation();
          startEditing(e, "last");
        }}
      >
        {"}"}
      </styled.span>
      <styled.hr my="1" opacity="0.2" />
    </Flex>
  );
};

const dom = {
  getInlineContainer: () =>
    document.getElementById("inline-styles") as HTMLElement,
  getEditableKey: () => document.getElementById("editable-key") as HTMLElement,
  getEditableValue: () =>
    document.getElementById("editable-value") as HTMLElement,
  getClosestDeclaration: (element: HTMLElement) =>
    element.closest("[data-declaration]") as HTMLElement,
};

const contentEditableStyles = css.raw({
  textOverflow: "clip!important",
  opacity: "100%!important",
  margin: "0 -2px -1px",
  padding: "0 2px 1px",
  //
  color: "var(--sys-color-on-surface, #e3e3e3)",
  textDecoration: "inherit",
  whiteSpace: "pre",
  overflowWrap: "break-word",

  _focusVisible: {
    outline: "none",
  },
});
