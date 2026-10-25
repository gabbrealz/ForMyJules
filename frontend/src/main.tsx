import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import "./styles/globals.css"
import { AppProviders } from "./app/providers.tsx"
import { AdminRoute, ProtectedRoute } from "./features/auth/index.ts"
import Layout from "./Layout.tsx"
import { AdminSidebar } from "#components/admin/admin-sidebar"
import Landing from "./pages/Landing.tsx"
import Login from "./pages/Login.tsx"
import Signup from "./pages/Signup.tsx"
import Home from "./pages/Home.tsx"
import Gallery from "./pages/Gallery.tsx"
import Scrapbook from "./pages/Scrapbook.tsx"
import Photobooth from "./pages/Photobooth.tsx"
import MusicLocker from "./pages/MusicLocker.tsx"
import SpinTheWheel from "./pages/SpinTheWheel.tsx"
import Profile from "./pages/Profile.tsx"
import AdminUsers from "./pages/admin/AdminUsers.tsx"
import AdminPending from "./pages/admin/AdminPending.tsx"

const router = createBrowserRouter([
  // Public
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },

  // Authenticated
  {
    element: <ProtectedRoute />,
    children: [
      // Main app: standard sidebar layout
      {
        element: <Layout />,
        children: [
          { path: "home", element: <Home /> },
          { path: "gallery", element: <Gallery /> },
          { path: "scrapbook", element: <Scrapbook /> },
          { path: "photobooth", element: <Photobooth /> },
          { path: "music", element: <MusicLocker /> },
          { path: "spin-the-wheel", element: <SpinTheWheel /> },
          { path: "profile", element: <Profile /> },
        ],
      },

      // Admin: same shell, its own sidebar, admins only.
      {
        element: <AdminRoute />,
        children: [
          {
            element: <Layout sidebar={AdminSidebar} />,
            children: [
              { path: "admin", element: <Navigate to="/admin/users" replace /> },
              { path: "admin/users", element: <AdminUsers /> },
              { path: "admin/pending", element: <AdminPending /> },
            ],
          },
        ],
      },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>
)
