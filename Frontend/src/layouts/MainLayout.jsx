import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}