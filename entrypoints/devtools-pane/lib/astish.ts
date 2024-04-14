const newRule =
  /(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g;
const ruleClean = /\/\*[^]*?\*\/|  +/g;
const ruleNewline = /\n+/g;
const empty = " ";

/**
 * Adapted version of astish
 * https://github.com/chakra-ui/panda/blob/ba9e32fa7d9cfc446960929e28e715aa6e94a091/packages/shared/src/astish.ts
 *
 * Instead of returning an object with only the last declaration for a given property, this returns an array of all declarations for a given property
 * e.g. `color: red; color: blue;` will return `[["color", "red"], ["color", "blue"]]` instead of `{ color: "blue" }`
 */
export const inlineStylesToObject = (val: string): any[] => {
  let results = [];
  val = val.replace(ruleClean, ""); // Clean comments and extra spaces

  let block;
  while ((block = newRule.exec(val))) {
    if (!block[4] && !block[3] && block[1]) {
      let key = block[1].trim();
      let value = block[2].replace(ruleNewline, empty).trim();
      results.push([key, value]);
    }
  }

  return results;
};
