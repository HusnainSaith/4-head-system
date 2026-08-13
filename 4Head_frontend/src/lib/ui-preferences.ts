import Cookies from "js-cookie";

const SIDEBAR_COLLAPSED_COOKIE = "4head_sidebar_collapsed";
const ONE_YEAR_DAYS = 365;

const preferenceCookieOptions: Cookies.CookieAttributes = {
  path: "/",
  expires: ONE_YEAR_DAYS,
  // Secure cookies cannot be stored by browsers when a production bundle is
  // exercised over local HTTP. Use Secure whenever the actual origin is HTTPS.
  secure:
    typeof window !== "undefined" && window.location.protocol === "https:",
};

/** Defaults to expanded when the preference is absent or invalid. */
export function getSidebarCollapsed(): boolean {
  return Cookies.get(SIDEBAR_COLLAPSED_COOKIE) === "true";
}

export function setSidebarCollapsed(collapsed: boolean): void {
  Cookies.set(
    SIDEBAR_COLLAPSED_COOKIE,
    collapsed ? "true" : "false",
    preferenceCookieOptions,
  );
}
