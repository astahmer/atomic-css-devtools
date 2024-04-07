export interface MatchedStyleRule {
  type: "style";
  source: string;
  selector: string;
  parentRule: MatchedMediaRule | MatchedLayerBlockRule | null;
  style: Record<string, string>;
  /**
   * Computed layer name from traversing `parentRule`
   */
  layer?: string;
  /**
   * Computed media query from traversing `parentRule`
   */
  media?: string;
}
export interface MatchedMediaRule {
  type: "media";
  source: string;
  parentRule: MatchedLayerBlockRule | null;
  media: string;
}
export interface MatchedLayerBlockRule {
  type: "layer";
  source: string;
  parentRule: MatchedLayerBlockRule | null;
  layer: string;
}
export type MatchedRule =
  | MatchedStyleRule
  | MatchedMediaRule
  | MatchedLayerBlockRule;
