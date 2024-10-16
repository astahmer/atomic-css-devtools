import { Collapsible } from "@ark-ui/react";
import { useSelector } from "@xstate/store/react";
import {
  BoxSelectIcon,
  BugIcon,
  EyeIcon,
  EyeOffIcon,
  LayersIcon,
  MonitorSmartphone,
  RefreshCwIcon,
  ScanEyeIcon,
  SunIcon,
} from "lucide-react";
import { css } from "#styled-system/css";
import { Flex, styled } from "#styled-system/jsx";
import CrossCircleFilled from "../public/cross-circle-filled.svg";
import { Tooltip } from "#components/tooltip";
import { computeStyles } from "./lib/rules";
import { symbols } from "./lib/symbols";
import { store } from "./store";
import type { InspectResult } from "./inspect-api";

interface ToolbarProps {
  inspected: InspectResult | null;
  refresh: () => Promise<void>;
  computed: ReturnType<typeof computeStyles>;
}

export const Toolbar = (props: ToolbarProps) => {
  const { inspected, refresh, computed } = props;

  const filter = useSelector(store, (s) => s.context.filter);
  const showSelector = useSelector(store, (s) => s.context.showSelector);
  const isExpanded = useSelector(store, (s) => s.context.isExpanded);
  const groupByLayer = useSelector(store, (s) => s.context.groupByLayer);
  const groupByMedia = useSelector(store, (s) => s.context.groupByMedia);
  const hideResetStyles = useSelector(store, (s) => s.context.hideResetStyles);
  const availableLayers = useSelector(store, (s) => s.context.availableLayers);
  const selectedLayers = useSelector(store, (s) => s.context.selectedLayers);

  let isExpandButtonDisabled = false;
  if (
    availableLayers.length === 0 ||
    (availableLayers.length === 1 &&
      availableLayers[0] === symbols.implicitOuterLayer)
  ) {
    isExpandButtonDisabled = true;
  }

  return (
    <Flex zIndex="2" position="relative" alignItems="center" px="5px">
      <styled.div position="relative" flex="1">
        <styled.input
          aria-label="Filter"
          placeholder="Filter"
          value={filter}
          onChange={(e) =>
            store.send({ type: "setFilter", filter: e.target.value })
          }
          border="1px solid {colors.devtools.neutral-outline}"
          borderRadius="4px"
          w="100%"
          h="19px"
          mt="1px"
          padding="4px 3px 3px"
          fontSize="12px"
          backgroundColor="devtools.cdt-base-container"
          overflow="hidden"
          whiteSpace="nowrap"
          css={{
            color: "devtools.on-surface",
            _placeholder: {
              color: "devtools.token-subtle",
              fontSize: "12.5px",
            },
            "&:hover:not(:focus)": {
              backgroundColor: "devtools.state-hover-on-subtle",
            },
            _focusVisible: {
              outline: "1px solid rgb(153, 200, 255)",
              border: "1px solid transparent",
              outlineColor: "rgb(153, 200, 255)",
            },
          }}
        />
        {filter && (
          <span
            className={css({
              position: "absolute",
              top: "2px",
              right: "0",
              w: "16px",
              h: "16px",
              opacity: { base: "0.7", _hover: "1" },
              backgroundColor: "var(--icon-default, rgb(199, 199, 199))",
            })}
            style={{
              mask: `url(${CrossCircleFilled}) center / contain no-repeat`,
            }}
            onClick={() => store.send({ type: "setFilter", filter: "" })}
          />
        )}
      </styled.div>
      {import.meta.env.DEV && (
        <Tooltip withArrow={false} content="Log inspected element">
          <ToolbarButton
            aria-label="Log inspected element"
            onClick={() =>
              console.log(
                inspected,
                {
                  groupByMedia,
                  groupByLayer,
                  availableLayers,
                  selectedLayers,
                  hideResetStyles,
                },
                computed,
                // api.state
              )
            }
          >
            <BugIcon className={toolbarIcon} />
          </ToolbarButton>
        </Tooltip>
      )}
      <Tooltip withArrow={false} content="Refresh">
        <ToolbarButton onClick={() => refresh()} aria-label="Refresh">
          <RefreshCwIcon className={toolbarIcon} />
        </ToolbarButton>
      </Tooltip>
      <Tooltip content="Hide `*, :before, :after` styles">
        <Collapsible.Trigger asChild>
          <ToolbarButton
            aria-label="Hide `*, :before, :after` styles"
            aria-selected={hideResetStyles}
            onClick={() => {
              store.send({
                type: "setHideResetStyles",
                hideResetStyles: !hideResetStyles,
              });
              refresh();
            }}
          >
            {hideResetStyles ? (
              <EyeOffIcon className={toolbarIcon} />
            ) : (
              <EyeIcon className={toolbarIcon} />
            )}
          </ToolbarButton>
        </Collapsible.Trigger>
      </Tooltip>
      <Tooltip
        content={
          "Toggle layer visibility" +
          (isExpandButtonDisabled ? " (no layers)" : "")
        }
      >
        <Collapsible.Trigger asChild>
          <ToolbarButton
            aria-label="Toggle layer visibility"
            aria-selected={isExpanded}
            disabled={isExpandButtonDisabled}
            onClick={() => {
              store.send({
                type: "setIsExpanded",
                isExpanded: !isExpanded,
              });
            }}
          >
            <ScanEyeIcon className={toolbarIcon} />
          </ToolbarButton>
        </Collapsible.Trigger>
      </Tooltip>
      <Tooltip withArrow={false} content="Group elements by @layer">
        <Collapsible.Trigger asChild>
          <ToolbarButton
            aria-label="Group elements by @layer"
            aria-selected={groupByLayer}
            onClick={() => {
              store.send({
                type: "setGroupByLayer",
                groupByLayer: !groupByLayer,
              });
            }}
          >
            <LayersIcon className={toolbarIcon} />
          </ToolbarButton>
        </Collapsible.Trigger>
      </Tooltip>
      <Tooltip withArrow={false} content="Group elements by @media">
        <ToolbarButton
          aria-label="Group elements by @media"
          aria-selected={groupByMedia}
          onClick={() => {
            store.send({
              type: "setGroupByMedia",
              groupByMedia: !groupByMedia,
            });
          }}
        >
          <MonitorSmartphone className={toolbarIcon} />
        </ToolbarButton>
      </Tooltip>
      <Tooltip withArrow={false} content="Show selectors">
        <ToolbarButton
          aria-label="Show selectors"
          aria-selected={showSelector}
          onClick={() => {
            store.send({
              type: "setShowSelector",
              showSelector: !showSelector,
            });
          }}
        >
          <BoxSelectIcon className={toolbarIcon} />
        </ToolbarButton>
      </Tooltip>
      <Tooltip withArrow={false} content="Toggle color mode">
        <ToolbarButton
          aria-label="Toggle color mode"
          aria-selected={showSelector}
          onClick={() => {
            document.body.classList.toggle("-theme-with-dark-background");
          }}
        >
          <SunIcon className={toolbarIcon} />
        </ToolbarButton>
      </Tooltip>
    </Flex>
  );
};

const ToolbarButton = styled(
  "button",
  {
    base: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minWidth: "28px",
      height: "26px",
      ml: "auto",
      px: "4px",
      _disabled: {
        opacity: "0.5",
        cursor: "not-allowed",
      },
      _selected: {
        color: "devtools.primary-bright",
        backgroundColor: "devtools.neutral-container",
      },
      _hover: {
        backgroundColor: "devtools.state-hover-on-subtle",
        "&:not([aria-selected=true])": {
          color: "devtools.on-surface",
        },
      },
    },
  },
  { defaultProps: { className: "group" } },
);

const toolbarIcon = css({
  w: "16px",
  h: "16px",
  opacity: { base: 0.8, _groupHover: 1 },
});
