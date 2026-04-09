import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

import Home from "./pages/Home";
import Services from "./pages/Services";
import Portafolio from "./pages/Portafolio";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import ClientPortal from "./pages/ClientPortal";
import AdminDashboard from "./pages/AdminDashboard";

function clearSession() {
  localStorage.removeItem("soyuz_access_token");
  localStorage.removeItem("soyuz_user");
  localStorage.removeItem("soyuz_admin_token");
}

function getStoredToken() {
  const token = localStorage.getItem("soyuz_access_token");
  if (!token || token === "undefined" || token === "null") return null;
  return token;
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        "="
    );

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getSession() {
  const token = getStoredToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) {
    clearSession();
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    clearSession();
    return null;
  }

  return {
    token,
    user: {
      id: payload.sub || payload.id || null,
      email: payload.email || "",
      role: payload.role || "",
    },
  };
}

function resolvePrivatePath(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "user") return "/client/portal";
  return "/login";
}

function ProtectedRoute({ allowedRoles, children }) {
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(session.user.role)) {
    return <Navigate to={resolvePrivatePath(session.user.role)} replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const session = getSession();

  if (!session) return children;

  return <Navigate to={resolvePrivatePath(session.user.role)} replace />;
}

export default function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/servicios" element={<Services />} />
            <Route path="/services" element={<Services />} />
            <Route path="/portafolio" element={<Portafolio />} />
            <Route path="/portfolio" element={<Portafolio />} />
            <Route path="/contacto" element={<Contact />} />
            <Route path="/contact" element={<Contact />} />
          </Route>

          <Route element={<AuthLayout />}>
            <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
            />
          </Route>

          <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
          />

          <Route
              path="/client/portal"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <ClientPortal />
                </ProtectedRoute>
              }
          />

          <Route path="/admin" element={<Navigate to="/login" replace />} />
          <Route path="/client" element={<Navigate to="/client/portal" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
  );
}