import { Collapsible } from "@ark-ui/react";
import { useSelector } from "@xstate/store/react";
import { useEffect, useRef } from "react";
import { match } from "ts-pattern";
import { css, cx } from "#styled-system/css";
import {
  Box,
  Center,
  Flex,
  HStack,
  Stack,
  Wrap,
  styled,
} from "#styled-system/jsx";
import { cq } from "#styled-system/patterns";
import { Declaration, checkboxStyles } from "./declaration";
import { DeclarationGroup } from "./declaration-group";
import { DeclarationList } from "./declaration-list";
import { HighlightMatch } from "./highlight-match";
import { InsertInlineRow } from "./insert-inline-row";
import { symbols } from "./lib/symbols";
import { useInspectedResult } from "./lib/use-inspect-result";
import { useUndoRedo } from "./lib/use-undo-redo";
import { store } from "./store";
import { Toolbar } from "./toolbar";
import type { HistoryState } from "./devtools-types";

const EmptyState = () => (
  <Center h="100%" px="4">
    <Stack textStyle="2xl" fontFamily="sans-serif">
      Select an element in the element panel
    </Stack>
  </Center>
);

export function SidebarPane() {
  const { inspected, refresh } = useInspectedResult(() => {
    api.reset();
  });

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

  const groupByLayer = useSelector(store, (s) => s.context.groupByLayer);
  const groupByMedia = useSelector(store, (s) => s.context.groupByMedia);
  const selectedLayers = useSelector(store, (s) => s.context.selectedLayers);
  const isExpanded = useSelector(store, (s) => s.context.isExpanded);
  const filter = useSelector(store, (s) => s.context.filter);

  const computed = useSelector(store, (s) => s.context.computed);

  const availableLayers = useSelector(store, (s) => s.context.availableLayers);

  // Keep track of the inspected website location
  const prevLocation = useRef(null as string | null);
  useEffect(() => {
    if (!inspected?.env.location) return;
    prevLocation.current = inspected?.env.location;
  }, [inspected?.env.location]);

  if (!inspected) {
    return <EmptyState />;
  }

  const hasMatches =
    computed.order.size > 0 || inspected.styleEntries.length > 0;

  return (
    <Box
      w="100%"
      h="100%"
      color="devtools.on-surface"
      backgroundColor="devtools.cdt-base-container"
      overflowX="hidden"
      overflowY="auto"
    >
      <Collapsible.Root
        className={css({
          display: "flex",
          zIndex: 1,
          position: "sticky",
          top: "0",
          flexDirection: "column",
          marginTop: "-3px",
          backgroundColor: "devtools.base-container",
          transform: "translateY(-3px)",
          overflow: "hidden",
        })}
        open={isExpanded}
      >
        <Toolbar inspected={inspected} refresh={refresh} computed={computed} />
        <Collapsible.Content
          className={css({
            display: !isExpanded ? "none" : undefined,
            px: "3px",
          })}
        >
          <Wrap gap="2" alignItems="center" mb="2px">
            {availableLayers.map((layer) => {
              if (layer === symbols.implicitOuterLayer) return null;
              return (
                <HStack key={layer} gap="2px" alignItems="center">
                  <input
                    key={layer}
                    type="checkbox"
                    name="layers"
                    id={"layer-" + layer}
                    value={layer}
                    className={css(checkboxStyles)}
                    checked={selectedLayers.includes(layer)}
                    disabled={!availableLayers.length}
                    onChange={(e) =>
                      store.send({
                        type: "setSelectedLayers",
                        selectedLayers: e.target.checked
                          ? Array.from(new Set([...selectedLayers, layer]))
                          : selectedLayers.filter((l) => l !== layer),
                      })
                    }
                  />
                  <label
                    htmlFor={"layer-" + layer}
                    className={css({ fontSize: "12px" })}
                  >
                    {layer}
                    {""}({computed.rulesByLayer.get(layer)?.length})
                  </label>
                </HStack>
              );
            })}
          </Wrap>
        </Collapsible.Content>
      </Collapsible.Root>

      <styled.hr opacity="0.2" />
      <Flex
        className={cq({ name: "rules", type: "inline-size" })}
        textStyle="sm"
        direction="column"
        py="2px"
        fontFamily="monospace"
        fontSize="11px"
        lineHeight="1.2"
      >
        {/* TODO FIXME */}
        {import.meta.env.FIREFOX ? null : (
          <InsertInlineRow
            inspected={inspected}
            refresh={refresh}
            overrides={overrides}
            setOverrides={setOverrides}
          />
        )}
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
                    },
                  )}
                </Stack>
              );
            }

            return (
              <div className={cx("group", css({ px: "2px" }))}>
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
                          [symbols.overrideKey]: key,
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
                    .filter(([layer]) => availableLayers.includes(layer))
                    .map(([layer, mediaMap]) => {
                      const mediaKeys = Array.from(mediaMap.keys());
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
                                const mediaRules = mediaMap.get(media)!;
                                if (!mediaRules.length) return null;

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
                  .filter(([layer]) => selectedLayers.includes(layer))
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
            borderBottom="1px solid #474747ff"
            p="4px"
            color="devtools.token-subtle"
            textAlign="center"
            fontFamily="system-ui, sans-serif"
            fontSize="12px"
            lineHeight="auto"
            fontStyle="italic"
            whiteSpace="nowrap"
          >
            <span>No matching selector or style</span>
          </Center>
        )}
      </Flex>
    </Box>
  );
}
