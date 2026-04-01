import { Outlet, Link } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-white ring-1 ring-transparent hover:ring-slate-200 transition"
        >
          <span aria-hidden="true">←</span> Volver a Soyuz
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-2 items-stretch">
          {/* Left: brand panel */}
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_0_6px_rgba(34,211,238,0.15)]" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-blue-600">
                  Soyuz Admin
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Acceso al panel. (UI estática en Fase 1)
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4">
              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <p className="text-sm font-semibold text-slate-900">
                  Fase 2 (backend)
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Autenticación real, roles, base de datos y panel de gestión.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <p className="text-sm font-semibold text-slate-900">
                  Seguridad y buenas prácticas
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Validación estricta, control de sesiones y hardening.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-white ring-1 ring-slate-200 p-5">
              <p className="text-xs font-medium text-slate-500">
                Consejo (Tech Lead)
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Mantén el login impecable visualmente ahora; en Fase 2 conectamos
                autenticación sin romper UI.
              </p>
            </div>
          </div>

          {/* Right: outlet */}
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}