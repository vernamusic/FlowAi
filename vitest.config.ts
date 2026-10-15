import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  test: {
    environment: "jsdom",

    /**
     * Component tests need a DOM, storage tests need an empty one, and
     * the setup file gives every suite the browser globals the app uses.
     */
    setupFiles: ["./vitest.setup.ts"],

    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],

    exclude: ["node_modules", ".next", "e2e"],

    /**
     * Node execution waits on real timers, so the budget is generous, but
     * a genuine hang still has to fail rather than block forever.
     */
    testTimeout: 15000,

    hookTimeout: 15000,

    restoreMocks: true,

    coverage: {
      include: ["src/lib/**/*.ts", "src/store/**/*.ts"],
      reporter: ["text-summary"],
    },
  },
});