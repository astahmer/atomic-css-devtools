export type Override = { value: string; computed: string | null };
export type OverrideMap = Record<string, Override | null>;
export type HistoryState = {
  overrides: OverrideMap | null;
};

export const overrideKey = Symbol("overrideKey");
