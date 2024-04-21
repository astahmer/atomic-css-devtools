import { Portal } from "@ark-ui/react";
import { getPlacement, getPlacementStyles } from "@zag-js/popper";
import React, { useEffect, useRef, useState } from "react";
import { css } from "../../styled-system/css";
import { ElementDetails, ElementDetailsData } from "./element-details";
import { getInspectedElement } from "./inspected";

export const ElementInspector = ({
  onInspect,
}: {
  onInspect: (element: HTMLElement) => void;
}) => {
  const floatingRef = useRef<HTMLDivElement | null>(null);

  const [tooltipInfo, setTooltipInfo] = useState(
    null as { styles: React.CSSProperties; details: ElementDetailsData } | null
  );
  const [highlightStyles, setHighlightStyles] = useState<React.CSSProperties[]>(
    []
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

    setHighlightStyles(getHighlights(element));

    clean();
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
      { once: true }
    );

    document.addEventListener("mouseover", handleMouseOver);
    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

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
          className={tooltipStyles}
          style={tooltipInfo?.styles}
        >
          {tooltipInfo && <ElementDetails details={tooltipInfo.details} />}
        </div>
      </div>
    </Portal>
  );
};

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
  zIndex: "9999!",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

const getHighlights = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

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

  return [
    // Margin overlay
    {
      position: "absolute",
      top: rect.top + window.scrollY - margin.top,
      left: rect.left + window.scrollX - margin.left,
      width: rect.width + margin.left + margin.right,
      height: rect.height + margin.top + margin.bottom,
      backgroundColor: "rgba(246, 178, 107, 0.65)", // orange
      zIndex: 9990,
    },
    // Padding overlay
    {
      position: "absolute",
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
      boxShadow: `inset 0px 0px 0px ${padding.top}px rgb(94 151 68 / 65%)`, // green
      zIndex: 9991,
    },
    // Content area indicator
    {
      position: "absolute",
      top: rect.top + window.scrollY + padding.top,
      left: rect.left + window.scrollX + padding.left,
      width: rect.width - padding.left - padding.right,
      height: rect.height - padding.top - padding.bottom,
      backgroundColor: "color-mix(in srgb, rgb(0, 144, 255) 100%, white 100%)",
      zIndex: 9992,
      opacity: 0.62,
      mixBlendMode: "color",
    },
  ] as React.CSSProperties[];
};
