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
    } catch { return null; }
}

function resolvePrivatePath(role) {
    if (role === "admin") return "/admin/dashboard";
    if (role === "user") return "/client/portal";
    return "/login";
}

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus("loading");
        setError("");
        try {
            const resp = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.message || "Error al iniciar sesión");
            const accessToken = data?.data?.accessToken;
            if (!accessToken) throw new Error("No se recibió token de acceso.");
            const payload = decodeJwtPayload(accessToken);
            if (!payload?.role) throw new Error("No se pudo verificar tu cuenta.");
            localStorage.removeItem("soyuz_admin_token");
            localStorage.setItem("soyuz_access_token", accessToken);
            localStorage.setItem("soyuz_user", JSON.stringify({
                id: payload.sub || payload.id || null,
                email: payload.email || email,
                role: payload.role,
                fullName: data?.data?.user?.fullName || "",
            }));
            window.location.replace(resolvePrivatePath(payload.role));
        } catch (err) {
            setError(err.message || "No se pudo iniciar sesión.");
            setStatus("idle");
        }
    }

    return (
        <div className="mx-auto max-w-md">
            <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">Iniciar sesión</h2>
            <form onSubmit={handleSubmit} className="grid gap-5">
                <Input label="Correo electrónico" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required />
                <Input label="Contraseña" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                {error && <div className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600 ring-1 ring-red-200">{error}</div>}
                <Button type="submit" variant="primary" disabled={status === "loading"} className="mt-2">
                    {status === "loading" ? "Verificando..." : "Iniciar sesión"}
                </Button>
            </form>
            <div className="mt-6 flex flex-col items-center gap-3 text-sm">
                <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">¿Olvidaste tu contraseña?</Link>
                <p className="text-slate-500">¿No tienes cuenta? <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">Crear cuenta</Link></p>
            </div>
        </div>
    );
}
