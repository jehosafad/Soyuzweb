import SectionHeading from "../components/SectionHeading";
import Button from "../components/Button";
import Input from "../components/Input";

export default function Contact() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <SectionHeading
        eyebrow="Contacto"
        title="Cotiza tu proyecto"
        description="Formulario estático (Fase 1). En Fase 2 conectamos envío real y panel."
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
            <form
              className="grid gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Fase 1: formulario estático. En Fase 2 lo conectamos 🙂");
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Nombre" placeholder="Tu nombre" />
                <Input label="Email" placeholder="tucorreo@ejemplo.com" type="email" />
              </div>

              <Input label="Asunto" placeholder="¿Qué necesitas construir?" />

              <label className="block">
                <span className="block text-sm font-semibold text-slate-900">
                  Mensaje
                </span>
                <textarea
                  className={[
                    "mt-2 w-full min-h-[140px] rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900",
                    "ring-1 ring-slate-200 shadow-sm transition",
                    "placeholder:text-slate-400",
                    "focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-50",
                  ].join(" ")}
                  placeholder="Cuéntame el objetivo, tiempo y referencia visual si tienes."
                />
              </label>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Al enviar aceptas contacto para seguimiento del proyecto.
                </p>
                <Button variant="primary" className="px-6 py-3">
                  Enviar (UI)
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}