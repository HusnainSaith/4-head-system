import { test, expect, Page } from "@playwright/test";

const password = "QaBrowser@123";
type ApiResult = { status: number; body: unknown };
type ApiRow = Record<string, unknown>;

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.getByLabel(/email/i).fill(email);
  await page
    .getByLabel(/password/i)
    .fill(email.startsWith("admin@") ? "Admin@123" : password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/login/);
}

async function api(
  page: Page,
  path: string,
  init?: RequestInit,
): Promise<ApiResult> {
  return page.evaluate(
    async ({ path, init }) => {
      const csrf = document.cookie
        .split("; ")
        .find((item) => item.startsWith("4head_csrf_token="))
        ?.split("=")
        .slice(1)
        .join("=");
      const response = await fetch(`http://localhost:3000${path}`, {
        credentials: "include",
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": decodeURIComponent(csrf) } : {}),
          ...(init?.headers || {}),
        },
      });
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = await response.text();
      }
      return { status: response.status, body };
    },
    { path, init },
  );
}

function record(value: unknown): ApiRow | undefined {
  return typeof value === "object" && value !== null
    ? (value as ApiRow)
    : undefined;
}

function rows(body: unknown): ApiRow[] {
  if (Array.isArray(body))
    return body.filter((item): item is ApiRow => Boolean(record(item)));
  const data = record(body)?.data;
  if (Array.isArray(data))
    return data.filter((item): item is ApiRow => Boolean(record(item)));
  const nested = record(data)?.data;
  if (Array.isArray(nested))
    return nested.filter((item): item is ApiRow => Boolean(record(item)));
  return [];
}

function message(body: unknown): unknown {
  return record(body)?.message;
}

test("bidirectional department scope and unrestricted management roles", async ({
  page,
}) => {
  await login(page, "admin@poultry.local");
  const departments = rows((await api(page, "/departments")).body);
  const brokerage = departments.find((d) => /brokerage/i.test(String(d.name)));
  const supply = departments.find((d) => /^supply$/i.test(String(d.name)));
  expect(brokerage).toBeTruthy();
  expect(supply).toBeTruthy();
  if (typeof brokerage?.id !== "string" || typeof supply?.id !== "string")
    throw new Error("Required departments are missing");

  const endpointDefs = [
    {
      name: "expense",
      list: (id: string) => `/expenses?departmentId=${id}`,
      direct: (id: string) => `/expenses/${id}`,
    },
    {
      name: "vehicle",
      list: (id: string) => `/api/v1/vehicles?departmentId=${id}`,
      direct: (id: string) => `/api/v1/vehicles/${id}`,
    },
    {
      name: "party",
      list: (id: string) => `/parties?departmentId=${id}`,
      direct: (id: string) => `/parties/${id}`,
    },
    {
      name: "employee",
      list: (id: string) => `/employees?departmentId=${id}`,
      direct: (id: string) => `/employees/${id}`,
    },
  ];
  const ids: Record<string, Record<string, string | undefined>> = {
    brokerage: {},
    supply: {},
  };
  for (const def of endpointDefs) {
    const brokerageId = rows((await api(page, def.list(brokerage.id))).body)[0]
      ?.id;
    const supplyId = rows((await api(page, def.list(supply.id))).body)[0]?.id;
    ids.brokerage[def.name] =
      typeof brokerageId === "string" ? brokerageId : undefined;
    ids.supply[def.name] = typeof supplyId === "string" ? supplyId : undefined;
  }

  const evidence: ApiRow[] = [];
  for (const direction of [
    {
      email: "qa.brokerage@poultry.local",
      own: "brokerage",
      target: "supply",
      ownName: "Brokerage",
      hidden: "Supply",
    },
    {
      email: "qa.supply@poultry.local",
      own: "supply",
      target: "brokerage",
      ownName: "Supply",
      hidden: "Brokerage",
    },
  ]) {
    await login(page, direction.email);
    const visible = await page.locator("body").innerText();
    evidence.push({
      check: `${direction.own} navigation`,
      hasOwn: visible.includes(direction.ownName),
      hasOther: visible.includes(direction.hidden),
    });
    await page.screenshot({
      path: `../qa-artifacts/03-${direction.own}-staff-navigation.png`,
      fullPage: true,
    });
    for (const def of endpointDefs) {
      const id = ids[direction.target][def.name];
      if (!id) {
        evidence.push({
          check: `${direction.own}->${direction.target} ${def.name}`,
          status: "NO TARGET ROW",
        });
        continue;
      }
      const result = await api(page, def.direct(id));
      evidence.push({
        check: `${direction.own}->${direction.target} ${def.name}`,
        id,
        status: result.status,
        message: message(result.body),
      });
      expect(result.status).toBe(403);
    }
    const spoof = await api(page, "/expenses", {
      method: "POST",
      body: JSON.stringify({
        departmentId: direction.target === "supply" ? supply.id : brokerage.id,
        categoryId: "11111111-1111-4111-8111-111111111111",
        amount: 10,
        date: "2026-08-02",
        description: "QA spoof must not persist",
      }),
    });
    evidence.push({
      check: `${direction.own}->${direction.target} spoofed expense`,
      status: spoof.status,
      message: message(spoof.body),
    });
    expect(spoof.status).toBe(403);
  }

  for (const email of ["admin@poultry.local", "qa.accountant@poultry.local"]) {
    await login(page, email);
    for (const target of ["brokerage", "supply"]) {
      const partyId = ids[target].party;
      if (partyId) {
        const result = await api(page, `/parties/${partyId}`);
        evidence.push({
          check: `${email} cross-department ${target} party`,
          status: result.status,
        });
        expect(result.status).toBe(200);
      }
    }
  }
  await page.screenshot({
    path: "../qa-artifacts/03-scope-accountant.png",
    fullPage: true,
  });
  console.log(
    "SCOPE_EVIDENCE\n" +
      JSON.stringify(
        {
          departments: { brokerage: brokerage.id, supply: supply.id },
          ids,
          evidence,
        },
        null,
        2,
      ),
  );
});
