import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type ServerOptions } from "vite"
import basicSsl from "@vitejs/plugin-basic-ssl"
import tailwindcss from "@tailwindcss/vite"

const root = fileURLToPath(new URL(".", import.meta.url))
const fromSrc = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

// Where the Node API runs while developing (see server/src/config.ts, PORT).
const API_TARGET = "http://localhost:3000"

/**
 * Only for `vite` (dev) and `vite preview`, never `vite build`: nothing in here ends up in the
 * production bundle.
 */
const localServer: ServerOptions = {
  host: true,
  proxy: {
    "/api": {
      target: API_TARGET,
      changeOrigin: true,
      // Tells the API the request was HTTPS, so it sets the `secure` session cookie.
      xfwd: true,
    },
    "/ws": {
      target: API_TARGET,
      ws: true,
      changeOrigin: true,
      xfwd: true,
    },
  },
}

/**
 * In production the site (Vercel) and the API (Render) are different hosts, and Vercel doesn't
 * proxy WebSockets, so the browser must be told where the API is when the bundle is built. Left
 * empty, every /api call would reach the static site and get index.html back, and the WebSocket
 * would never connect. Fail the build instead of shipping that.
 */
function requireApiUrl(mode: string) {
  const { VITE_API_URL } = loadEnv(mode, root, "VITE_")
  if (!VITE_API_URL) {
    throw new Error(
      "VITE_API_URL is not set. A production build needs the API's URL " +
        "(for example https://your-api.onrender.com). Set it in the hosting environment.",
    )
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // True for the dev server and for `vite preview` (which serves a finished build locally).
  const isServing = command === "serve"
  if (!isServing && mode === "production") requireApiUrl(mode)

  return {
    plugins: [
      react(),
      tailwindcss(),
      // A throwaway certificate, for the local server only.
      ...(isServing ? [basicSsl()] : []),
    ],
    resolve: {
      alias: {
        "@app": fromSrc("app"),
        "@shared": fromSrc("shared"),
        "@features": fromSrc("features"),
      },
    },
    // `vite preview` inherits `server.host` and `server.proxy`, so a build can be tried on the LAN too.
    ...(isServing ? { server: localServer } : {}),
  }
})
