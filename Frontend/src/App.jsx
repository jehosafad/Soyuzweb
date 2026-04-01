import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

import Home from "./pages/Home";
import Portfolio from "./pages/Portafolio";
import Contact from "./pages/Contact";
import AdminLogin from "./pages/AdminLogin";

import Services from "./pages/Services";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/servicios" element={<Services />} />
          <Route path="/portafolio" element={<Portfolio />} />
          <Route path="/contacto" element={<Contact />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/admin" element={<AdminLogin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}