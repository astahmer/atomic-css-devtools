import { trackInteractOutside } from "@zag-js/interact-outside";
import {
  Dispatch,
  Fragment,
  MouseEvent,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { css } from "#styled-system/css";
import { Flex, styled } from "#styled-system/jsx";
import { InspectResult } from "./inspect-api";
import { symbols } from "./lib/symbols";
import { OverrideMap } from "./devtools-types";
import { Declaration } from "./declaration";
import { useDevtoolsContext } from "./devtools-context";
import { dashCase } from "@pandacss/shared";

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

export const InsertInlineRow = (props: InsertInlineRowProps) => {
  const { inspected, refresh, overrides, setOverrides } = props;
  const { contentScript, onContentScriptMessage } = useDevtoolsContext();

  const startEditing = (e: MouseEvent, from: "first" | "last") => {
    // console.log("start-editing", from);
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
    // console.log("cancel-editing", reason);
    const editableKey = dom.getEditableKey();
    const editableValue = dom.getEditableValue();
    const inlineContainer = dom.getInlineContainer();

    if (editableKey) editableKey.innerText = "";
    if (editableValue) editableValue.innerText = "";
    if (inlineContainer) delete inlineContainer.dataset.editing;

    setState("idle");
  };

  const commit = () => {
    const editableValue = dom.getEditableValue();
    const editableKey = dom.getEditableKey();
    // console.log("commit", editableValue.innerText);

    const declaration = {
      prop: dashCase(editableKey.innerText),
      value: editableValue.innerText,
    };

    return contentScript
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
          [symbols.overrideKey]: key,
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
    return onContentScriptMessage.focus(() => {
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
          // console.log("commit-key", editableValue);
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
                      isRemovable: true,
                      refresh: refresh,
                      override: overrides?.[key] ?? null,
                      setOverride: (value, computed) =>
                        setOverrides((overrides) => ({
                          ...overrides,
                          [symbols.overrideKey]: key,
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
