import Input from "../components/Input";
import Button from "../components/Button";

export default function AdminLogin() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Iniciar sesión
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Fase 1: UI estática. En Fase 2 conectamos autenticación real.
      </p>

      <form
        className="mt-8 grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          alert("Fase 1: login estático. Fase 2: autenticación real.");
        }}
      >
        <Input label="Usuario" placeholder="admin" autoComplete="username" />
        <Input
          label="Contraseña"
          placeholder="••••••••"
          type="password"
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-cyan-400 focus:ring-cyan-400"
            />
            Recordarme
          </label>

          <a
            href="#"
            className="text-sm font-semibold text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              alert("Fase 1: placeholder.");
            }}
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <Button variant="primary" className="w-full px-6 py-3">
          Entrar (UI)
        </Button>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-semibold text-slate-500">Nota</p>
          <p className="mt-1 text-sm text-slate-700">
            Este panel se conectará en Fase 2 con backend y base de datos.
          </p>
        </div>
      </form>
    </div>
  );
}