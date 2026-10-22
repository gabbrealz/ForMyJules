import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import './styles/globals.css';
import { AuthProvider } from './auth/AuthProvider.tsx';
import ProtectedRoute from './auth/ProtectedRoute.tsx';
import Layout from './Layout.tsx';
import Landing from './pages/Landing.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import Home from './pages/Home.tsx';
import Gallery from './pages/Gallery.tsx';
import Scrapbook from './pages/Scrapbook.tsx';
import Photobooth from './pages/Photobooth.tsx';
import MusicLocker from './pages/MusicLocker.tsx';
import SpinTheWheel from './pages/SpinTheWheel.tsx';
import Profile from './pages/Profile.tsx';

const router = createBrowserRouter([
  // Public
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },

  // Authenticated: sidebar layout
  {
    element: <ProtectedRoute />,
    children: [
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
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
