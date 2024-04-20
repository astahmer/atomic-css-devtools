const escapeRegex = /\\/g;
export const unescapeString = (str: string) => str.replace(escapeRegex, "");
