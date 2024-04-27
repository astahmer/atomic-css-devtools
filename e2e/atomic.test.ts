import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  // Inspect element
  await page.goto("http://localhost:4173/");
  await page
    .getByRole("button", { name: "Select an element to inspect" })
    .click();

  // Toggle CSS declarations
  await page.getByText("Atomic CSS Devtools [data-").click();
  expect(page.getByText("Atomic CSS Devtools [data-")).toHaveCSS(
    "font-size",
    "2.25rem"
  );

  await page.getByText("font-size", { exact: true }).click();
  expect(page.getByText("Atomic CSS Devtools [data-")).not.toHaveCSS(
    "font-size",
    "2.25rem"
  );

  await page.getByText("font-size", { exact: true }).click();
  expect(page.getByText("Atomic CSS Devtools [data-")).toHaveCSS(
    "font-size",
    "2.25rem"
  );

  expect(page.getByText("Atomic CSS Devtools [data-")).toHaveCSS(
    "color",
    "#eab308"
  );
  await page.getByText("color", { exact: true }).click();

  expect(page.getByText("Atomic CSS Devtools [data-")).not.toHaveCSS(
    "color",
    "#eab308"
  );
  await page.getByLabel("color", { exact: true }).click();
  expect(page.getByText("Atomic CSS Devtools [data-")).toHaveCSS(
    "color",
    "#eab308"
  );

  //   Group declarations by layer
  await page.getByLabel("Group elements by @layer").click();

  expect(page.getByText("color", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "▼ @layer utilities (3)" }).click();
  expect(page.getByText("color", { exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: "▶︎ @layer utilities (3)" }).click();
  expect(page.getByText("color", { exact: true })).toBeVisible();

  expect(page.getByText("box-sizing", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "▼ @layer base (4)" }).click();

  expect(page.getByText("box-sizing", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "▶︎ @layer base (4)" }).click();
  expect(page.getByText("box-sizing", { exact: true })).toBeVisible();

  expect(
    page.getByRole("button", { name: "▼ @layer utilities (3)" })
  ).toBeVisible();
  await page.getByLabel("Group elements by @layer").click();

  expect(
    page.getByRole("button", { name: "▼ @layer utilities (3)" })
  ).not.toBeVisible();
  await page.getByLabel("Toggle layer visibility").click();
  expect(
    page.getByRole("button", { name: "▼ @layer utilities (3)" })
  ).toBeVisible();

  await page.getByLabel("utilities(3)").uncheck();
  expect(
    page.getByRole("button", { name: "▼ @layer utilities (3)" })
  ).not.toBeVisible();

  await page.getByLabel("utilities(3)").check();
  expect(
    page.getByRole("button", { name: "▼ @layer utilities (3)" })
  ).toBeVisible();

  expect(
    page.getByRole("button", { name: "▼ @layer reset (6)" })
  ).toBeVisible();
  await page.getByText("reset(6)").click();

  expect(
    page.getByRole("button", { name: "▼ @layer reset (6)" })
  ).not.toBeVisible();
  await page.getByText("reset(6)").click();
  expect(
    page.getByRole("button", { name: "▼ @layer reset (6)" })
  ).toBeVisible();

  //   Inspect another element
  await page
    .getByRole("button", { name: "Select an element to inspect" })
    .click();
  await page
    .getByRole("button", { name: "Select an element to inspect" })
    .click();

  expect(page.getByText("min-width", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "▼ @layer recipes (8)" }).click();

  expect(page.getByText("min-width", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "▶︎ @layer recipes (8)" }).click();

  expect(page.getByText("border-radius", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "▼ @layer recipes._base (24)" })
    .click();

  expect(page.getByText("border-radius", { exact: true })).not.toBeVisible();
  await page
    .getByRole("button", { name: "▶︎ @layer recipes._base (24)" })
    .click();

  expect(
    page.getByRole("button", { name: "▼ @layer recipes._base (24)" })
  ).toBeVisible();
  await page.getByText("recipes._base(24)").click();
  expect(
    page.getByRole("button", { name: "▼ @layer recipes._base (24)" })
  ).not.toBeVisible();
  await page.getByLabel("recipes._base(24)").click();
  expect(
    page.getByRole("button", { name: "▼ @layer recipes._base (24)" })
  ).toBeVisible();

  expect(
    page.getByRole("button", { name: "▼ <no_media> (8)" })
  ).not.toBeVisible();
  await page.getByLabel("Group elements by @media").click();

  expect(page.getByRole("button", { name: "▼ <no_media> (8)" })).toBeVisible();
  await page.getByRole("button", { name: "▶︎ <no_media> (8)" }).click();

  //
  //   await page.getByPlaceholder("Filter").click();
  //   await page.getByPlaceholder("Filter").fill("button");
  //   await page.locator('[id="tooltip\\:\\:r1b9\\:\\:trigger"] > span').click();
  //   await page.getByPlaceholder("Filter").click();
  //   await page.getByPlaceholder("Filter").press("Meta+a");
  //   await page.getByPlaceholder("Filter").fill("gap");
  //   await page.locator(".w_16px").first().click();
  //   await page.getByPlaceholder("Filter").click();
  //   await page.getByPlaceholder("Filter").fill("gap");
  //   await page.getByText("gap").click();
  //   await page.getByText("gap").click();
  //   await page.locator(".w_16px").first().click();
  //   await page.getByPlaceholder("Filter").click();
  //   await page.locator("#inline-styles").getByText("}").click();
  //   await page
  //     .getByRole("button", { name: "Select an element to inspect" })
  //     .click();
  //   await page.getByText("Atomic CSS Devtools [data-").click();
  //   await page.getByText("Atomic CSS Devtools [data-").click();
  //   await page.getByText("element.style{").click();
  //   await page.locator("#editable-key").fill("color");
  //   await page.locator("#editable-key").press("Tab");
  //   await page.locator("#editable-value").fill("red");
  //   await page.locator("#editable-value").press("Tab");
  //   await page.getByText("color:red;").click();
  //   await page.getByText("red").click();
  //   await page.getByText("red").press("ArrowRight");
  //   await page.getByText("red").press("ArrowRight");
  //   await page.getByText("red").press("ArrowRight");
  //   await page.getByText("color:red;").click();
  //   await page
  //     .locator("div")
  //     .filter({ hasText: "Atomic CSS Devtools [data-" })
  //     .nth(3)
  //     .click();
  //   await page.getByText("Atomic CSS Devtools [data-").click();
});
