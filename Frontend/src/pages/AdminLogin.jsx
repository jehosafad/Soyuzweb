import { useState, useEffect } from "react";
import SectionHeading from "../components/SectionHeading";
import Button from "../components/Button";
import Input from "../components/Input";

export default function AdminLogin() {
    // Estado para el Token JWT
    const [token, setToken] = useState(localStorage.getItem("soyuz_admin_token") || "");
    const [leads, setLeads] = useState([]);

    // Estados del formulario
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");

    // Si hay token, automáticamente buscamos los leads
    useEffect(() => {
        if (token) fetchLeads();
    }, [token]);

    // 1. Iniciar sesión en la API
    const handleLogin = async (e) => {
        e.preventDefault();
        setStatus("loading");
        setError("");

        try {
            const res = await fetch("http://localhost:4000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || "Credenciales inválidas");

            // Guardamos el token devuelto por tu backend DevSecOps
            localStorage.setItem("soyuz_admin_token", data.data.token);
            setToken(data.data.token);
            setStatus("idle");
        } catch (err) {
            setError(err.message);
            setStatus("error");
        }
    };

    // 2. Obtener los mensajes protegidos
    const fetchLeads = async () => {
        try {
            const res = await fetch("http://localhost:4000/api/admin/leads", {
                headers: {
                    // Inyectamos el JWT en los headers para pasar la validación requireAuth
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 401) handleLogout(); // Si el token expiró, lo sacamos
                throw new Error("Error al obtener leads");
            }

            // Manejamos la respuesta paginada de tu backend
            setLeads(data.data?.items || data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    // 3. Cerrar sesión
    const handleLogout = () => {
        localStorage.removeItem("soyuz_admin_token");
        setToken("");
        setLeads([]);
    };

    // VISTA 1: PANEL DE CONTROL (Si ya está logueado)
    if (token) {
        return (
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <SectionHeading eyebrow="Panel de Control" title="Bandeja de Entrada" />
                    <Button variant="secondary" onClick={handleLogout}>Cerrar Sesión</Button>
                </div>

                <div className="overflow-x-auto bg-white rounded-2xl shadow-sm ring-1 ring-slate-200">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
                        <tr>
                            <th className="p-4 font-semibold">Fecha</th>
                            <th className="p-4 font-semibold">Nombre</th>
                            <th className="p-4 font-semibold">Email</th>
                            <th className="p-4 font-semibold">Asunto</th>
                            <th className="p-4 font-semibold">Mensaje</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                        {leads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-slate-50 transition">
                                <td className="p-4 whitespace-nowrap">{new Date(lead.created_at || lead.createdAt).toLocaleDateString()}</td>
                                <td className="p-4 font-medium text-slate-900">{lead.name}</td>
                                <td className="p-4">{lead.email}</td>
                                <td className="p-4 font-medium text-cyan-700">{lead.subject}</td>
                                <td className="p-4 max-w-xs truncate" title={lead.message}>{lead.message}</td>
                            </tr>
                        ))}
                        {leads.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-500">No tienes mensajes nuevos.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </section>
        );
    }

    // VISTA 2: LOGIN (Si no hay token)
    return (
        <section className="mx-auto max-w-md px-4 py-20">
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">Acceso Restringido</h2>
                <form onSubmit={handleLogin} className="grid gap-5">
                    <Input
                        label="Email Administrativo"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@soyuz.dev"
                        required
                    />
                    <Input
                        label="Contraseña"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />

                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-200 text-center">
                            {error}
                        </div>
                    )}

                    <Button type="submit" variant="primary" disabled={status === "loading"} className="mt-2">
                        {status === "loading" ? "Verificando JWT..." : "Entrar al Sistema"}
                    </Button>
                </form>
            </div>
        </section>
    );
}