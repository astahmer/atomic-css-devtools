import { Collapsible } from "@ark-ui/react";
import { useSelector } from "@xstate/store/react";
import {
  BoxSelectIcon,
  BugIcon,
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
    <Flex alignItems="center" position="relative" zIndex="2" px="5px">
      <styled.div position="relative" flex="1">
        <styled.input
          aria-label="Filter"
          placeholder="Filter"
          mt="1px"
          w="100%"
          overflow="hidden"
          whiteSpace="nowrap"
          backgroundColor="devtools.cdt-base-container"
          border="1px solid {colors.devtools.neutral-outline}"
          h="19px"
          padding="4px 3px 3px"
          borderRadius="4px"
          fontSize="12px"
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
          value={filter}
          onChange={(e) =>
            store.send({ type: "setFilter", filter: e.target.value })
          }
        />
        {filter && (
          <span
            className={css({
              w: "16px",
              h: "16px",
              position: "absolute",
              right: "0",
              top: "2px",
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
        <Tooltip content="Log inspected element" withArrow={false}>
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
                },
                computed
                // api.state
              )
            }
          >
            <BugIcon className={toolbarIcon} />
          </ToolbarButton>
        </Tooltip>
      )}
      <Tooltip content="Refresh" withArrow={false}>
        <ToolbarButton onClick={() => refresh()} aria-label="Refresh">
          <RefreshCwIcon className={toolbarIcon} />
        </ToolbarButton>
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
      <Tooltip content="Group elements by @layer" withArrow={false}>
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
      <Tooltip content="Group elements by @media" withArrow={false}>
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
      <Tooltip content="Show selectors" withArrow={false}>
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
      <Tooltip content="Toggle color mode" withArrow={false}>
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
      ml: "auto",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      px: "4px",
      height: "26px",
      minWidth: "28px",
      _hover: {
        backgroundColor: "devtools.state-hover-on-subtle",
        "&:not([aria-selected=true])": {
          color: "devtools.on-surface",
        },
      },
      _selected: {
        backgroundColor: "devtools.neutral-container",
        color: "devtools.primary-bright",
      },
      _disabled: {
        opacity: "0.5",
        cursor: "not-allowed",
      },
    },
  },
  { defaultProps: { className: "group" } }
);

const toolbarIcon = css({
  w: "16px",
  h: "16px",
  opacity: { base: 0.8, _groupHover: 1 },
});
