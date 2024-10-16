import { Portal } from "@ark-ui/react";
import { getPlacement, getPlacementStyles } from "@zag-js/popper";
import React, { useEffect, useRef, useState } from "react";
import { Declaration } from "../../src/declaration";
import { InspectResult, inspectApi } from "../../src/inspect-api";
import { getHighlightsStyles } from "../../src/lib/get-highlights-styles";
import { computeStyles } from "../../src/lib/rules";
import { css, cx } from "../../styled-system/css";
import { ElementDetails, ElementDetailsData } from "./element-details";
import { getInspectedElement } from "./inspected";

export const ElementInspector = ({
  onInspect,
  view = "normal",
}: {
  onInspect: (element: HTMLElement) => void;
  view?: "normal" | "atomic";
}) => {
  const floatingRef = useRef<HTMLDivElement | null>(null);

  const [tooltipInfo, setTooltipInfo] = useState(
    null as { styles: React.CSSProperties; details: ElementDetailsData } | null,
  );
  const [highlightStyles, setHighlightStyles] = useState<React.CSSProperties[]>(
    [],
  );

  const update = (element: HTMLElement) => {
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

    const clean = getPlacement(element, () => floatingRef.current!, {
      sameWidth: false,
      overlap: true,
      onComplete: (data) => {
        const styles = getPlacementStyles(data).floating;
        setTooltipInfo({
          styles: { ...styles, minWidth: undefined },
          details: tooltipData,
        });
      },
    });

    setHighlightStyles(getHighlightsStyles(element) as React.CSSProperties[]);

    clean();

    const inspectResult = inspectApi.inspectElement([], element);
    setInspected(inspectResult ?? null);
  };

  // Inspect clicked element
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();

      const element = event.target as HTMLElement;
      const currentInspectedElement = getInspectedElement();

      if (currentInspectedElement) {
        currentInspectedElement.removeAttribute("data-inspected-element");
      }

      element.dataset.inspectedElement = "";
      onInspect(element);

      return false;
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  // Add highlight styles when hovering over an element
  useEffect(() => {
    const handleMouseOver = (event: MouseEvent) => {
      const element = event.target as HTMLElement;
      update(element);
    };

    // Whenever we move the element that triggered the inspect state,
    // update the tooltip/highlight styles
    document.addEventListener(
      "mousemove",
      (e) => {
        const element = e.target as HTMLElement;
        update(element as HTMLElement);
      },
      { once: true },
    );

    document.addEventListener("mouseover", handleMouseOver);
    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  const [inspected, setInspected] = useState<InspectResult | null>(null);
  const computed = inspected && computeStyles(inspected.rules);

  return (
    <Portal>
      <div
        style={{
          pointerEvents: "none",
          visibility: tooltipInfo ? "visible" : "hidden",
        }}
      >
        {highlightStyles.map((style, index) => (
          <div key={index} style={style}></div>
        ))}
        <div
          ref={floatingRef}
          id="atomic-devtools-inspect-tooltip"
          className={css(
            tooltipStyles,
            view === "normal" && {
              maxWidth: "300px",
            },
            view === "atomic" && {
              color: "devtools.on-surface",
              backgroundColor: "devtools.cdt-base-container",
            },
          )}
          style={tooltipInfo?.styles}
        >
          {view === "normal" && tooltipInfo && (
            <ElementDetails details={tooltipInfo.details} />
          )}
          {view === "atomic" && inspected && computed && (
            <div
              className={cx(
                "group",
                css({
                  px: "2px",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  lineHeight: "1.2",
                }),
              )}
            >
              {Array.from(computed.order).map((key, index) => (
                <Declaration
                  {...{
                    key,
                    index,
                    prop: key,
                    matchValue: computed.styles[key],
                    rule: computed.ruleByProp[key],
                    inspected,
                    override: null,
                    setOverride: () => {},
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};

const tooltipStyles = css.raw({
  display: "flex",
  zIndex: "9999!",
  position: "absolute",
  gap: "2px",
  flexDirection: "column",
  border: "1px solid #aaa",
  borderRadius: "8px",
  maxHeight: "300px",
  padding: "10px",
  color: "#333",
  fontSize: "12px",
  backgroundColor: "#f9f9f9",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  overflow: "hidden",
});
