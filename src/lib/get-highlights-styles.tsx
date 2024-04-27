export const getHighlightsStyles = (element: HTMLElement) => {
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
      top: rect.top + window.scrollY - margin.top + "px",
      left: rect.left + window.scrollX - margin.left + "px",
      width: rect.width + margin.left + margin.right + "px",
      height: rect.height + margin.top + margin.bottom + "px",
      backgroundColor: "rgba(246, 178, 107, 0.65)", // orange
      zIndex: "9990",
    },
    // Padding overlay
    {
      position: "absolute",
      top: rect.top + window.scrollY + "px",
      left: rect.left + window.scrollX + "px",
      width: rect.width + "px",
      height: rect.height + "px",
      boxShadow: `inset 0px 0px 0px ${padding.top}px rgb(94 151 68 / 65%)`, // green
      zIndex: "9991",
    },
    // Content area indicator
    {
      position: "absolute",
      top: rect.top + window.scrollY + padding.top + "px",
      left: rect.left + window.scrollX + padding.left + "px",
      width: rect.width - padding.left - padding.right + "px",
      height: rect.height - padding.top - padding.bottom + "px",
      // backgroundColor: "color-mix(in srgb, rgb(0, 144, 255) 100%, white 100%)",
      backgroundColor: "rgb(72 175 255)",
      zIndex: "9992",
      opacity: "0.62",
      mixBlendMode: "color",
    },
  ] as Array<Partial<HTMLElement["style"]>>;
};
