import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setStatus("loading");
        setError("");

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            setStatus("idle");
            return;
        }

        if (!token) {
            setError("Enlace inválido. Solicita uno nuevo.");
            setStatus("idle");
            return;
        }

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password, confirmPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || "No se pudo restablecer la contraseña.");
            }

            setSuccess(true);
        } catch (err) {
            setError(err.message || "Error al restablecer la contraseña.");
        } finally {
            setStatus("idle");
        }
    }

    if (success) {
        return (
            <div className="mx-auto max-w-md text-center">
                <div className="mb-4 text-4xl">✅</div>
                <h2 className="mb-3 text-2xl font-bold text-slate-900">
                    Contraseña actualizada
                </h2>
                <p className="text-sm text-slate-600">
                    Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión.
                </p>
                <Link to="/login" className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                    Iniciar sesión
                </Link>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="mx-auto max-w-md text-center">
                <div className="mb-4 text-4xl">⚠️</div>
                <h2 className="mb-3 text-2xl font-bold text-slate-900">
                    Enlace inválido
                </h2>
                <p className="text-sm text-slate-600">
                    Este enlace de recuperación no es válido o ya expiró.
                </p>
                <Link to="/forgot-password" className="mt-6 inline-block text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Solicitar uno nuevo
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-md">
            <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">
                Nueva contraseña
            </h2>

            <form onSubmit={handleSubmit} className="grid gap-5">
                <Input
                    label="Nueva contraseña"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                />

                <Input
                    label="Confirmar contraseña"
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    required
                />

                {error ? (
                    <div className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600 ring-1 ring-red-200">
                        {error}
                    </div>
                ) : null}

                <Button type="submit" variant="primary" disabled={status === "loading"} className="mt-2">
                    {status === "loading" ? "Guardando..." : "Guardar nueva contraseña"}
                </Button>
            </form>
        </div>
    );
}
