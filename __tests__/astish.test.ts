import { expect, test } from "vitest";
import { inlineStylesToObject } from "../entrypoints/devtools-pane/lib/astish";

test("return all declarations", () => {
  expect(
    inlineStylesToObject("color: red; color: blue !important; color: green;")
  ).toMatchInlineSnapshot(`
    [
      [
        "color",
        "red",
      ],
      [
        "color",
        "blue !important",
      ],
      [
        "color",
        "green",
      ],
    ]
  `);
});

test("works without space", () => {
  expect(inlineStylesToObject("color: red;color: blue;color: green;"))
    .toMatchInlineSnapshot(`
      [
        [
          "color",
          "red",
        ],
        [
          "color",
          "blue",
        ],
        [
          "color",
          "green",
        ],
      ]
    `);
});

test("works with multiple comma", () => {
  expect(
    inlineStylesToObject(
      " color: green;; color: blue; color: red; color: yellow;"
    )
  ).toMatchInlineSnapshot(`
    [
      [
        "color",
        "green",
      ],
      [
        "color",
        "blue",
      ],
      [
        "color",
        "red",
      ],
      [
        "color",
        "yellow",
      ],
    ]
  `);
});
