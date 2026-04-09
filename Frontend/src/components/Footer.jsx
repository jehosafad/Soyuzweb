import { Link } from "react-router-dom";
import Button from "./Button";

export default function Footer() {
  return (
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_0_6px_rgba(34,211,238,0.12)]" />
              </div>

              <div>
                <p className="text-lg font-semibold tracking-tight text-blue-600">
                  Soyuz
                </p>
                <p className="text-sm text-slate-600">
                  Automatización y desarrollo web con estética corporativa y ejecución limpia.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
              Bento Grid
            </span>
              <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
              SaaS moderno
            </span>
              <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
              Ingeniería limpia
            </span>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900">
              Enlaces
            </h3>

            <nav className="grid gap-3 text-sm">
              <Link className="text-slate-700 transition hover:text-blue-600" to="/">
                Inicio
              </Link>
              <Link className="text-slate-700 transition hover:text-blue-600" to="/portafolio">
                Portafolio
              </Link>
              <Link className="text-slate-700 transition hover:text-blue-600" to="/contacto">
                Contacto
              </Link>
              <Link className="text-slate-700 transition hover:text-blue-600" to="/login">
                Iniciar sesión
              </Link>
            </nav>
          </div>

          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900">
              Contacto
            </h3>

            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
                <p className="mt-1 font-medium">contacto@soyuz.dev</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-wide text-slate-500">WhatsApp</p>
                <p className="mt-1 font-medium">+52 1 464 207 2356</p>
              </div>
            </div>

            <Button as={Link} to="/contacto" variant="primary" className="mt-5 w-full">
              Cotizar proyecto
            </Button>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl items-center justify-between border-t border-slate-200 px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <p>© 2026 Soyuz</p>
          <p>SaaS corporativo · Bento Grid · Tailwind CSS</p>
        </div>
      </footer>
  );
}