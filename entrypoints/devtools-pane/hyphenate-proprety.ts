const wordRegex = /([A-Z])/g;
const msRegex = /^ms-/;

export const hypenateProperty = (property: string) => {
  if (property.startsWith("--")) return property;
  return property
    .replace(wordRegex, "-$1")
    .replace(msRegex, "-ms-")
    .toLowerCase();
};
