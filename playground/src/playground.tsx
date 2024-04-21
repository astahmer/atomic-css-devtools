import React, { useEffect, useState } from "react";
import {
  DevtoolsContextValue,
  DevtoolsProvider,
  Evaluator,
} from "../../src/devtools-context";
import { ContentScriptApi } from "../../src/devtools-messages";
import { inspectApi } from "../../src/inspect-api";
import { SidebarPane } from "../../src/sidebar-pane";
import { css } from "../../styled-system/css";
import { Box, Flex, HStack, Stack } from "../../styled-system/jsx";
import { button } from "../../styled-system/recipes";
import { Portal } from "@ark-ui/react";

const inspectedElementSelector = "[data-inspected-element]";
const getInspectedElement = () =>
  document.querySelector(inspectedElementSelector) as HTMLElement;

const listeners = new Map<string, () => void>();
const noop = () => {};

const evaluator: Evaluator = {
  fn: (fn, ...args) => {
    return new Promise((resolve, reject) => {
      try {
        const result = fn(...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },
  el: (fn, ...args) => {
    return new Promise((resolve, reject) => {
      try {
        const element = getInspectedElement();
        const result = fn(element, ...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },
  copy: (valueToCopy: string) => {
    navigator.clipboard.writeText(valueToCopy);
  },
  inspect: async () => {
    return inspectApi.inspectElement([inspectedElementSelector]);
  },
  onSelectionChanged: (cb) => {
    console.log("onSelectionChanged");
    const handleSelectionChanged = async () => {
      console.log("handleSelectionChanged");
      const result = await evaluator.inspect();
      cb(result ?? null);
    };
    listeners.set("selectionChanged", handleSelectionChanged);

    return noop;
  },
};

const contentScript: ContentScriptApi = {
  inspectElement: async () => {
    return inspectApi.inspectElement([inspectedElementSelector]);
  },
  appendInlineStyle: () => {
    return noop;
  },
  removeInlineStyle: () => {
    return noop;
  },
  computePropertyValue: () => {
    return noop;
  },
  updateStyleRule: () => {
    return noop;
  },
};

const ctx: DevtoolsContextValue = {
  evaluator,
  onDevtoolEvent: (event, cb) => {
    listeners.set(event, cb);
  },
  contentScript,
  onContentScriptMessage: {
    resize: () => noop,
    focus: () => noop,
  },
};

interface TooltipProps {
  styles: React.CSSProperties;
  details: {
    tagName: string;
    classes: string;
    dimensions: string;
    color?: string;
    font?: string;
    background?: string;
    padding?: string;
    margin?: string;
  };
}
const tooltipStyles = css({
  position: "absolute",
  maxWidth: "300px",
  maxHeight: "300px",
  overflow: "hidden",
  fontSize: "12px",
  color: "#333",
  backgroundColor: "#f9f9f9",
  border: "1px solid #aaa",
  borderRadius: "8px",
  padding: "10px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  zIndex: 10000,
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

const tagStyle = css({
  color: "blue",
  fontWeight: "bold",
});

const classStyle = css({
  color: "green",
  fontSize: "11px",
  fontWeight: "bold",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const itemStyle = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "4",
  padding: "2px 0",
});

const colorPreviewStyle = css({
  width: "16px",
  height: "16px",
  border: "1px solid #ddd",
  display: "inline-block",
  verticalAlign: "middle",
  marginRight: "5px",
});

export const ElementTooltip: React.FC<TooltipProps> = ({ styles, details }) => {
  return (
    <div className={tooltipStyles} style={styles}>
      <div className={itemStyle}>
        <span className={tagStyle}>{details.tagName}</span>
        <span className={classStyle}>
          .
          {details.classes.slice(0, 79) +
            (details.classes.length > 79 ? "..." : "")}
        </span>
      </div>
      <div className={itemStyle}>
        <span>Dimensions</span>
        <strong>{details.dimensions}</strong>
      </div>
      {details.color && (
        <div className={itemStyle}>
          <span>Color</span>
          <div>
            <span
              className={colorPreviewStyle}
              style={{ backgroundColor: details.color }}
            ></span>
            {details.color}
          </div>
        </div>
      )}
      {details.font && (
        <div className={itemStyle}>
          <span>Font</span>
          <span>{details.font}</span>
        </div>
      )}
      {details.background && (
        <div className={itemStyle}>
          <span>Background</span>
          <div>
            <span
              className={colorPreviewStyle}
              style={{ backgroundColor: details.background }}
            ></span>
            {details.background}
          </div>
        </div>
      )}
      {details.padding && (
        <div className={itemStyle}>
          <span>Padding</span>
          <span>{details.padding}</span>
        </div>
      )}
      {details.margin && (
        <div className={itemStyle}>
          <span>Margin</span>
          <span>{details.margin}</span>
        </div>
      )}
    </div>
  );
};

const ElementInspector = () => {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<any>(null);

  // Inspect clicked element
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const element = event.target as HTMLElement;
      const currentInspectedElement = getInspectedElement();
      if (currentInspectedElement === element) return;

      event.preventDefault();
      event.stopPropagation();

      if (currentInspectedElement) {
        currentInspectedElement.removeAttribute("data-inspected-element");
      }

      element.dataset.inspectedElement = "";

      setSelectedElement(element);
      listeners.get("selectionChanged")?.();
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  const [highlightStyles, setHighlightStyles] = useState<React.CSSProperties[]>(
    []
  );

  // Add highlight styles when hovering over an element
  useEffect(() => {
    const handleMouseOver = (event: MouseEvent) => {
      const element = event.target as Element;
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);

      const tooltipData = {
        tagName: element.tagName.toLowerCase(),
        classes: Array.from(element.classList).join("."),
        dimensions: `${Math.round(rect.width)} x ${Math.round(rect.height)}`,
        color: computedStyle.color,
        font: `${computedStyle.fontSize}, ${computedStyle.fontFamily}`,
        background: computedStyle.backgroundColor,
        padding: `${computedStyle.paddingTop} ${computedStyle.paddingRight} ${computedStyle.paddingBottom} ${computedStyle.paddingLeft}`,
        margin: `${computedStyle.marginTop} ${computedStyle.marginRight} ${computedStyle.marginBottom} ${computedStyle.marginLeft}`,
      };

      setTooltipInfo({
        styles: {
          top: rect.top + window.scrollY - 50, // Tooltip above the element
          left: rect.left + window.scrollX,
        },
        details: tooltipData,
      });

      const margin = {
        top: parseInt(computedStyle.marginTop, 10),
        right: parseInt(computedStyle.marginRight, 10),
        bottom: parseInt(computedStyle.marginBottom, 10),
        left: parseInt(computedStyle.marginLeft, 10),
      };
      const padding = {
        top: parseInt(computedStyle.paddingTop, 10),
        right: parseInt(computedStyle.paddingRight, 10),
        bottom: parseInt(computedStyle.paddingBottom, 10),
        left: parseInt(computedStyle.paddingLeft, 10),
      };

      setHighlightStyles([
        // Margin overlay
        {
          position: "absolute",
          top: rect.top + window.scrollY - margin.top,
          left: rect.left + window.scrollX - margin.left,
          width: rect.width + margin.left + margin.right,
          height: rect.height + margin.top + margin.bottom,
          backgroundColor: "rgba(246, 178, 107, 0.55)", // orange
          zIndex: 9997,
        },
        // Padding overlay
        {
          position: "absolute",
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
          boxShadow: `inset 0px 0px 0px ${padding.top}px rgba(147, 196, 125, 0.55)`, // green
          zIndex: 9998,
        },
        // Content area indicator
        {
          position: "absolute",
          top: rect.top + window.scrollY + padding.top,
          left: rect.left + window.scrollX + padding.left,
          width: rect.width - padding.left - padding.right,
          height: rect.height - padding.top - padding.bottom,
          outline: "1px solid rgba(255, 255, 255, 0.75)", // white for content outline
          zIndex: 9999,
        },
      ]);
    };

    document.addEventListener("mouseover", handleMouseOver);
    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return (
    <Portal>
      <div style={{ pointerEvents: "none" }}>
        {highlightStyles.map((style, index) => (
          <div key={index} style={style}></div>
        ))}
        {tooltipInfo && (
          <ElementTooltip
            styles={tooltipInfo.styles}
            details={tooltipInfo.details}
          />
        )}
      </div>
      {selectedElement && (
        <div>
          <h3>
            Selected Element: {selectedElement?.tagName}{" "}
            {selectedElement?.innerHTML.substring(0, 200)}
          </h3>
        </div>
      )}
    </Portal>
  );
};

function Playground() {
  return (
    <Flex direction="column" w="100%" h="100%" p="4">
      <Stack mb="4">
        <ElementInspector />
        <HStack>
          <div className={css({ fontSize: "4xl", color: "yellow.500" })}>
            Atomic CSS Devtools [data-inspected-element]
          </div>
        </HStack>
        <HStack>
          <button
            className={button()}
            onClick={async () => {
              const result = await evaluator.inspect();
              console.log(result);
            }}
          >
            eval.inspect()
          </button>
          <button
            className={button()}
            onClick={async () => {
              const result = await ctx.contentScript.inspectElement({
                selectors: [inspectedElementSelector],
              });
              console.log(result);
            }}
          >
            contentScript.inspectElement()
          </button>
          <button
            className={button()}
            onClick={async () => {
              listeners.get("selectionChanged")?.();
            }}
          >
            trigger selectionChanged
          </button>
        </HStack>
      </Stack>

      <Box border="1px solid" w="100%" h="100%">
        <DevtoolsProvider value={ctx}>
          <SidebarPane />
        </DevtoolsProvider>
      </Box>
    </Flex>
  );
}

export default Playground;
