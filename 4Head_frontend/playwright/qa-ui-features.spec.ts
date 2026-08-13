import { test, expect, Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("admin@poultry.local");
  await page.getByLabel(/password/i).fill("Admin@123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/login/);
}

test("purchase UI validates zero/negative values and overpayment", async ({
  page,
}) => {
  await login(page);
  await page.goto("/brokerage/purchases");
  await page.getByRole("button", { name: /Record purchase/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Quantity/).fill("0");
  await dialog.getByLabel(/Rate per kg/).fill("100");
  await dialog.getByRole("button", { name: "Save" }).click();
  const quantityMessage = await dialog
    .getByLabel(/Quantity/)
    .evaluate((input: HTMLInputElement) => input.validationMessage);
  expect(quantityMessage).not.toBe("");
  await dialog.getByLabel(/Quantity/).fill("1");
  await dialog.getByLabel(/Rate per kg/).fill("-1");
  await dialog.getByRole("button", { name: "Save" }).click();
  const rateMessage = await dialog
    .getByLabel(/Rate per kg/)
    .evaluate((input: HTMLInputElement) => input.validationMessage);
  expect(rateMessage).not.toBe("");
  await dialog.getByLabel(/Rate per kg/).fill("100");
  await dialog.getByLabel(/Amount paid/).fill("101");
  await dialog.getByLabel(/Cash drawer/).selectOption({ index: 1 });
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    dialog.getByText("Amount paid cannot exceed the total."),
  ).toBeVisible();
  console.log(
    "UI_VALIDATION\n" +
      JSON.stringify(
        {
          quantityMessage,
          rateMessage,
          overpayment: "Amount paid cannot exceed the total.",
        },
        null,
        2,
      ),
  );
  await page.screenshot({
    path: "../qa-artifacts/04-ui-financial-validation.png",
    fullPage: true,
  });
});

test("normal manual rent remains available through UI", async ({ page }) => {
  const description = `QA normal department rent ${Date.now()}`;
  const traffic: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes(":3000/expenses"))
      traffic.push(`${r.request().method()} ${r.status()} ${r.url()}`);
  });
  await login(page);
  await page.goto("/expenses");
  await page.getByRole("button", { name: "Add Manual Expense" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").nth(0).click();
  const rentOption = page.getByRole("option", { name: /rent/i }).first();
  await expect(rentOption).toBeVisible();
  await rentOption.click();
  await dialog.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: "Brokerage", exact: true }).click();
  await dialog.getByLabel("Amount").fill("400");
  await dialog
    .getByLabel("Description")
    .fill(description);
  await dialog.getByLabel(/Cash drawer/).selectOption({ index: 1 });
  const expenseResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/expenses") &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Save" }).click();
  expect((await expenseResponse).status()).toBe(201);
  await expect(dialog).toBeHidden();
  await expect(page.getByText(description, { exact: true })).toBeVisible();
  await page.screenshot({
    path: "../qa-artifacts/05-normal-rent.png",
    fullPage: true,
  });
  console.log("RENT_NETWORK\n" + traffic.join("\n"));
});

test("committee UI is available and shared allocation route is absent", async ({
  page,
}) => {
  await login(page);
  await page.goto("/committees");
  await expect(
    page.getByRole("heading", { name: /committees/i }),
  ).toBeVisible();

  await page.goto("/expense-allocations");
  await expect(page.getByText("Page not found", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "../qa-artifacts/06-committee-and-allocation-routes.png",
    fullPage: true,
  });
});
