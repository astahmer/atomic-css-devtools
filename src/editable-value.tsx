import { Tooltip } from "#components/tooltip";
import { css, cx } from "#styled-system/css";
import { styled } from "#styled-system/jsx";
import { Editable, Portal, useEditableContext } from "@ark-ui/react";
import { useSelector } from "@xstate/store/react";
import { TrashIcon, Undo2 } from "lucide-react";
import { useRef, useState } from "react";
import { useDevtoolsContext } from "./devtools-context";
import { HighlightMatch } from "./highlight-match";
import { hypenateProperty } from "./lib/hyphenate-proprety";
import { symbols } from "./lib/symbols";
import { store } from "./store";

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
  const kind =
    selector === symbols.inlineStyleSelector ? "inlineStyle" : "cssRule";

  const updateValue = (update: string) => {
    return contentScript.updateStyleRule({
      selectors: kind === "inlineStyle" ? elementSelector : [selector],
      prop: hypenateProperty(prop),
      value: update,
      kind,
      atIndex: index + 1,
      isCommented: false,
    });
  };

  const removeDeclaration = async () => {
    const { hasUpdated, computedValue } = await contentScript.removeInlineStyle(
      {
        selectors: elementSelector,
        prop,
        atIndex: index,
      },
    );

    if (!hasUpdated) return;
    setOverride(null, computedValue);
    refresh?.();
  };

  const overrideValue = async (update: string) => {
    if (update === "") {
      if (!isRemovable) return;
      return removeDeclaration();
    }
    if (update === propValue) return;

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

  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <Editable.Root
      ref={parentRef}
      className={cx(
        "group",
        css({
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
        }),
      )}
      key={key}
      autoResize
      selectOnFocus
      value={propValue}
      activationMode="focus"
      placeholder={propValue}
      onValueCommit={(update) => {
        overrideValue(update.value);
      }}
    >
      <Editable.Area ref={ref} className={css({ display: "flex" })}>
        <Editable.Input
          className={css({
            margin: "0 -2px -1px!",
            padding: "0 2px 1px!",
            textOverflow: "clip!",
            opacity: "100%!",
            backgroundColor: "devtools.neutral15",
            // boxShadow: "var(--drop-shadow)",
            boxShadow:
              "0 0 0 1px rgb(255 255 255/20%),0 2px 4px 2px rgb(0 0 0/20%),0 2px 6px 2px rgb(0 0 0/10%)!",
            _selection: {
              backgroundColor: "devtools.tonal-container",
            },
          })}
          defaultValue={propValue}
          onBlur={() => setKey((key) => key + 1)}
          aria-label="Property value"
        />
        <EditablePreview parentRef={parentRef} />
      </Editable.Area>
      {isRemovable && (
        <Tooltip
          content={
            <styled.div gap="1" fontSize="10px" lineHeight="1.2">
              <span>Remove</span>
            </styled.div>
          }
        >
          <TrashIcon
            className={css({
              w: "10px",
              h: "10px",
              ml: "4px",
              opacity: { base: 0.5, _hover: 1 },
              cursor: "pointer",
            })}
            onClick={() => {
              return removeDeclaration();
            }}
          />
        </Tooltip>
      )}
      {override !== null && (
        <Tooltip
          content={
            <styled.div gap="1" fontSize="10px" lineHeight="1.2">
              <span>Revert to default</span>
              <span>({matchValue})</span>
            </styled.div>
          }
        >
          <Undo2
            className={css({
              w: "10px",
              h: "10px",
              ml: "4px",
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

const EditablePreview = ({
  parentRef,
}: {
  parentRef: React.RefObject<HTMLSpanElement>;
}) => {
  const ctx = useEditableContext();
  const filter = useSelector(store, (s) => s.context.filter);

  return (
    <span {...ctx.previewProps} className={css({ whiteSpace: "normal!" })}>
      <HighlightMatch highlight={filter}>
        {ctx.previewProps.children}
      </HighlightMatch>
      <Portal container={parentRef}>
        <span className={css({ display: ctx.isEditing ? "contents" : "none" })}>
          ;
        </span>
      </Portal>
      {ctx.isEditing ? null : <span>;</span>}
    </span>
  );
};
