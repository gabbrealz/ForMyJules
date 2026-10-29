import { RouterProvider } from "react-router-dom"
import { router } from "#routes/AppRoutes"
import { AuthProvider } from "#features/auth"

export default function Layout() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}