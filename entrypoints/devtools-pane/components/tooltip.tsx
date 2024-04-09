import * as TooltipPrimitive from "#components/tooltip";
import { Portal } from "@ark-ui/react";
import { Fragment, PropsWithChildren, ReactNode } from "react";

export interface TooltipProps
  extends PropsWithChildren<TooltipPrimitive.RootProps> {
  content: ReactNode;
  portalled?: boolean;
}

export const Tooltip = (props: TooltipProps) => {
  const { children, content, portalled = true, ...rest } = props;
  const Portallish = portalled ? Portal : Fragment;

  return (
    <TooltipPrimitive.Root
      openDelay={0}
      closeDelay={0}
      positioning={{ placement: "bottom" }}
      lazyMount
      {...rest}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <Portallish>
        <TooltipPrimitive.Positioner>
          <TooltipPrimitive.Content
            maxW="var(--available-width)"
            animation="unset"
            display="flex"
            flexDirection="column"
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Positioner>
      </Portallish>
    </TooltipPrimitive.Root>
  );
};
