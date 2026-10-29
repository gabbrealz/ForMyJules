import { createBrowserRouter, Navigate } from "react-router-dom"
import { AdminRoute, ProtectedRoute } from "#features/auth"
import SidebarLayout from "#layouts/SidebarLayout"
import { AdminSidebar } from "@features/admin"
import Landing from "#pages/Landing"
import Login from "#pages/Login"
import Signup from "#pages/Signup"
import Home from "#pages/Home"
import Gallery from "#pages/Gallery"
import Scrapbook from "#pages/Scrapbook"
import Photobooth from "#pages/Photobooth"
import MusicLocker from "#pages/MusicLocker"
import SpinTheWheel from "#pages/SpinTheWheel"
import Profile from "#pages/Profile"
import AdminUsers from "#pages/admin/AdminUsers"
import AdminPending from "#pages/admin/AdminPending"

export const router = createBrowserRouter([
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
        element: <SidebarLayout />,
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
            element: <SidebarLayout sidebar={AdminSidebar} />,
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
