const newRule =
  /(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g;
const ruleNewline = /\n+/g;
const empty = " ";

// Match both commented and uncommented CSS rules
const allRules =
  /(?:\/\*([^]*?)\*\/)|(?:([\u0080-\uFFFF\w-%@]+)\s*:\s*([^;]*);)/g;

type StyleEntry = [string, string, boolean];

/**
 * Adapted version of astish
 * https://github.com/chakra-ui/panda/blob/ba9e32fa7d9cfc446960929e28e715aa6e94a091/packages/shared/src/astish.ts
 *
 * Instead of returning an object with only the last declaration for a given property, this returns an array of all declarations for a given property
 * e.g. `color: red; color: blue;` will return `[["color", "red"], ["color", "blue"]]` instead of `{ color: "blue" }`
 */
export const inlineStylesToObject = (val: string) => {
  let results = [];
  let cleanedVal = val.replace(/\n+/g, " "); // Normalize newlines to spaces

  let match;
  while ((match = allRules.exec(cleanedVal))) {
    if (match[1]) {
      // This is a comment block, search for rules inside
      const commentContent = match[1];
      let commentMatch;
      while ((commentMatch = newRule.exec(commentContent))) {
        if (commentMatch[1]) {
          let key = commentMatch[1].trim();
          let value = commentMatch[2].replace(ruleNewline, empty).trim();
          results.push([key, value, true]); // isCommented is true
        }
      }
    } else if (match[2]) {
      // This is a normal rule
      let key = match[2].trim();
      let value = match[3].replace(ruleNewline, empty).trim();
      results.push([key, value]); // isCommented is false
    }
  }

  return results as StyleEntry[];
};
