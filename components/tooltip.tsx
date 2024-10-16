import { Tooltip as ArkTooltip } from "@ark-ui/react/tooltip";

import { Portal } from "@ark-ui/react";
import { ComponentProps, Fragment, PropsWithChildren, ReactNode } from "react";

import { styled } from "#styled-system/jsx";
import { createStyleContext } from "#components/create-style-context.js";
import { sva } from "../styled-system/css";

const styles = sva({
  slots: ["positioner", "content", "trigger", "arrow", "arrowTip"],
  base: {
    positioner: {
      display: "flex",
      borderRadius: "2px",
      color: "devtools.on-surface",
      fontSize: "12px",
      lineHeight: "11px",
      backgroundColor: "var(--arrow-background)",
      userSelect: "text",
      "--arrow-background": "colors.devtools.cdt-base-container",
      "--drop-shadow":
        "0 0 0 1px rgb(255 255 255/20%),0 2px 4px 2px rgb(0 0 0/20%),0 2px 6px 2px rgb(0 0 0/10%)",
      "&:has([data-state=open])": {
        boxShadow: "var(--drop-shadow)",
      },
    },
    content: {
      padding: "11px 7px",
    },
    arrow: {
      "--arrow-size": "8px",
    },
  },
});

const { withProvider, withContext } = createStyleContext(styles);

export const Root = withProvider(ArkTooltip.Root);
export const Content = withContext(styled(ArkTooltip.Content), "content");
export const Positioner = withContext(
  styled(ArkTooltip.Positioner),
  "positioner",
);
export const Trigger = withContext(styled(ArkTooltip.Trigger), "trigger");
export const Arrow = withContext(styled(ArkTooltip.Arrow), "arrow");
export const ArrowTip = withContext(styled(ArkTooltip.ArrowTip), "arrowTip");

interface RootProps extends ComponentProps<typeof Root> {}

export interface TooltipProps extends PropsWithChildren<RootProps> {
  content: ReactNode;
  portalled?: boolean;
  withArrow?: boolean;
}

export const Tooltip = (props: TooltipProps) => {
  const {
    children,
    content,
    portalled = true,
    withArrow = true,
    ...rest
  } = props;
  const Portallish = portalled ? Portal : Fragment;

  return (
    <Root
      openDelay={0}
      closeDelay={0}
      positioning={{ placement: "bottom" }}
      lazyMount
      {...rest}
    >
      <Trigger asChild>{children}</Trigger>
      <Portallish>
        <Positioner>
          <Content
            // animation="unset"
            display="flex"
            flexDirection="column"
            maxW="var(--available-width)"
          >
            {content}
            {withArrow && (
              <Arrow>
                <ArrowTip />
              </Arrow>
            )}
          </Content>
        </Positioner>
      </Portallish>
    </Root>
  );
};
