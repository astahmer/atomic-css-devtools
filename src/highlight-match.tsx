import { camelCaseProperty, esc } from "@pandacss/shared";
import { styled } from "#styled-system/jsx";
import { SystemStyleObject } from "#styled-system/types";

export const HighlightMatch = ({
  children,
  highlight,
  variant,
  css,
}: {
  children: string;
  highlight: string | null;
  variant?: "initial" | "blue";
  css?: SystemStyleObject;
}) => {
  if (!highlight?.trim()) {
    return <styled.span css={css}>{children}</styled.span>;
  }

  const regex = new RegExp(`(${esc(highlight)})`, "gi");
  const parts = children.split(regex);

  return (
    <span>
      {parts.map((part, index) => {
        let isMatching = regex.test(part);
        if (!isMatching && children.includes("-")) {
          isMatching = regex.test(camelCaseProperty(part));
        }

        return isMatching ? (
          <styled.mark
            color={variant === "blue" ? "currentColor" : undefined}
            backgroundColor={
              variant === "blue"
                ? "var(--sys-color-tonal-container, rgb(0, 74, 119))"
                : undefined
            }
            key={index}
            css={css}
          >
            {part}
          </styled.mark>
        ) : (
          part
        );
      })}
    </span>
  );
};
