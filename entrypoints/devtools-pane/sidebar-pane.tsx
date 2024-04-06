import { useState } from "react";
import { css } from "../../styled-system/css";
import { Box, Stack } from "../../styled-system/jsx";
import { evaluator } from "./eval";

window.evaluator = evaluator;

export function SidebarPane() {
  const [result, setResult] = useState(
    null as Awaited<ReturnType<typeof evaluator.inspectElement>> | null
  );
  console.log();

  return (
    <>
      <h1 className={css({ color: "green.300" })}>WXT + React</h1>
      <button
        onClick={async () => {
          // console.log(await browser.devtools.inspectedWindow.eval("1 + 1"));
          window.evaluator = evaluator;
          const result = await evaluator.inspectElement();
          setResult(result);
          console.log(result.matchedRules);
        }}
      >
        run
      </button>
      {result && (
        <Stack>
          <Box textStyle="2xl">
            {"<"}
            {result.displayName}
            {">"} matched {result?.matchedRules?.length} rules
          </Box>
          <Box>
            <code>{result.classes}</code>
          </Box>
          <pre>{JSON.stringify(result?.matchedRules, null, 2)}</pre>
        </Stack>
      )}
    </>
  );
}
