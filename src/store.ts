import { createStore } from "@xstate/store";
import { InspectResult } from "./inspect-api";
import { computeStyles, filterMatchedRulesByEnv } from "./lib/rules";
import type { MatchedRule } from "./devtools-types";

export const store = createStore(
  {
    // Filters
    filter: "",
    showSelector: true,
    groupByLayer: false,
    groupByMedia: false,
    //
    isExpanded: false,
    selectedLayers: [] as string[],
    availableLayers: [] as string[],
    // Inspected element
    inspected: null as InspectResult | null,
    env: null as InspectResult["env"] | null,
    rules: [] as MatchedRule[],
    computed: computeStyles([], { filter: "" }),
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
    setSelectedLayers: {
      selectedLayers: (_ctx, event: { selectedLayers: string[] }) =>
        event.selectedLayers,
    },
    setIsExpanded: (ctx, event: { isExpanded: boolean }) => {
      return {
        ...ctx,
        isExpanded: event.isExpanded,
        groupByLayer: event.isExpanded ? true : ctx.groupByLayer,
      };
    },
    setInspected: (ctx, event: { inspected: InspectResult | null }) => {
      if (!event.inspected) return { ...ctx, inspected: event.inspected };

      const rules = filterMatchedRulesByEnv(event.inspected.rules, {
        ...event.inspected.env,
        ...ctx.env,
      });

      const computed = computeStyles(rules, { filter: ctx.filter });
      const availableLayers = Array.from(computed.rulesByLayer.keys());
      const sortedAvailableLayers = ctx.inspected?.layersOrder.length
        ? sortArrayByOrder(availableLayers, ctx.inspected?.layersOrder)
        : availableLayers;

      // Whenever the available layers changes, we reset the selected layers to the available layers
      // (layersOrder is gathered from all stylesheets, whereas `availableLayers` is the layers that are actually applied to the element)
      const diff = diffLayers(
        ctx.inspected?.layersOrder ?? [],
        event.inspected.layersOrder
      );

      return {
        ...ctx,
        inspected: event.inspected,
        rules,
        computed,
        //
        availableLayers: sortedAvailableLayers,
        selectedLayers: diff.isSame ? ctx.selectedLayers : availableLayers,
      };
    },
    setEnv: (ctx, event: { env: InspectResult["env"] | null }) => {
      if (!ctx.inspected) return { ...ctx, env: event.env };

      const env = {
        ...ctx.inspected.env,
        ...event.env,
      };
      const rules = filterMatchedRulesByEnv(ctx.inspected?.rules ?? [], env);
      return {
        ...ctx,
        env: event.env,
        rules,
        computed: computeStyles(rules, { filter: ctx.filter }),
      };
    },
  }
);

const diffLayers = (prevLayers: string[], nextLayers: string[]) => {
  const added = nextLayers.filter((layer) => !prevLayers.includes(layer));
  const removed = prevLayers.filter((layer) => !nextLayers.includes(layer));
  const isSame = added.length === 0 && removed.length === 0;
  return { added, removed, isSame };
};

const sortArrayByOrder = (arr: string[], order: string[]) => {
  return arr.sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return 1;

    return aIndex - bIndex;
  });
};
