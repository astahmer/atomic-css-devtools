import { compactCSS } from "../entrypoints/devtools-pane/lib/rules";
import { test, expect } from "vitest";

test("removes longhands when same value as shorthands", () => {
  expect(
    compactCSS({
      padding: "0px",
      paddingTop: "0px",
      paddingRight: "0px",
      paddingBottom: "0px",
      paddingLeft: "0px",
    })
  ).toMatchInlineSnapshot(`
    {
      "omit": [
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
      ],
      "pick": [
        "padding",
      ],
    }
  `);
});

test("removes longhands when same value as shorthands - multiple", () => {
  expect(
    compactCSS({
      padding: "0px",
      paddingTop: "0px",
      paddingRight: "0px",
      paddingBottom: "0px",
      paddingLeft: "0px",
      //
      margin: "0px",
      marginTop: "0px",
      marginRight: "0px",
      marginBottom: "0px",
      marginLeft: "0px",
    })
  ).toMatchInlineSnapshot(`
    {
      "omit": [
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "marginTop",
        "marginRight",
        "marginBottom",
        "marginLeft",
      ],
      "pick": [
        "padding",
        "margin",
      ],
    }
  `);
});

test("removes shorthands when different value in one of the longhands", () => {
  expect(
    compactCSS({
      padding: "0px",
      paddingTop: "1px",
      paddingRight: "0px",
      paddingBottom: "0px",
      paddingLeft: "0px",
      //
      margin: "0px",
      marginTop: "1px",
      marginRight: "0px",
      marginBottom: "0px",
      marginLeft: "0px",
    })
  ).toMatchInlineSnapshot(`
    {
      "omit": [
        "padding",
        "margin",
      ],
      "pick": [
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "marginTop",
        "marginRight",
        "marginBottom",
        "marginLeft",
      ],
    }
  `);
});

test("keeps other keys", () => {
  expect(
    compactCSS({
      display: "flex",
      padding: "0px",
      paddingTop: "0px",
      paddingRight: "0px",
      paddingBottom: "0px",
      paddingLeft: "0px",
      //
      color: "red",
      margin: "0px",
      marginTop: "0px",
      marginRight: "0px",
      marginBottom: "0px",
      marginLeft: "0px",
    })
  ).toMatchInlineSnapshot(`
    {
      "omit": [
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "marginTop",
        "marginRight",
        "marginBottom",
        "marginLeft",
      ],
      "pick": [
        "display",
        "padding",
        "color",
        "margin",
      ],
    }
  `);
});

test("works with partial longhands", () => {
  expect(
    compactCSS({
      display: "flex",
      padding: "0px",
      paddingBottom: "0px",
      paddingLeft: "0px",
    })
  ).toMatchInlineSnapshot(`
    {
      "omit": [
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
      ],
      "pick": [
        "display",
        "padding",
      ],
    }
  `);
});

test("add both longhands and shorthands if not all longhands are in the styles and one differs from the shorthand", () => {
  expect(
    compactCSS({
      overflowX: "hidden",
      overflow: "auto",
    })
  ).toMatchInlineSnapshot(`
    {
      "omit": [],
      "pick": [
        "overflow",
        "overflowX",
      ],
    }
  `);

  expect(
    compactCSS({
      overflow: "auto",
      overflowY: "hidden",
    })
  ).toMatchInlineSnapshot(`
    {
      "omit": [],
      "pick": [
        "overflow",
        "overflowY",
      ],
    }
  `);

  expect(
    compactCSS({
      overflow: "auto",
      overflowY: "auto",
    })
  ).toMatchInlineSnapshot(`
    {
      "omit": [
        "overflowX",
        "overflowY",
      ],
      "pick": [
        "overflow",
      ],
    }
  `);
});

test("works in any order", () => {
  expect(
    compactCSS({
      paddingBottom: "0px",
      overflowX: "hidden",
      display: "flex",
      padding: "0px",
      overflow: "auto",
      paddingLeft: "0px",
    })
  ).toMatchInlineSnapshot(`
    {
      "omit": [
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
      ],
      "pick": [
        "padding",
        "overflow",
        "overflowX",
        "display",
      ],
    }
  `);
});

test("add shorthand if all longhands are in the styles and none differs from the shorthand", () => {
  expect(
    compactCSS({
      paddingLeft: "0px",
      paddingRight: "0px",
      paddingTop: "0px",
      paddingBottom: "0px",
    })
  ).toMatchInlineSnapshot(`
    {
      "omit": [
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
      ],
      "pick": [
        "padding",
      ],
    }
  `);
});
