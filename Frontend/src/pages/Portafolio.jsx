import SectionHeading from "../components/SectionHeading";
import BentoCard from "../components/BentoCard";
import Button from "../components/Button";
import { Link } from "react-router-dom";

export default function Portfolio() {
  const projects = [
    {
      icon: "🏫",
      title: "Plataforma CETIS",
      description:
        "Sistema educativo con UI corporativa y estructura lista para módulos y panel.",
      tags: ["UI SaaS", "Bento", "Escalable"],
    },
    {
      icon: "📊",
      title: "Dashboard Operativo",
      description:
        "Panel visual para métricas, reportes y control de procesos (UI-only en Fase 1).",
      tags: ["Dashboard", "Reportes", "Control"],
    },
    {
      icon: "🤝",
      title: "Landing de Servicios",
      description:
        "Sitio corporativo para confianza y conversión, con CTA y estructura clara.",
      tags: ["Conversión", "Brand", "Responsive"],
    },
    {
      icon: "⚙️",
      title: "Automatización de Flujos",
      description:
        "Integraciones para reducir tareas repetitivas. Diseño enfocado a claridad.",
      tags: ["Automatización", "Integraciones", "Eficiencia"],
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <SectionHeading
        eyebrow="Portafolio"
        title="Proyectos y casos"
        description="Presentación tipo Bento. En Fase 1 es estático; en Fase 2 lo conectamos a administración real."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <BentoCard
            icon="⭐"
            title="Proyecto destacado"
            description="Plataforma educativa con enfoque corporativo y escalable."
            highlight
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {["Módulos", "Panel", "Roles (Fase 2)", "Reportes"].map((t) => (
                <div
                  key={t}
                  className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                >
                  <p className="text-sm font-semibold text-slate-900">{t}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Maquetación premium y lista para conectar.
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button as={Link} to="/contacto" variant="primary">
                Cotizar uno similar
              </Button>
              <Button as={Link} to="/" variant="secondary">
                Volver al inicio
              </Button>
            </div>
          </BentoCard>
        </div>

        <div className="lg:col-span-5 grid gap-6">
          <BentoCard
            icon="🧠"
            title="Enfoque"
            description="Claridad, consistencia visual y estructura profesional."
          >
            <div className="mt-2 flex flex-wrap gap-2">
              {["UX", "SaaS UI", "Responsive", "Bento"].map((b) => (
                <span
                  key={b}
                  className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  {b}
                </span>
              ))}
            </div>
          </BentoCard>

          <BentoCard
            icon="🧾"
            title="Entrega"
            description="Diseño + implementación con estructura lista para crecer."
          >
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-900">
                Documentación y orden
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Componentes reutilizables y layout sólido.
              </p>
            </div>
          </BentoCard>
        </div>

        <div className="lg:col-span-12">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((p) => (
              <div
                key={p.title}
                className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                    <span className="text-xl" aria-hidden="true">
                      {p.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {p.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{p.description}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-6">
                  <Button variant="secondary" className="w-full" as="a" href="#">
                    Ver detalle (placeholder)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}