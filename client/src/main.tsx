import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./styles/globals2.css"
import Layout from "./Layout.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Layout />
  </StrictMode>,
)
