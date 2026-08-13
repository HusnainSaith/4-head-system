/** App-wide, non-business constants. */
export const APP_NAME = "4Head";

/** Dev pages can never be enabled in a production build. */
export const DEV_PAGES_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_PAGES === "true";
