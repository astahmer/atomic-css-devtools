import { Dispatch, SetStateAction } from "react";
import { Declaration } from "./declaration";
import { InspectResult } from "./inspect-api";
import { StyleRuleWithProp } from "./lib/rules";
import { OverrideMap, overrideKey } from "./types";

interface DeclarationListProps {
  rules: StyleRuleWithProp[];
  inspected: InspectResult;
  overrides: OverrideMap | null;
  setOverrides: Dispatch<SetStateAction<OverrideMap | null>>;
}

export const DeclarationList = (props: DeclarationListProps) => {
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
