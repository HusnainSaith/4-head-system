import { test, expect, Page, Response } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("qa.accountant@poultry.local");
  await page.getByLabel(/password/i).fill("QaBrowser@123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/login/);
}

test("core operational pages and reports load in real Chrome", async ({
  page,
}) => {
  await login(page);
  const paths = [
    "/brokerage/purchases",
    "/brokerage/sales",
    "/brokerage/stock",
    "/brokerage/reports/profit-loss",
    "/supply/purchases",
    "/supply/sales",
    "/supply/internal-transfers",
    "/supply/stock",
    "/supply/reports/profit-loss",
    "/wastage/purchases",
    "/wastage/sales",
    "/wastage/stock",
    "/wastage/reports/profit-loss",
    "/shop/incoming-transfers",
    "/shop/dressing-batches",
    "/shop/sales",
    "/shop/stock",
    "/shop/reports/profit-loss",
    "/employees",
    "/payroll/runs",
    "/expenses",
    "/reports/consolidated-profit-loss",
    "/reports/partner-profit-share",
  ];
  const evidence: Array<{
    path: string;
    pageNotFound: boolean;
    visibleError: boolean;
    failingResponses: Array<{ url: string; status: number }>;
    text: string;
  }> = [];
  for (const path of paths) {
    const responses: Array<{ url: string; status: number }> = [];
    const listener = (r: Response) => {
      if (r.url().includes(":3000"))
        responses.push({ url: r.url(), status: r.status() });
    };
    page.on("response", listener);
    await page.goto(path);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    const text = (await page.locator("body").innerText()).slice(0, 1000);
    evidence.push({
      path,
      pageNotFound: /page not found/i.test(text),
      visibleError: /could not be loaded|unavailable/i.test(text),
      failingResponses: responses.filter((r) => r.status >= 400),
      text,
    });
    page.off("response", listener);
  }
  await page.goto("/brokerage/reports/profit-loss");
  await page.screenshot({
    path: "../qa-artifacts/07-brokerage-pnl-after-rent.png",
    fullPage: true,
  });
  const brokeragePnl = await page.locator("body").innerText();
  await page.goto("/reports/consolidated-profit-loss");
  await page.screenshot({
    path: "../qa-artifacts/08-consolidated-pnl-after-rent.png",
    fullPage: true,
  });
  const consolidated = await page.locator("body").innerText();
  await page.goto("/reports/partner-profit-share");
  await page.screenshot({
    path: "../qa-artifacts/09-partner-share-after-rent.png",
    fullPage: true,
  });
  const partner = await page.locator("body").innerText();
  console.log("PAGE_SWEEP\n" + JSON.stringify(evidence, null, 2));
  console.log(
    "REPORT_TEXT\n" +
      JSON.stringify({ brokeragePnl, consolidated, partner }, null, 2),
  );
  expect(
    evidence.filter(
      (e) => e.pageNotFound || e.visibleError || e.failingResponses.length,
    ),
  ).toEqual([]);
});
