import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Button from "./Button";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const links = useMemo(
      () => [
        { label: "Inicio", to: "/" },
        { label: "Servicios", to: "/servicios" },
        { label: "Portafolio", to: "/portafolio" },
        { label: "Contacto", to: "/contacto" },
      ],
      []
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navLinkClass = ({ isActive }) =>
      [
        "rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2",
        isActive
            ? "bg-slate-50 text-blue-600"
            : "text-slate-700 hover:bg-slate-50 hover:text-blue-600",
      ].join(" ");

  return (
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
                to="/"
                className="group flex items-center gap-3 rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
                onClick={() => setOpen(false)}
            >
            <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_0_6px_rgba(34,211,238,0.15)]" />
            </span>

              <span className="leading-tight">
              <span className="block text-base font-semibold tracking-tight text-blue-600">
                Soyuz
              </span>
              <span className="hidden text-xs text-slate-500 sm:block">
                Development & Automation
              </span>
            </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {links.map((l) => (
                  <NavLink key={l.label} to={l.to} className={navLinkClass} end>
                    {l.label}
                  </NavLink>
              ))}
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <Link
                  to="/login"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
              >
                Iniciar sesión
              </Link>

              <Button as={Link} to="/contacto" variant="primary">
                Cotizar proyecto
                <svg
                    className="ml-2 h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                  <path
                      fillRule="evenodd"
                      d="M3 10a.75.75 0 0 1 .75-.75h10.69l-3.22-3.22a.75.75 0 1 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H3.75A.75.75 0 0 1 3 10Z"
                      clipRule="evenodd"
                  />
                </svg>
              </Button>
            </div>

            <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl p-2 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 md:hidden"
                aria-expanded={open}
                aria-controls="soyuz-mobile-menu"
                onClick={() => setOpen((v) => !v)}
            >
            <span className="sr-only">
              {open ? "Cerrar menú" : "Abrir menú"}
            </span>

              {open ? (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6.28 5.22a.75.75 0 0 1 1.06 0L10 7.88l2.66-2.66a.75.75 0 1 1 1.06 1.06L11.06 8.94l2.66 2.66a.75.75 0 1 1-1.06 1.06L10 10l-2.66 2.66a.75.75 0 1 1-1.06-1.06l2.66-2.66-2.66-2.66a.75.75 0 0 1 0-1.06Z" />
                  </svg>
              ) : (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 5.75A.75.75 0 0 1 3.75 5h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75Zm0 4.25A.75.75 0 0 1 3.75 9.25h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Zm0 4.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" />
                  </svg>
              )}
            </button>
          </div>

          {open && (
              <div id="soyuz-mobile-menu" className="pb-4 md:hidden">
                <div className="mt-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200/70">
                  <div className="grid gap-1">
                    {links.map((l) => (
                        <NavLink
                            key={l.label}
                            to={l.to}
                            className={navLinkClass}
                            end
                            onClick={() => setOpen(false)}
                        >
                          {l.label}
                        </NavLink>
                    ))}

                    <div className="my-1 h-px bg-slate-200/70" />

                    <Link
                        to="/login"
                        className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
                        onClick={() => setOpen(false)}
                    >
                      Iniciar sesión
                    </Link>

                    <Button
                        as={Link}
                        to="/contacto"
                        variant="primary"
                        className="mt-1 w-full"
                        onClick={() => setOpen(false)}
                    >
                      Cotizar proyecto
                    </Button>
                  </div>
                </div>
              </div>
          )}
        </div>
      </header>
  );
}