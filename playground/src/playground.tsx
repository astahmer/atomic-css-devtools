import { useState } from "react";
import { DevtoolsProvider } from "../../src/devtools-context";
import { SidebarPane } from "../../src/sidebar-pane";
import { css } from "../../styled-system/css";
import { Box, Flex, HStack, Stack } from "../../styled-system/jsx";
import { browserContext } from "./browser-context";
import { ElementInspector } from "./element-inspector";
import { listeners } from "./inspected";

function Playground() {
  const [isInspecting, setIsInspecting] = useState(false);
  const [isAtomic, setAtomic] = useState(false);

  return (
    <DevtoolsProvider value={browserContext}>
      <Flex direction="column" w="100%" h="100%" p="4">
        {isInspecting && (
          <ElementInspector
            onInspect={() => {
              setIsInspecting(false);
              listeners.get("selectionChanged")?.();
            }}
            view={isAtomic ? "atomic" : "normal"}
          />
        )}
        <Stack mb="4">
          <HStack>
            <div
              className={css({
                my: "4",
                p: "4",
                color: "yellow.500",
                fontSize: "4xl",
              })}
            >
              Atomic CSS Devtools
            </div>
            <div
              className={css({
                p: "4",
                color: "white",
                fontSize: "4xl",
                backgroundColor: "purple.400",
                cursor: "pointer",
              })}
              onClick={() => {
                setAtomic(!isAtomic);
              }}
            >
              view: {isAtomic ? "atomic" : "normal"}
            </div>
          </HStack>
          <HStack>
            <button
              className={css({
                p: "4",
                color: "white",
                backgroundColor: "blue.400",
                cursor: "pointer",
                _hover: {
                  backgroundColor: "blue.500",
                },
              })}
              onClick={() => {
                setIsInspecting(true);
              }}
            >
              Select an element to inspect it
            </button>
          </HStack>
        </Stack>

        <Box w="100%">
          <SidebarPane />
        </Box>
      </Flex>
    </DevtoolsProvider>
  );
}

export default Playground;
