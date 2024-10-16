// we have to check against the constructor.name because:
// - `{rule}.type` is still available but deprecated
// - `{rule} instanceof CSS{rule}` might not be the same in different JS contexts (e.g. iframe)

const isCSSStyleRule = (rule: CSSRule): rule is CSSStyleRule => {
  return (
    rule.constructor.name === "CSSStyleRule" ||
    rule.type === rule.STYLE_RULE ||
    rule instanceof CSSStyleRule
  );
};

const isCSSMediaRule = (rule: CSSRule): rule is CSSMediaRule => {
  return (
    rule.constructor.name === "CSSMediaRule" ||
    rule.type === rule.MEDIA_RULE ||
    rule instanceof CSSMediaRule
  );
};

const isCSSLayerBlockRule = (rule: CSSRule): rule is CSSLayerBlockRule => {
  return (
    rule.constructor.name === "CSSLayerBlockRule" ||
    (rule.type === 0 &&
      rule.cssText.startsWith("@layer ") &&
      rule.cssText.includes("{")) ||
    rule instanceof CSSLayerBlockRule
  );
};

const isCSSLayerStatementRule = (
  rule: CSSRule,
): rule is CSSLayerStatementRule => {
  return (
    rule.constructor.name === "CSSLayerStatementRule" ||
    (rule.type === 0 &&
      rule.cssText.startsWith("@layer ") &&
      !rule.cssText.includes("{")) ||
    rule instanceof CSSLayerStatementRule
  );
};

const isElement = (obj: any): obj is Element => {
  return (
    obj != null && typeof obj === "object" && obj.nodeType === Node.ELEMENT_NODE
  );
};

const isHTMLIFrameElement = (obj: any): obj is HTMLIFrameElement => {
  return obj.constructor.name === "HTMLIFrameElement";
};

const isDocument = (obj: any): obj is Document => {
  return (
    obj != null &&
    typeof obj === "object" &&
    obj.nodeType === Node.DOCUMENT_NODE
  );
};

const isShadowRoot = (obj: any): obj is ShadowRoot => {
  return obj.constructor.name === "ShadowRoot";
};

const isHTMLStyleElement = (obj: any): obj is HTMLStyleElement => {
  return obj.constructor.name === "HTMLStyleElement";
};

export const asserts = {
  isCSSStyleRule,
  isCSSMediaRule,
  isCSSLayerBlockRule,
  isCSSLayerStatementRule,
  isElement,
  isHTMLIFrameElement,
  isDocument,
  isShadowRoot,
  isHTMLStyleElement,
};
