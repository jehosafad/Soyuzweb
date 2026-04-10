import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setStatus("loading");
        setError("");

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || "Error al enviar solicitud.");
            }

            setSent(true);
        } catch (err) {
            setError(err.message || "No se pudo procesar tu solicitud.");
        } finally {
            setStatus("idle");
        }
    }

    if (sent) {
        return (
            <div className="mx-auto max-w-md text-center">
                <div className="mb-4 text-4xl">📧</div>
                <h2 className="mb-3 text-2xl font-bold text-slate-900">
                    Revisa tu correo
                </h2>
                <p className="text-sm text-slate-600">
                    Si existe una cuenta con <span className="font-medium">{email}</span>,
                    recibirás un enlace para restablecer tu contraseña.
                </p>
                <Link to="/login" className="mt-6 inline-block text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Volver a iniciar sesión
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-md">
            <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">
                Recuperar contraseña
            </h2>
            <p className="mb-6 text-center text-sm text-slate-500">
                Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
            </p>

            <form onSubmit={handleSubmit} className="grid gap-5">
                <Input
                    label="Correo electrónico"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                />

                {error ? (
                    <div className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600 ring-1 ring-red-200">
                        {error}
                    </div>
                ) : null}

                <Button type="submit" variant="primary" disabled={status === "loading"} className="mt-2">
                    {status === "loading" ? "Enviando..." : "Enviar enlace de recuperación"}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium transition">
                    Volver a iniciar sesión
                </Link>
            </p>
        </div>
    );
}
