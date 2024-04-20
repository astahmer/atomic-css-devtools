import { Collapsible } from "@ark-ui/react";
import { ReactNode } from "react";
import { css, cx } from "#styled-system/css";
import { styled } from "#styled-system/jsx";
import { flex } from "#styled-system/patterns";

interface DeclarationGroupProps {
  label: ReactNode;
  content: ReactNode;
}

export const DeclarationGroup = (props: DeclarationGroupProps) => {
  const { label, content } = props;

  return (
    <styled.div className="group">
      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger asChild>
          <styled.div
            role="button"
            className={cx(flex(), "group-btn")}
            cursor="pointer"
            w="100%"
            alignItems="center"
            fontSize="11px"
            opacity={{ base: 0.7, _hover: 1 }}
            _hover={{
              backgroundColor: "rgba(253, 252, 251, 0.1)",
            }}
            ml="3px"
            mb="3px"
          >
            <span
              className={css({
                _before: {
                  content: {
                    base: "'▶︎'",
                    // @ts-expect-error
                    ".group-btn[aria-expanded=true] &": "'▼'",
                  },
                },
                w: "12px",
                h: "12px",
                cursor: "pointer",
              })}
            />
            <styled.span
              textDecoration={{
                base: "none",
                // @ts-expect-error
                ".group-btn:hover &": "underline",
              }}
            >
              {label}
            </styled.span>
          </styled.div>
        </Collapsible.Trigger>
        <Collapsible.Content>{content}</Collapsible.Content>
      </Collapsible.Root>
    </styled.div>
  );
};
