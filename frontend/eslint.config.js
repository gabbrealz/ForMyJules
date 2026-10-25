import { existsSync, readdirSync } from "node:fs"
import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

// ---------------------------------------------------------------------------
// Layer boundaries (core rules only, no plugin):
//   no-restricted-imports -> which layer may import which (alias specifiers)
//   no-restricted-syntax  -> a relative "../" may not leave its own layer dir
//   no-restricted-globals -> domain/application stay free of browser I/O
// Patterns use gitignore syntax: a pattern also matches everything below it.
// ---------------------------------------------------------------------------

// Relative imports are checked up to this many folders below a layer root.
const MAX_DEPTH = 5

// Read at startup: restart ESLint after adding a feature folder.
const featuresDir = new URL("./src/features/", import.meta.url)
const features = existsSync(featuresDir)
  ? readdirSync(featuresDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : []

const ban = (group, message) => (group.length > 0 ? { group, message } : null)
const imports = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns: patterns.filter(Boolean) }],
})

const uiLibs = [
  "react",
  "react-dom",
  "react-router",
  "react-router-dom",
  "framer-motion",
  "lucide-react",
  "@base-ui/*",
]

const noApp = ban(
  ["@app"],
  "Features must not import the composition root (src/app).",
)
const noUi = ban(
  [
    ...uiLibs,
    "@shared/components",
    "@shared/hooks",
    "\\#components",
    "\\#hooks",
  ],
  "domain and application must stay free of React and UI code.",
)
const indexOnly =
  "Other features are reachable through their index.ts only (@features/<name>)."

// One config object per feature layer, because "own feature" differs per feature.
const featureLayerConfigs = features.flatMap((feature) => {
  const others = features.filter((name) => name !== feature)
  const own = (layer) => `@features/${feature}/${layer}`
  const layers = {
    domain: [
      ban(
        ["@features"],
        "domain is self-contained: use ./ or ../ inside the layer.",
      ),
      noUi,
    ],
    application: [
      ban(
        others.map((name) => `@features/${name}`),
        "application depends on its own domain only.",
      ),
      ban(
        [own("infrastructure"), own("presentation")],
        "application must not depend on infrastructure or presentation.",
      ),
      noUi,
    ],
    infrastructure: [
      ban(
        others.map((name) => `@features/${name}/*`),
        indexOnly,
      ),
      ban([own("presentation")], "infrastructure must not import presentation."),
    ],
    presentation: [
      ban(
        others.map((name) => `@features/${name}/*`),
        indexOnly,
      ),
      ban(
        [own("infrastructure")],
        "presentation never imports infrastructure; src/app wires adapters.",
      ),
    ],
  }
  return Object.entries(layers).map(([layer, patterns]) => ({
    files: [`src/features/${feature}/${layer}/**/*.{ts,tsx}`],
    rules: imports(...patterns, noApp),
  }))
})

const escapesLayer = (depth) => ({
  // A file `depth` folders below its layer root may use at most `depth` "../".
  // \x2F is "/" (esquery regex literals can't contain a raw slash).
  selector: `:matches(ImportDeclaration, ExportAllDeclaration, ExportNamedDeclaration, ImportExpression)[source.value=/^(\\.\\.(\\x2F|$)){${depth + 1},}/]`,
  message:
    "Relative imports must stay inside their layer. Cross layers with @app, @shared or @features/<own-feature>/<layer>/...",
})

const withinLayer = (base) =>
  Array.from({ length: MAX_DEPTH + 1 }, (_, depth) => ({
    files: [`${base}/${"*/".repeat(depth)}*.{ts,tsx}`],
    rules: { "no-restricted-syntax": ["error", escapesLayer(depth)] },
  }))

const browserApis = [
  "fetch",
  "localStorage",
  "sessionStorage",
  "window",
  "document",
]

const boundaryConfigs = [
  ...featureLayerConfigs,
  // Feature root (index.ts): may re-export anything below it, never "../".
  {
    files: ["src/features/*/*.{ts,tsx}"],
    rules: {
      ...imports(noApp),
      "no-restricted-syntax": ["error", escapesLayer(0)],
    },
  },
  // domain/application: no browser I/O (put it behind a port).
  {
    files: ["src/features/*/{domain,application}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...browserApis.map((name) => ({
          name,
          message: `${name} is a browser API: put it behind a port in infrastructure/.`,
        })),
      ],
    },
  },
  // app: composition root, features only through their index.ts.
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: imports(ban(["@features/*/*"], indexOnly)),
  },
  // shared (and legacy dirs until they move): no feature or app knowledge.
  {
    files: [
      "src/shared/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/lib/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
    ],
    rules: imports(
      ban(["@features", "@app"], "shared code must not know features or app."),
    ),
  },
  // "../" may not escape a layer directory.
  ...withinLayer("src/app"),
  ...withinLayer("src/shared"),
  ...withinLayer("src/features/*/*"),
]

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  ...boundaryConfigs,
])
