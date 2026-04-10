import { Link, Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-white hover:ring-1 hover:ring-slate-200">
            <span aria-hidden="true">&larr;</span> Volver a Soyuz
          </Link>
          <div className="mt-8 grid items-stretch gap-8 lg:grid-cols-2">
            <div className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-10 shadow-sm ring-1 ring-slate-700">
              <div className="grid h-24 w-24 place-items-center rounded-3xl overflow-hidden ring-2 ring-white/20 shadow-lg">
                <img src="/logo-soyuz.jpeg" alt="Soyuz" className="h-full w-full object-cover" />
              </div>
              <p className="mt-6 text-2xl font-bold tracking-tight text-white">Soyuz</p>
              <p className="mt-2 text-sm text-slate-400">Development &amp; Automation</p>
              <div className="mt-10 w-full max-w-xs space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/20 text-cyan-400 text-sm">✓</span>
                  <p className="text-sm text-slate-300">Gestiona tus proyectos</p>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/20 text-cyan-400 text-sm">✓</span>
                  <p className="text-sm text-slate-300">Descarga tus archivos</p>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/20 text-cyan-400 text-sm">✓</span>
                  <p className="text-sm text-slate-300">Soporte directo</p>
                </div>
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
