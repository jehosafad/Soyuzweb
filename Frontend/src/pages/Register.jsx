import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";

function decodeJwtPayload(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

export default function Register() {
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");

    function update(field) {
        return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setStatus("loading");
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Las contraseñas no coinciden.");
            setStatus("idle");
            return;
        }

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            const accessToken = data?.data?.accessToken;
            if (!accessToken) throw new Error("No se recibió token de acceso.");

            const payload = decodeJwtPayload(accessToken);

            localStorage.setItem("soyuz_access_token", accessToken);
            localStorage.setItem(
                "soyuz_user",
                JSON.stringify({
                    id: payload?.sub || payload?.id || null,
                    email: payload?.email || form.email,
                    role: payload?.role || "user",
                    fullName: form.fullName,
                })
            );

            window.location.replace("/client/portal");
        } catch (err) {
            setError(err.message || "No se pudo crear la cuenta.");
            setStatus("idle");
        }
    }

    return (
        <div className="mx-auto max-w-md">
            <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">
                Crear cuenta
            </h2>

            <form onSubmit={handleSubmit} className="grid gap-4">
                <Input
                    label="Nombre completo"
                    name="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={update("fullName")}
                    placeholder="Tu nombre"
                    required
                />

                <Input
                    label="Correo electrónico"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="tu@correo.com"
                    required
                />

                <Input
                    label="Teléfono (opcional)"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={update("phone")}
                    placeholder="+52 1 464 000 0000"
                />

                <Input
                    label="Contraseña"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={update("password")}
                    placeholder="Mínimo 8 caracteres"
                    required
                />

                <Input
                    label="Confirmar contraseña"
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={update("confirmPassword")}
                    placeholder="Repite tu contraseña"
                    required
                />

                {error ? (
                    <div className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600 ring-1 ring-red-200">
                        {error}
                    </div>
                ) : null}

                <Button type="submit" variant="primary" disabled={status === "loading"} className="mt-2">
                    {status === "loading" ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
                ¿Ya tienes cuenta?{" "}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition">
                    Iniciar sesión
                </Link>
            </p>
        </div>
    );
}
