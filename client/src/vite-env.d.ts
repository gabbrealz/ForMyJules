/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional on purpose: the backend isn't built yet, so it may be unset.
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
