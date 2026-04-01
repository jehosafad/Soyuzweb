import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  const quickLinks = [
    { label: "Inicio", to: "/" },
    { label: "Portafolio", to: "/portafolio" },
    { label: "Contacto", to: "/contacto" },
    { label: "Admin", to: "/admin" },
  ];

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 py-12 lg:grid-cols-3">
          {/* Brand card */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_0_6px_rgba(34,211,238,0.15)]" />
              </div>
              <div>
                <p className="text-base font-semibold tracking-tight text-blue-600">
                  Soyuz
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Automatización y desarrollo web con estética corporativa y
                  ejecución limpia.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {["Bento Grid", "SaaS moderno", "Ingeniería limpia"].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Links card */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">Enlaces</p>
            <ul className="mt-4 grid gap-2">
              {quickLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="group inline-flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
                  >
                    <span>{l.label}</span>
                    <span className="text-slate-400 transition group-hover:text-blue-600">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact card */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">Contacto</p>

            <div className="mt-4 grid gap-3">
              <a
                href="mailto:contacto@soyuz.dev"
                className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
              >
                <span className="block text-xs font-medium text-slate-500">
                  Email
                </span>
                <span className="block font-semibold">contacto@soyuz.dev</span>
              </a>

              <a
                href="https://wa.me/5214642072356"
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
              >
                <span className="block text-xs font-medium text-slate-500">
                  WhatsApp
                </span>
                <span className="block font-semibold">+52 1 464 207 2356</span>
              </a>
            </div>

            <Link
              to="/contacto"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-cyan-300 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
            >
              Cotizar proyecto
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">© {year} Soyuz.</p>
          <p className="text-xs text-slate-500">
            SaaS corporativo • Bento Grid • Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}