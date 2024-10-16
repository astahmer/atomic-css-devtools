import { expect, test } from "vitest";
import { cssTextToEntries } from "../src/lib/css-text-to-entries";

test("return all declarations", () => {
  expect(cssTextToEntries("color: red; color: blue !important; color: green;"))
    .toMatchInlineSnapshot(`
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
  expect(cssTextToEntries("color: red;color: blue;color: green;"))
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
    cssTextToEntries(" color: green;; color: blue; color: red; color: yellow;"),
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

test("extracts commented declarations", () => {
  expect(
    cssTextToEntries(
      " color: green;; color: blue;/* color: orange; */ color: red; /* color: amber; */color: yellow;/* color: pink; */", //
    ),
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
        "orange",
        true,
      ],
      [
        "color",
        "red",
      ],
      [
        "color",
        "amber",
        true,
      ],
      [
        "color",
        "yellow",
      ],
      [
        "color",
        "pink",
        true,
      ],
    ]
  `);
});
