import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import BentoCard from "../components/BentoCard";
import SectionHeading from "../components/SectionHeading";

const SHOWCASE_PROJECTS = [
  {
    id: "cetis",
    name: "Plataforma Educativa CETIS",
    videoUrl: null,
    implementations: ["Gestión académica", "Portal de alumnos y docentes", "Control de asistencia", "React + Node.js + PostgreSQL"],
  },
  {
    id: "entremaletas",
    name: "EntreMaletas",
    videoUrl: null,
    implementations: ["App web + móvil multiplataforma", "Bitácoras de viaje con fotos", "Sistema de roles (usuario/admin)", "Feed en tiempo real", "React + Node.js + PostgreSQL"],
  },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/public/featured");
        if (r.ok) { const d = await r.json(); setFeatured(d?.data || []); }
      } catch {}
    })();
  }, []);

  console.log("Home se esta renderizando");
  return (
      <>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="rounded-3xl bg-white p-8 sm:p-12 shadow-sm ring-1 ring-slate-200">
              <div className="mx-auto max-w-3xl text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-sm">
                  <img src="/logo-soyuz.jpeg" alt="Soyuz" className="h-full w-full object-cover" />
                </div>

                <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                  <span className="text-cyan-500">Agencia Soyuz</span>
                </h1>
                <p className="mt-4 text-lg text-slate-600">
                  Automatización y desarrollo web con estética corporativa,
                  ingeniería limpia y resultados medibles.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button as={Link} to="/contacto" variant="primary" className="w-full sm:w-auto px-6 py-3">
                    Cotiza tu proyecto
                  </Button>
                  <Button as={Link} to="/portafolio" variant="secondary" className="w-full sm:w-auto px-6 py-3">
                    Ver portafolio
                  </Button>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {[
                    { k: "Entrega", v: "Rápida y clara" },
                    { k: "Diseño", v: "SaaS moderno" },
                    { k: "Automatización", v: "Procesos eficientes" },
                  ].map((m) => (
                      <div
                          key={m.k}
                          className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                      >
                        <p className="text-xs font-semibold text-slate-500">
                          {m.k}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {m.v}
                        </p>
                      </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICIOS - BENTO */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
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

        {/* PROYECTO DESTACADO (placeholder de video) */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
          <SectionHeading
              eyebrow="Caso destacado"
              title="Plataforma educativa (CETIS)"
              description="Aquí puedes colocar tu video o imágenes en /assets. Por ahora dejamos un placeholder premium."
          />

          <div className="mt-8 rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-200">
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7">
                <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200 grid place-items-center">
                  <div className="text-center px-6">
                    <p className="text-sm font-semibold text-slate-900">
                      Placeholder de video/imagen
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Sube el video a <span className="font-semibold">src/assets</span> y lo conectamos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold text-slate-500">Impacto</p>
                  <ul className="mt-3 grid gap-3">
                    {[
                      "Interfaz clara y corporativa",
                      "Estructura lista para panel",
                      "Escalable para módulos",
                      "Optimizado para confianza",
                    ].map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                          <span className="text-sm font-medium text-slate-800">{t}</span>
                        </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex gap-3">
                    <Button as={Link} to="/portafolio" variant="secondary">
                      Ver más proyectos
                    </Button>
                    <Button as={Link} to="/contacto" variant="primary">
                      Quiero uno así
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CASOS DESTACADOS */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <SectionHeading
              eyebrow="Casos destacados"
              title="Proyectos reales de nuestros clientes"
              description="Cada proyecto representa un cliente real con resultados medibles."
          />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {SHOWCASE_PROJECTS.map((p) => (
                <Link key={p.id} to="/portafolio" className="group flex flex-col rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden transition hover:shadow-lg hover:ring-cyan-300">
                  <div className="relative h-48 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center overflow-hidden">
                    {p.videoUrl ? (
                        <div className="flex flex-col items-center gap-2 text-white/80">
                          <span className="grid h-14 w-14 place-items-center rounded-full bg-cyan-400/20 ring-2 ring-cyan-400/40 text-2xl">▶</span>
                          <span className="text-xs text-slate-400">Ver video</span>
                        </div>
                    ) : (
                        <img src="/logo-soyuz.jpeg" alt="Soyuz" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/20 opacity-80" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-cyan-600 transition">{p.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.implementations.map((imp) => (
                          <span key={imp} className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[10px] font-medium text-cyan-700 ring-1 ring-cyan-200">{imp}</span>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <span className="text-xs font-semibold text-cyan-600 group-hover:underline">Ver proyecto →</span>
                    </div>
                  </div>
                </Link>
            ))}
            {featured.map((p) => (
                <Link key={p.id} to="/portafolio" className="group flex flex-col rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden transition hover:shadow-lg hover:ring-cyan-300">
                  <div className="relative h-48 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                    <img src="/logo-soyuz.jpeg" alt="Soyuz" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/20 opacity-80" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-cyan-600 transition">{p.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[10px] font-medium text-cyan-700 ring-1 ring-cyan-200">{p.service_type || "Desarrollo"}</span>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <span className="text-xs font-semibold text-cyan-600 group-hover:underline">Ver proyecto →</span>
                    </div>
                  </div>
                </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button as={Link} to="/portafolio" variant="secondary">Ver todos los proyectos</Button>
          </div>
        </section>
        {/* CTA FINAL */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-3xl bg-white p-8 sm:p-12 shadow-sm ring-1 ring-slate-200">
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-8">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                  ¿Listo para lanzar algo <span className="text-cyan-500">serio</span>?
                </h3>
                <p className="mt-2 text-slate-600">
                  Hagamos una web premium o un sistema a medida. UI impecable hoy; backend sólido en Fase 2.
                </p>
              </div>
              <div className="lg:col-span-4 flex lg:justify-end">
                <Button as={Link} to="/contacto" variant="primary" className="w-full lg:w-auto px-6 py-3">
                  Cotizar ahora
                </Button>
              </div>
            </div>
          </div>
        </section>
      </>
  );
}