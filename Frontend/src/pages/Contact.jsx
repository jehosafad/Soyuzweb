import { useEffect, useState } from "react";
import SectionHeading from "../components/SectionHeading";
import Button from "../components/Button";
import Input from "../components/Input";

export default function Contact() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
        website: "",
    });
    const [status, setStatus] = useState("idle");
    const [errorMessage, setErrorMessage] = useState("");

    // Auto-rellenar nombre y email si el usuario ya tiene sesión
    useEffect(() => {
        try {
            const raw = localStorage.getItem("soyuz_user");
            if (raw) {
                const u = JSON.parse(raw);
                setFormData((prev) => ({
                    ...prev,
                    name: u.fullName || prev.name,
                    email: u.email || prev.email,
                }));
            }
        } catch {}
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("loading");
        setErrorMessage("");

        try {
            // Como configuraste CORS para el puerto 5173, esto conectará sin problemas
            const res = await fetch("http://localhost:4000/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Error al enviar el mensaje");
            }

            setStatus("success");
            setFormData({ name: "", email: "", subject: "", message: "", website: "" });
        } catch (err) {
            setStatus("error");
            setErrorMessage(err.message);
        }
    };

    return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <SectionHeading
                eyebrow="Contacto"
                title="Cotiza tu proyecto"
                description="Hablemos de tu próxima gran idea. Te responderemos en menos de 24 horas."
            />

            <div className="mt-8 grid gap-6 lg:grid-cols-12">
                {/* Left cards */}
                <div className="lg:col-span-5 grid gap-6">
                    {[
                        {
                            k: "WhatsApp",
                            v: "+52 1 464 207 2356",
                            href: "https://wa.me/5214642072356",
                        },
                        { k: "Email", v: "contacto@soyuz.dev", href: "mailto:contacto@soyuz.dev" },
                        { k: "Horario", v: "Lun–Sab • 9:00–19:00", href: "#" },
                    ].map((c) => (
                        <a
                            key={c.k}
                            href={c.href}
                            target={c.href.startsWith("http") ? "_blank" : undefined}
                            rel={c.href.startsWith("http") ? "noreferrer" : undefined}
                            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
                        >
                            <p className="text-xs font-semibold text-slate-500">{c.k}</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">{c.v}</p>
                            <p className="mt-2 text-sm text-slate-600">
                                Respuesta rápida y seguimiento claro.
                            </p>
                        </a>
                    ))}
                </div>

                {/* Form */}
                <div className="lg:col-span-7">
                    <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-200">
                        {status === "success" ? (
                            <div className="text-center py-10">
                                <span className="text-5xl">🎉</span>
                                <h3 className="mt-4 text-xl font-bold text-slate-900">¡Mensaje enviado!</h3>
                                <p className="mt-2 text-slate-600">Hemos recibido tu información. Nos pondremos en contacto contigo pronto.</p>
                                <Button variant="secondary" className="mt-6" onClick={() => setStatus("idle")}>
                                    Enviar otro mensaje
                                </Button>
                            </div>
                        ) : (
                            <form className="grid gap-5" onSubmit={handleSubmit}>
                                {/* Honeypot Oculto para bots */}
                                <div style={{ display: "none" }} aria-hidden="true">
                                    <label htmlFor="website">Website</label>
                                    <input type="text" name="website" id="website" tabIndex="-1" value={formData.website} onChange={handleChange} />
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <Input label="Nombre" name="name" value={formData.name} onChange={handleChange} placeholder="Tu nombre" required />
                                    <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="tucorreo@ejemplo.com" required />
                                </div>

                                <Input label="Asunto" name="subject" value={formData.subject} onChange={handleChange} placeholder="¿Qué necesitas construir?" required />

                                <label className="block">
                  <span className="block text-sm font-semibold text-slate-900">
                    Mensaje
                  </span>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        className={[
                                            "mt-2 w-full min-h-[140px] rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900",
                                            "ring-1 ring-slate-200 shadow-sm transition",
                                            "placeholder:text-slate-400",
                                            "focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-50",
                                        ].join(" ")}
                                        placeholder="Cuéntame el objetivo, tiempo y referencia visual si tienes."
                                    />
                                </label>

                                {status === "error" && (
                                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-200">
                                        {errorMessage}
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                                    <p className="text-xs text-slate-500">
                                        Al enviar aceptas contacto para seguimiento del proyecto.
                                    </p>
                                    <Button variant="primary" type="submit" disabled={status === "loading"} className="px-6 py-3">
                                        {status === "loading" ? "Enviando..." : "Enviar mensaje"}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}