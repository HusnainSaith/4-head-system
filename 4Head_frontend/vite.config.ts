import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const configuredApiBaseUrl = env.VITE_API_BASE_URL?.trim() ?? "";
  let productionApiBaseUrl = configuredApiBaseUrl;
  if (mode === "production" && configuredApiBaseUrl) {
    try {
      const hostname = new URL(configuredApiBaseUrl).hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        productionApiBaseUrl = "";
      }
    } catch {
      // Relative API base URLs are valid and intentionally preserved.
    }
  }

  return {
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(productionApiBaseUrl),
    },
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: [
        ...[
          "components",
          "features",
          "lib",
          "hooks",
          "store",
          "types",
          "routes",
          "assets",
        ].map((directory) => ({
          find: `@/${directory}`,
          replacement: fileURLToPath(
            new URL(`./src/${directory}`, import.meta.url),
          ),
        })),
        {
          find: "@",
          replacement: fileURLToPath(new URL("./src", import.meta.url)),
        },
      ],
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
    },
  };
});
