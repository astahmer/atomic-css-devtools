import {
  longhands,
  shorthandForLonghand,
  shorthandProperties,
} from "./shorthands";

/**
 * Only keep relevant properties, filtering longhands/shorthands when possible
 */
export function compactCSS(styles: Record<string, any>) {
  const picked = new Set<string>();
  const omit = new Set<string>();

  const props = Object.keys(styles);
  const visited = new Set<string>();

  props.forEach((prop) => {
    let shorthand = Boolean(
      shorthandProperties[prop as keyof typeof shorthandProperties],
    )
      ? prop
      : undefined;

    if (!shorthand) {
      const isLongHand = longhands.includes(prop);
      if (!isLongHand) {
        // anything that is not a shorthand or a longhand
        // e.g `color` or `display`
        picked.add(prop);
        return;
      }

      shorthand =
        shorthandForLonghand[prop as keyof typeof shorthandProperties];

      if (visited.has(shorthand)) {
        return;
      }
    }

    if (!shorthand) {
      // anything that is not a shorthand or a longhand
      // e.g `color` or `display`
      picked.add(prop);
      return;
    }

    visited.add(shorthand);

    const longhandsForShorthand =
      shorthandProperties[shorthand as keyof typeof shorthandProperties];
    const longhandsInProps = longhandsForShorthand.filter(
      (longhand) => styles[longhand],
    );

    const shorthandValue = styles[shorthand!];
    const firstLonghandValue = styles[longhandsInProps[0]];
    const allEqual = longhandsInProps.every(
      (longhand) => styles[longhand] === shorthandValue,
    );

    if (longhandsForShorthand.length !== longhandsInProps.length && !allEqual) {
      // At least one longhand differs but not all longhands are in the styles
      // so we need to keep both
      // e.g `padding: "1px"; `paddingTop: "2px"
      //      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      picked.add(shorthand);
      longhandsInProps.forEach((longhand) => picked.add(longhand));
    } else if (allEqual) {
      // All longhand values are equal to the shorthand, so remove longhands
      // e.g `padding: "1px"; paddingTop: "1px"; paddingBottom: "1px"; paddingLeft: "1px"; paddingRight: "1px"`
      //      ^^^^^^^^^^^^^^
      picked.add(shorthand);
      longhandsForShorthand.forEach((longhand) => omit.add(longhand));
    } else if (
      !shorthandValue &&
      longhandsForShorthand.length === longhandsInProps.length &&
      longhandsInProps.every(
        (longhand) => styles[longhand] === firstLonghandValue,
      )
    ) {
      // All longhand values are equal, but the shorthand is missing
      // so we can safely remove longhands & add the shorthand to the styles object
      // e.g `paddingTop: "1px"; paddingBottom: "1px"; paddingLeft: "1px"; paddingRight: "1px"`
      picked.add(shorthand);
      longhandsForShorthand.forEach((longhand) => omit.add(longhand));
      styles[shorthand!] = firstLonghandValue;
    } else {
      // At least one longhand differs, so remove the shorthand
      // e.g `padding: "1px"; paddingTop: "2px"; paddingBottom: "1px"; paddingLeft: "1px"; paddingRight: "1px"`
      //                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      longhandsForShorthand.forEach((longhand) => picked.add(longhand));
      omit.add(shorthand);
    }
  });

  return { pick: Array.from(picked), omit: Array.from(omit) };
}
