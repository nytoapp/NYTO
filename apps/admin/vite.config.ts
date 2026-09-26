import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@atlas/contracts": path.join(workspace, "packages/contracts/src/index.ts"),
      "@atlas/config/money": path.join(workspace, "packages/config/src/money.ts"),
    },
  },
  server: { port: 5173 },
});
