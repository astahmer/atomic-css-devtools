import { css } from "../../styled-system/css";

export interface ElementDetailsData {
  tagName: string;
  classes: string;
  dimensions: string;
  color?: string;
  font?: string;
  background?: string;
  padding?: string;
  margin?: string;
}

export const ElementDetails = ({
  details,
}: {
  details: ElementDetailsData;
}) => {
  return (
    <>
      <div className={css({ display: "flex", alignItems: "center" })}>
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
    </>
  );
};

const tagStyle = css({
  color: "blue",
  fontWeight: "bold",
});

const classStyle = css({
  color: "green",
  textOverflow: "ellipsis",
  fontSize: "11px",
  fontWeight: "bold",
  overflow: "hidden",
  whiteSpace: "nowrap",
});

const itemStyle = css({
  display: "flex",
  gap: "4",
  justifyContent: "space-between",
  paddingY: "2px",
});

const colorPreviewStyle = css({
  display: "inline-block",
  border: "1px solid #ddd",
  width: "16px",
  height: "16px",
  marginRight: "5px",
  verticalAlign: "middle",
});
