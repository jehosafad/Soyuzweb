import { Link, Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-white hover:ring-1 hover:ring-slate-200"
          >
            <span aria-hidden="true">←</span>
            Volver a Soyuz
          </Link>

          <div className="mt-8 grid items-stretch gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 shadow-sm ring-1 ring-slate-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_0_6px_rgba(34,211,238,0.15)]" />
                </div>

                <div>
                  <p className="text-lg font-semibold tracking-tight text-blue-600">
                    Soyuz Access
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Inicio de sesión unificado para CRM interno y portal de cliente.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4">
                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">
                    Acceso por roles
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Un solo login público. El sistema detecta tu rol y te redirige
                    automáticamente al entorno correcto.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">
                    Admin y cliente
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Si eres <span className="font-medium text-slate-800">admin</span>,
                    entras al CRM. Si eres <span className="font-medium text-slate-800">user</span>,
                    entras al portal del cliente.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">
                    Seguridad y continuidad
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Validación estricta, control de sesión y una sola puerta de entrada
                    pública para preparar Soyuz como SaaS.
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                <p className="text-xs font-medium text-slate-500">
                  Sprint 9 · Auth unificado
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  La landing pública se mantiene intacta. Solo se sustituye el acceso
                  visible de “Admin” por “Iniciar sesión” y la redirección final se
                  resuelve por JWT.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
  );
}