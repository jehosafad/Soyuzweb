import { useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";

function decodeJwtPayload(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(
            base64.length + ((4 - (base64.length % 4)) % 4),
            "="
        );

        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

function resolvePrivatePath(role) {
    if (role === "admin") return "/admin/dashboard";
    if (role === "user") return "/client/portal";
    return "/login";
}

async function parseApiResponse(response) {
    const raw = await response.text();
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        throw new Error("La API devolvió una respuesta no válida.");
    }
}

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setStatus("loading");
        setError("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await parseApiResponse(response);

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            const accessToken = data?.data?.accessToken;

            if (!accessToken) {
                throw new Error("La API no devolvió accessToken.");
            }

            const payload = decodeJwtPayload(accessToken);

            if (!payload?.role) {
                throw new Error("El JWT no contiene un rol válido.");
            }

            localStorage.removeItem("soyuz_admin_token");
            localStorage.setItem("soyuz_access_token", accessToken);
            localStorage.setItem(
                "soyuz_user",
                JSON.stringify({
                    id: payload.sub || payload.id || null,
                    email: payload.email || email,
                    role: payload.role,
                })
            );

            window.location.replace(resolvePrivatePath(payload.role));
        } catch (err) {
            setError(err.message || "No se pudo iniciar sesión.");
            setStatus("error");
        } finally {
            setStatus("idle");
        }
    }

    return (
        <div className="mx-auto max-w-md">
            <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">
                Iniciar sesión
            </h2>

            <form onSubmit={handleSubmit} className="grid gap-5">
                <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@soyuz.local"
                    required
                />

                <Input
                    label="Contraseña"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                />

                {error ? (
                    <div className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600 ring-1 ring-red-200">
                        {error}
                    </div>
                ) : null}

                <Button
                    type="submit"
                    variant="primary"
                    disabled={status === "loading"}
                    className="mt-2"
                >
                    {status === "loading" ? "Validando acceso..." : "Entrar al sistema"}
                </Button>
            </form>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <p className="text-sm font-semibold text-slate-900">Acceso unificado</p>
                <p className="mt-2 text-sm text-slate-600">
                    El sistema te redirige automáticamente al CRM o al portal del cliente
                    según el rol embebido en el JWT.
                </p>
            </div>
        </div>
    );
}