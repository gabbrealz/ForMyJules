import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite"

const fromSrc = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Explicit mirror of tsconfig.app.json "paths". Not using
    // resolve.tsconfigPaths because the root tsconfig is solution-style.
    alias: {
      "@app": fromSrc("app"),
      "@shared": fromSrc("shared"),
      "@features": fromSrc("features"),
    },
  },
})
