import { Tooltip as ArkTooltip } from "@ark-ui/react/tooltip";

import { Portal } from "@ark-ui/react";
import { ComponentProps, Fragment, PropsWithChildren, ReactNode } from "react";

import { styled } from "#styled-system/jsx";
import { tooltip } from "#styled-system/recipes";
import { createStyleContext } from "#components/create-style-context.js";

const { withProvider, withContext } = createStyleContext(tooltip);

export const Root = withProvider(ArkTooltip.Root);
export const Content = withContext(styled(ArkTooltip.Content), "content");
export const Positioner = withContext(
  styled(ArkTooltip.Positioner),
  "positioner"
);
export const Trigger = withContext(styled(ArkTooltip.Trigger), "trigger");

interface RootProps extends ComponentProps<typeof Root> {}

export interface TooltipProps extends PropsWithChildren<RootProps> {
  content: ReactNode;
  portalled?: boolean;
}

export const Tooltip = (props: TooltipProps) => {
  const { children, content, portalled = true, ...rest } = props;
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
            maxW="var(--available-width)"
            animation="unset"
            display="flex"
            flexDirection="column"
          >
            {content}
          </Content>
        </Positioner>
      </Portallish>
    </Root>
  );
};
