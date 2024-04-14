import { expect, test } from "vitest";
import { inspectApi } from "../entrypoints/devtools-pane/inspect-api";

const first = inspectApi.getUpdatedCssText({
  cssText: "",
  prop: "color",
  value: "red",
  atIndex: null,
  isCommented: false,
  mode: "insert",
});

const second = inspectApi.getUpdatedCssText({
  cssText: first,
  prop: "margin",
  value: "10px",
  atIndex: null,
  isCommented: false,
  mode: "insert",
});

test("add inline style declaration", () => {
  expect(first).toMatchInlineSnapshot(`" color: red;"`);
});

test("add multiple inline style declaration", () => {
  expect(second).toMatchInlineSnapshot(`" color: red; margin: 10px;"`);
});

test("insert at index 0", () => {
  expect(
    inspectApi.getUpdatedCssText({
      cssText: second,
      prop: "display",
      value: "flex",
      atIndex: 0,
      isCommented: false,
      mode: "insert",
    })
  ).toMatchInlineSnapshot(`" display: flex; color: red; margin: 10px;"`);
});

test("insert at index 1", () => {
  expect(
    inspectApi.getUpdatedCssText({
      cssText: second,
      prop: "display",
      value: "flex",
      atIndex: 1,
      isCommented: false,
      mode: "insert",
    })
  ).toMatchInlineSnapshot(`" color: red; display: flex; margin: 10px;"`);
});

test("insert at index 2", () => {
  expect(
    inspectApi.getUpdatedCssText({
      cssText: second,
      prop: "display",
      value: "flex",
      atIndex: 2,
      isCommented: false,
      mode: "insert",
    })
  ).toMatchInlineSnapshot(`" color: red; margin: 10px; display: flex;"`);
});

test("insert at index 3", () => {
  expect(
    inspectApi.getUpdatedCssText({
      cssText: second,
      prop: "display",
      value: "flex",
      atIndex: 2,
      isCommented: false,
      mode: "insert",
    })
  ).toMatchInlineSnapshot(`" color: red; margin: 10px; display: flex;"`);
});

test("edit at index 0", () => {
  expect(
    inspectApi.getUpdatedCssText({
      cssText: second,
      prop: "display",
      value: "flex",
      atIndex: 0,
      isCommented: false,
      mode: "edit",
    })
  ).toMatchInlineSnapshot(`" display: flex; margin: 10px;"`);
});

test("edit at index 1", () => {
  expect(
    inspectApi.getUpdatedCssText({
      cssText: second,
      prop: "display",
      value: "flex",
      atIndex: 1,
      isCommented: false,
      mode: "edit",
    })
  ).toMatchInlineSnapshot(`" color: red; display: flex;"`);
});

test("edit at index 2", () => {
  expect(
    inspectApi.getUpdatedCssText({
      cssText: second,
      prop: "display",
      value: "flex",
      atIndex: 2,
      isCommented: false,
      mode: "edit",
    })
  ).toMatchInlineSnapshot(`" color: red; margin: 10px; display: flex;"`);
});

test("edit at index 3", () => {
  expect(
    inspectApi.getUpdatedCssText({
      cssText: second,
      prop: "display",
      value: "flex",
      atIndex: 2,
      isCommented: false,
      mode: "edit",
    })
  ).toMatchInlineSnapshot(`" color: red; margin: 10px; display: flex;"`);
});
