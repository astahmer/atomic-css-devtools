export const inspectedElementSelector = "[data-inspected-element]";
export const getInspectedElement = () =>
  document.querySelector(inspectedElementSelector) as HTMLElement;

export const listeners = new Map<string, () => void>();
