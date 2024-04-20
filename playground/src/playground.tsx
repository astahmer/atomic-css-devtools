import { SidebarPane } from "../../src/sidebar-pane";
import {
  DevtoolsContextValue,
  DevtoolsProvider,
  Evaluator,
} from "../../src/devtools-context";
import { inspectApi } from "../../src/inspect-api";
import { css } from "../../styled-system/css";
import { Box, Center, Flex, HStack, Stack } from "../../styled-system/jsx";
import { ContentScriptApi } from "../../src/devtools-messages";
import { button } from "../../styled-system/recipes";

const inspectedElementSelector = "[data-inspected-element]";
const getInspectedElement = () =>
  document.querySelector(inspectedElementSelector) as HTMLElement;

const listeners = new Map<string, () => void>();
const noop = () => {};

const evaluator: Evaluator = {
  fn: (fn, ...args) => {
    return new Promise((resolve, reject) => {
      try {
        const result = fn(...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },
  el: (fn, ...args) => {
    return new Promise((resolve, reject) => {
      try {
        const element = getInspectedElement();
        const result = fn(element, ...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },
  copy: (valueToCopy: string) => {
    navigator.clipboard.writeText(valueToCopy);
  },
  inspect: () => {
    return new Promise((resolve) => {
      const result = inspectApi.inspectElement([inspectedElementSelector]);
      resolve(result);
    });
  },
  onSelectionChanged: (cb) => {
    console.log("onSelectionChanged");
    const handleSelectionChanged = async () => {
      console.log("handleSelectionChanged");
      const result = await evaluator.inspect();
      cb(result ?? null);
    };
    listeners.set("selectionChanged", handleSelectionChanged);

    return noop;
  },
};

const contentScript: ContentScriptApi = {
  inspectElement: () => {
    return new Promise((resolve) => {
      const result = inspectApi.inspectElement([inspectedElementSelector]);
      resolve(result);
    });
  },
  appendInlineStyle: () => {
    return noop;
  },
  removeInlineStyle: () => {
    return noop;
  },
  computePropertyValue: () => {
    return noop;
  },
  updateStyleRule: () => {
    return noop;
  },
};

const ctx: DevtoolsContextValue = {
  evaluator,
  onDevtoolEvent: (event, cb) => {
    listeners.set(event, cb);
  },
  contentScript,
  onContentScriptMessage: {
    resize: () => noop,
    focus: () => noop,
  },
};

function Playground() {
  return (
    <Flex direction="column" w="100%" h="100%" p="4">
      <Stack mb="4">
        <HStack>
          <div
            className={css({ fontSize: "4xl", color: "yellow.500" })}
            data-inspected-element
          >
            Atomic CSS Devtools [data-inspected-element]
          </div>
        </HStack>
        <HStack>
          <button
            className={button()}
            onClick={async () => {
              const result = await evaluator.inspect();
              console.log(result);
            }}
          >
            eval.inspect()
          </button>
          <button
            className={button()}
            onClick={async () => {
              const result = await ctx.contentScript.inspectElement({
                selectors: [inspectedElementSelector],
              });
              console.log(result);
            }}
          >
            contentScript.inspectElement()
          </button>
          <button
            className={button()}
            onClick={async () => {
              listeners.get("selectionChanged")?.();
            }}
          >
            trigger selectionChanged
          </button>
        </HStack>
      </Stack>

      <Box border="1px solid" w="100%" h="100%">
        <DevtoolsProvider value={ctx}>
          <SidebarPane />
        </DevtoolsProvider>
      </Box>
    </Flex>
  );
}

export default Playground;
