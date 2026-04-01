import SectionHeading from "../components/SectionHeading";
import BentoCard from "../components/BentoCard";

export default function Services() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <SectionHeading
        eyebrow="Lo que hacemos"
        title="Servicios diseñados para escalar"
        description="Tarjetas tipo Bento: asimétricas, limpias y con intención. Todo enfocado a confianza y ejecución."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <BentoCard
            icon="🧩"
            title="Plataformas a medida"
            description="Sistemas web para gestión, control y operación. Interfaces claras, arquitectura escalable."
            highlight
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Paneles de administración",
                "Gestión de usuarios y roles (Fase 2)",
                "Dashboards visuales",
                "Flujos operativos",
              ].map((t) => (
                <div
                  key={t}
                  className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                >
                  <p className="text-sm font-semibold text-slate-900">{t}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    UI premium ahora, integración real en Fase 2.
                  </p>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>

        <div className="lg:col-span-5 grid gap-6">
          <BentoCard
            icon="⚡"
            title="Automatización"
            description="Integramos herramientas para reducir tiempo y errores. Procesos más rápidos, resultados consistentes."
          >
            <div className="mt-1 flex flex-wrap gap-2">
              {["Integraciones", "Flujos", "Alertas", "Reportes"].map((b) => (
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
            icon="🌐"
            title="Web corporativa"
            description="Landing pages y sitios con look SaaS. Identidad sólida, confianza inmediata."
          >
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-500">Enfoque</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Conversión + claridad + diseño limpio
              </p>
            </div>
          </BentoCard>
        </div>

        <div className="lg:col-span-12">
          <BentoCard
            icon="🛰️"
            title="Proceso Soyuz"
            description="De idea a entrega: claridad, comunicación y un producto que se siente premium."
            highlight
          >
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { t: "1) Descubrimiento", d: "Objetivos, alcance, prioridades." },
                { t: "2) Diseño UI", d: "Estructura SaaS + Bento." },
                { t: "3) Implementación", d: "Frontend sólido (Fase 1)." },
                { t: "4) Integración", d: "Backend y DB (Fase 2)." },
              ].map((x) => (
                <div
                  key={x.t}
                  className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
                >
                  <p className="text-sm font-semibold text-slate-900">{x.t}</p>
                  <p className="mt-1 text-sm text-slate-600">{x.d}</p>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}