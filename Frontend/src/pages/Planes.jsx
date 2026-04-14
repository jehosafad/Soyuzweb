import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import Button from "../components/Button";

function getToken() {
    return localStorage.getItem("soyuz_access_token");
}

function getUser() {
    try { return JSON.parse(localStorage.getItem("soyuz_user")); } catch { return null; }
}

const premiumTiers = [
    {
        id: "local",
        name: "Proyectos Locales",
        price: 29,
        period: "mes",
        description: "Ideal para negocios locales que necesitan presencia web básica.",
        features: [
            "Soporte y mantenimiento ilimitado",
            "1 proyecto activo",
            "Cambios menores incluidos",
            "Respuesta en 48 horas",
        ],
    },
    {
        id: "business",
        name: "Proyectos Grandes",
        price: 79,
        period: "mes",
        description: "Para empresas que manejan plataformas web con tráfico real.",
        features: [
            "Todo lo de Proyectos Locales",
            "Hasta 3 proyectos activos",
            "Actualizaciones de funcionalidad",
            "Respuesta en 24 horas",
            "Revisiones de rendimiento",
        ],
        highlighted: true,
    },
    {
        id: "professional",
        name: "Proyectos Profesionales",
        price: 149,
        period: "mes",
        description: "Para clientes con múltiples proyectos y necesidades avanzadas.",
        features: [
            "Todo lo de Proyectos Grandes",
            "Proyectos ilimitados",
            "Prioridad máxima en soporte",
            "Asesoría estratégica incluida",
            "Respuesta en 12 horas",
            "Automatizaciones incluidas",
        ],
    },
];

export default function Planes() {
    const navigate = useNavigate();
    const [selectedTier, setSelectedTier] = useState(null);
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState("");
    const user = getUser();
    const isLoggedIn = Boolean(getToken() && user);

    async function handlePremiumPay(tier) {
        if (!isLoggedIn) {
            navigate("/register");
            return;
        }

        setPaying(true);
        setError("");

        try {
            // Crear cotización directa para la suscripción premium
            const token = getToken();
            const resp = await fetch("/api/payments/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    quoteId: null, // Pago directo de suscripción
                    amountUsd: tier.price,
                    description: `Suscripción Premium - ${tier.name}`,
                }),
            });

            const data = await resp.json();

            if (resp.ok && data?.data?.approveUrl) {
                window.location.href = data.data.approveUrl;
            } else {
                // Si PayPal no está configurado, redirigir a contacto
                setError("El sistema de pago aún no está habilitado. Contáctanos directamente para activar tu plan Premium.");
            }
        } catch {
            setError("Error al conectar con el sistema de pagos. Intenta de nuevo.");
        } finally {
            setPaying(false);
        }
    }

    return (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <SectionHeading
                eyebrow="Planes"
                title="Elige el plan que se adapte a ti"
                description="Sin letras chiquitas. Paga tu proyecto y decide si quieres soporte continuo."
            />

            {/* ── Free vs Premium ──────────────────────────────── */}
            <div className="mt-12 grid gap-8 md:grid-cols-2">
                {/* Plan Free */}
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Gratis</p>
                    <div className="mt-4">
                        <span className="text-4xl font-bold text-slate-900">$0</span>
                        <span className="ml-2 text-sm text-slate-500">/ cotización directa</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        Envíanos tu proyecto y te cotizamos sin compromiso. Pagas solo lo que necesitas.
                    </p>
                    <ul className="mt-6 space-y-3">
                        {["Cotización personalizada", "Desarrollo web a medida", "6 meses de garantía incluidos", "Soporte dentro de cobertura", "Archivos entregables"].map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm">
                                <span className="mt-0.5 text-xs text-emerald-500">✓</span>
                                <span className="text-slate-700">{f}</span>
                            </li>
                        ))}
                    </ul>
                    <Button as={Link} to="/contacto" variant="secondary" className="mt-8 w-full justify-center">
                        Cotizar proyecto
                    </Button>
                </div>

                {/* Plan Premium */}
                <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-sm ring-1 ring-slate-700 text-white">
                    <span className="absolute -top-3 right-6 rounded-full bg-cyan-400 px-4 py-1 text-xs font-bold text-slate-900 shadow-sm">
                        Recomendado
                    </span>
                    <p className="text-sm font-semibold uppercase tracking-wide text-cyan-400">Premium</p>
                    <div className="mt-4">
                        <span className="text-4xl font-bold">Desde $29</span>
                        <span className="ml-2 text-sm text-slate-400">USD / mes</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">
                        Soporte y mantenimiento ilimitado. Elige tu modalidad abajo.
                    </p>
                    <ul className="mt-6 space-y-3">
                        {["Sin cobros extra por cambios", "Mantenimiento incluido", "Prioridad en atención", "Si eres nuevo: 6 meses gratis antes del cobro", "Actualizaciones incluidas"].map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm">
                                <span className="mt-0.5 text-xs text-cyan-400">✓</span>
                                <span className="text-slate-200">{f}</span>
                            </li>
                        ))}
                    </ul>
                    <a href="#premium-tiers" className="mt-8 block w-full rounded-xl bg-cyan-400 py-3 text-center text-sm font-bold text-slate-900 transition hover:bg-cyan-300">
                        Elegir modalidad Premium
                    </a>
                </div>
            </div>

            {/* ── Premium Tiers ──────────────────────────────── */}
            <div id="premium-tiers" className="mt-16">
                <h3 className="text-center text-2xl font-bold text-slate-900">Modalidades Premium</h3>
                <p className="mt-2 text-center text-sm text-slate-500">
                    Elige según la escala de tus proyectos. Si eres usuario nuevo, tus primeros 6 meses son gratis.
                </p>

                {selectedTier && !error && (
                    <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-center text-sm text-blue-800 ring-1 ring-cyan-200">
                        Seleccionaste: <strong>{premiumTiers.find(t => t.id === selectedTier)?.name}</strong>
                    </div>
                )}

                {error && (
                    <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
                        {error}{" "}
                        <Link to="/contacto" className="font-semibold underline">Ir a contacto</Link>
                    </div>
                )}

                <div className="mt-8 grid gap-6 md:grid-cols-3">
                    {premiumTiers.map((tier) => (
                        <div
                            key={tier.id}
                            className={`rounded-3xl p-6 shadow-sm ring-1 transition cursor-pointer ${
                                selectedTier === tier.id
                                    ? "bg-slate-900 text-white ring-cyan-400 ring-2"
                                    : tier.highlighted
                                        ? "bg-white ring-cyan-200 hover:ring-cyan-400"
                                        : "bg-white ring-slate-200 hover:ring-slate-300"
                            }`}
                            onClick={() => setSelectedTier(tier.id)}
                        >
                            {tier.highlighted && selectedTier !== tier.id && (
                                <span className="mb-3 inline-block rounded-full bg-cyan-100 px-3 py-0.5 text-[10px] font-bold text-cyan-700">Popular</span>
                            )}
                            <p className={`text-xs font-semibold uppercase tracking-wide ${selectedTier === tier.id ? "text-cyan-400" : "text-cyan-600"}`}>
                                {tier.name}
                            </p>
                            <div className="mt-3">
                                <span className="text-3xl font-bold">${tier.price}</span>
                                <span className={`ml-1 text-sm ${selectedTier === tier.id ? "text-slate-400" : "text-slate-500"}`}>USD / {tier.period}</span>
                            </div>
                            <p className={`mt-2 text-sm ${selectedTier === tier.id ? "text-slate-300" : "text-slate-600"}`}>
                                {tier.description}
                            </p>
                            <ul className="mt-4 space-y-2">
                                {tier.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2 text-xs">
                                        <span className={`mt-0.5 ${selectedTier === tier.id ? "text-cyan-400" : "text-emerald-500"}`}>✓</span>
                                        <span className={selectedTier === tier.id ? "text-slate-200" : "text-slate-700"}>{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                type="button"
                                disabled={paying}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTier(tier.id);
                                    handlePremiumPay(tier);
                                }}
                                className={`mt-6 w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-50 ${
                                    selectedTier === tier.id
                                        ? "bg-cyan-400 text-slate-900 hover:bg-cyan-300"
                                        : "bg-cyan-600 text-white hover:bg-cyan-700"
                                }`}
                            >
                                {paying && selectedTier === tier.id ? "Procesando..." : isLoggedIn ? `Pagar $${tier.price}/mes` : "Crear cuenta y pagar"}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-center ring-1 ring-slate-200">
                    <p className="text-xs text-slate-500">
                        <strong>Usuarios nuevos:</strong> Tus primeros 6 meses de cobertura son gratis. El cobro del plan Premium inicia a partir del mes 7.
                    </p>
                </div>
            </div>

            <div className="mt-12 rounded-2xl bg-slate-50 p-6 text-center ring-1 ring-slate-200">
                <p className="text-sm text-slate-600">
                    ¿Tienes dudas? <Link to="/contacto" className="font-semibold text-cyan-600 hover:text-cyan-700">Escríbenos</Link> y te asesoramos sin compromiso.
                </p>
            </div>
        </section>
    );
}
