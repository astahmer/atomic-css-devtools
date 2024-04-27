import { Editable, useEditableContext } from "@ark-ui/react";
import { useSelector } from "@xstate/store/react";
import { TrashIcon, Undo2 } from "lucide-react";
import { useRef, useState } from "react";
import { css } from "#styled-system/css";
import { styled } from "#styled-system/jsx";
import { Tooltip } from "#components/tooltip";
import { HighlightMatch } from "./highlight-match";
import { hypenateProperty } from "./lib/hyphenate-proprety";
import { symbols } from "./lib/symbols";
import { store } from "./store";
import { useDevtoolsContext } from "./devtools-context";

export interface EditableValueProps {
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
  isRemovable?: boolean;
  refresh?: () => Promise<void>;
}

export const EditableValue = (props: EditableValueProps) => {
  const {
    index,
    elementSelector,
    prop,
    selector,
    matchValue,
    override,
    setOverride,
    isRemovable,
    refresh,
  } = props;

  const { contentScript } = useDevtoolsContext();

  const ref = useRef(null as HTMLDivElement | null);
  const [key, setKey] = useState(0);

  const propValue = override?.value || matchValue;
  const updateValue = (update: string) => {
    const kind =
      selector === symbols.inlineStyleSelector ? "inlineStyle" : "cssRule";
    return contentScript.updateStyleRule({
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
          aria-label="Property value"
        />
        <EditablePreview />
      </Editable.Area>
      {isRemovable && (
        <Tooltip
          content={
            <styled.div fontSize="10px" lineHeight="1.2" gap="1">
              <span>Remove</span>
            </styled.div>
          }
        >
          <TrashIcon
            className={css({
              ml: "4px",
              w: "10px",
              h: "10px",
              opacity: { base: 0.5, _hover: 1 },
              cursor: "pointer",
            })}
            onClick={() => {
              const snapshot = store.getSnapshot();
              const inspected = snapshot.context.inspected;
              if (!inspected) return;

              return contentScript
                .removeInlineStyle({
                  selectors: inspected.elementSelectors,
                  prop,
                  atIndex: index,
                })
                .then(({ hasUpdated, computedValue }) => {
                  if (!hasUpdated) return;
                  setOverride(null, computedValue);
                  refresh?.();
                });
            }}
          />
        </Tooltip>
      )}
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
  const filter = useSelector(store, (s) => s.context.filter);

  return (
    <span {...ctx.previewProps} className={css({ whiteSpace: "normal!" })}>
      <HighlightMatch highlight={filter}>
        {ctx.previewProps.children}
      </HighlightMatch>
      {ctx.isEditing ? null : <span>;</span>}
    </span>
  );
};
