import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import BentoCard from "../components/BentoCard";
import SectionHeading from "../components/SectionHeading";

const CETIS_VIDEO_URL = "https://mpkenonwafhxwnuvoeiz.supabase.co/storage/v1/object/public/soyuz-media/cetis.mp4";
const ENTREMALETAS_VIDEO_URL = "https://mpkenonwafhxwnuvoeiz.supabase.co/storage/v1/object/public/soyuz-media/entremaletas.mp4";
const TIENDA_ZAPATOS_VIDEO_URL = "https://mpkenonwafhxwnuvoeiz.supabase.co/storage/v1/object/public/soyuz-media/tiendadezapatos.mp4";

/* ── Helper: URL de media subido via admin ──────────────────────────────────── */
function mediaUrl(storageKey) {
  if (!storageKey) return null;
  return `https://mpkenonwafhxwnuvoeiz.supabase.co/storage/v1/object/public/soyuz-media/${storageKey}`;
}

/* ── Componente para caso destacado dinámico (media desde API/uploads) ──────── */
function DynamicFeaturedProject({ project }) {
  const implementations = project.implementations || [];
  const description =
      project.portfolio_description ||
      project.description ||
      "Proyecto entregado y desplegado con éxito por Agencia Soyuz.";
  const media = Array.isArray(project.media) ? project.media : [];
  const video = media.find((m) => m.media_type === "video");
  const image = media.find((m) => m.media_type === "image");

  return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
        <SectionHeading
            eyebrow="Caso destacado"
            title={project.name}
            description={description.length > 120 ? description.slice(0, 120) + "…" : description}
        />
        <div className="mt-8 rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-6 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7">
              <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-200">
                {video ? (
                    <video
                        className="h-full w-full"
                        controls
                        preload="metadata"
                        playsInline
                        poster={image ? mediaUrl(image.storage_key) : "/logo-soyuz.jpeg"}
                    >
                      <source src={mediaUrl(video.storage_key)} type="video/mp4" />
                      Tu navegador no soporta video.
                    </video>
                ) : image ? (
                    <img src={mediaUrl(image.storage_key)} alt={project.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <img src="/logo-soyuz.jpeg" alt={project.name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/20 opacity-80" />
                    </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
                <p className="text-xs font-semibold text-slate-500">Implementaciones</p>
                {implementations.length > 0 ? (
                    <ul className="mt-3 grid gap-3">
                      {implementations.map((t) => (
                          <li key={t} className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                            <span className="text-sm font-medium text-slate-800">{t}</span>
                          </li>
                      ))}
                    </ul>
                ) : (
                    <p className="mt-3 text-sm text-slate-600">{description}</p>
                )}
                <div className="mt-6 flex gap-3">
                  <Button as={Link} to="/portafolio" variant="secondary">Ver más proyectos</Button>
                  <Button as={Link} to="/contacto" variant="primary">Quiero uno así</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
}

/* ── Página principal (LANDING) ─────────────────────────────────────────────── */
export default function Home() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/public/featured");
        if (r.ok) {
          const d = await r.json();
          setFeatured(d?.data || []);
        }
      } catch {}
    })();
  }, []);

  return (
      <>
        {/* ═══ HERO ═══ */}
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
                  Automatización y desarrollo web con estética corporativa, ingeniería limpia y resultados medibles.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button as={Link} to="/contacto" variant="primary" className="w-full sm:w-auto px-6 py-3">Cotiza tu proyecto</Button>
                  <Button as={Link} to="/portafolio" variant="secondary" className="w-full sm:w-auto px-6 py-3">Ver portafolio</Button>
                </div>
                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {[
                    { k: "Entrega", v: "Rápida y clara" },
                    { k: "Diseño", v: "SaaS moderno" },
                    { k: "Automatización", v: "Procesos eficientes" },
                  ].map((m) => (
                      <div key={m.k} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-semibold text-slate-500">{m.k}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{m.v}</p>
                      </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SERVICIOS BENTO ═══ */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
          <SectionHeading eyebrow="Lo que hacemos" title="Servicios diseñados para escalar" description="Tarjetas tipo Bento: asimétricas, limpias y con intención. Todo enfocado a confianza y ejecución." />
          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <BentoCard icon="🧩" title="Plataformas a medida" description="Sistemas web para gestión, control y operación. Interfaces claras, arquitectura escalable." highlight>
                <div className="grid gap-3 sm:grid-cols-2">
                  {["Paneles de administración", "Gestión de usuarios y roles", "Dashboards visuales", "Flujos operativos"].map((t) => (
                      <div key={t} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-sm font-semibold text-slate-900">{t}</p>
                        <p className="mt-1 text-xs text-slate-600">UI premium y arquitectura sólida.</p>
                      </div>
                  ))}
                </div>
              </BentoCard>
            </div>
            <div className="lg:col-span-5 grid gap-6">
              <BentoCard icon="⚡" title="Automatización" description="Integramos herramientas para reducir tiempo y errores. Procesos más rápidos, resultados consistentes.">
                <div className="mt-1 flex flex-wrap gap-2">
                  {["Integraciones", "Flujos", "Alertas", "Reportes"].map((b) => (
                      <span key={b} className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{b}</span>
                  ))}
                </div>
              </BentoCard>
              <BentoCard icon="🌐" title="Web corporativa" description="Landing pages y sitios con look SaaS. Identidad sólida, confianza inmediata.">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold text-slate-500">Enfoque</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Conversión + claridad + diseño limpio</p>
                </div>
              </BentoCard>
            </div>
            <div className="lg:col-span-12">
              <BentoCard icon="🛰️" title="Proceso Soyuz" description="De idea a entrega: claridad, comunicación y un producto que se siente premium." highlight>
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    { t: "1) Descubrimiento", d: "Objetivos, alcance, prioridades." },
                    { t: "2) Diseño UI", d: "Estructura SaaS + Bento." },
                    { t: "3) Implementación", d: "Frontend y backend sólidos." },
                    { t: "4) Despliegue", d: "Producción y soporte." },
                  ].map((x) => (
                      <div key={x.t} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                        <p className="text-sm font-semibold text-slate-900">{x.t}</p>
                        <p className="mt-1 text-sm text-slate-600">{x.d}</p>
                      </div>
                  ))}
                </div>
              </BentoCard>
            </div>
          </div>
        </section>

        {/* ═══ CASO DESTACADO — CETIS ═══ */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
          <SectionHeading eyebrow="Caso destacado" title="Plataforma Educativa CETIS" description="Sistema integral de gestión académica para instituciones educativas." />
          <div className="mt-8 rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-200">
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7">
                <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-200">
                  <video className="h-full w-full" autoPlay muted loop controls preload="metadata" playsInline poster="/logo-soyuz.jpeg">
                    <source src={CETIS_VIDEO_URL} type="video/mp4" />
                    Tu navegador no soporta video.
                  </video>
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold text-slate-500">Implementaciones</p>
                  <ul className="mt-3 grid gap-3">
                    {["Gestión académica completa", "Portal de alumnos y docentes", "Control de asistencia", "Reportes en tiempo real", "React + Node.js + PostgreSQL"].map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                          <span className="text-sm font-medium text-slate-800">{t}</span>
                        </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex gap-3">
                    <Button as={Link} to="/portafolio" variant="secondary">Ver más proyectos</Button>
                    <Button as={Link} to="/contacto" variant="primary">Quiero uno así</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CASO DESTACADO — ENTREMALETAS ═══ */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
          <SectionHeading eyebrow="Caso destacado" title="EntreMaletas" description="Tu compañero de viaje digital — bitácoras de viaje multiplataforma." />
          <div className="mt-8 rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-200">
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7">
                <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-200">
                  <video className="h-full w-full" autoPlay muted loop controls preload="metadata" playsInline poster="/logo-soyuz.jpeg">
                    <source src={ENTREMALETAS_VIDEO_URL} type="video/mp4" />
                    Tu navegador no soporta video.
                  </video>
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold text-slate-500">Implementaciones</p>
                  <ul className="mt-3 grid gap-3">
                    {["App web + móvil multiplataforma", "Bitácoras de viaje con fotos", "Sistema de roles (usuario/admin)", "Feed en tiempo real", "Panel de administración", "React + Node.js + PostgreSQL"].map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                          <span className="text-sm font-medium text-slate-800">{t}</span>
                        </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex gap-3">
                    <Button as={Link} to="/portafolio" variant="secondary">Ver más proyectos</Button>
                    <Button as={Link} to="/contacto" variant="primary">Quiero uno así</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CASO DESTACADO — TIENDA DE ZAPATOS ═══ */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
          <SectionHeading eyebrow="Caso destacado" title="Tienda de Zapatos" description="E-commerce moderno para venta de calzado con catálogo dinámico." />
          <div className="mt-8 rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-200">
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7">
                <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-200">
                  <video className="h-full w-full" autoPlay muted loop controls preload="metadata" playsInline poster="/logo-soyuz.jpeg">
                    <source src={TIENDA_ZAPATOS_VIDEO_URL} type="video/mp4" />
                    Tu navegador no soporta video.
                  </video>
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold text-slate-500">Implementaciones</p>
                  <ul className="mt-3 grid gap-3">
                    {["Catálogo de productos dinámico", "Carrito de compras", "Sistema de pagos integrado", "Panel de administración", "Diseño responsive", "React + Node.js + PostgreSQL"].map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                          <span className="text-sm font-medium text-slate-800">{t}</span>
                        </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex gap-3">
                    <Button as={Link} to="/portafolio" variant="secondary">Ver más proyectos</Button>
                    <Button as={Link} to="/contacto" variant="primary">Quiero uno así</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CASOS DESTACADOS DINÁMICOS (agregados desde admin) ═══ */}
        {featured.length > 0 && featured.map((project) => (
            <DynamicFeaturedProject key={project.id} project={project} />
        ))}

        {/* ═══ CTA FINAL ═══ */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-3xl bg-white p-8 sm:p-12 shadow-sm ring-1 ring-slate-200">
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-8">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                  ¿Listo para lanzar algo <span className="text-cyan-500">serio</span>?
                </h3>
                <p className="mt-2 text-slate-600">Hagamos una web premium o un sistema a medida. UI impecable y backend sólido.</p>
              </div>
              <div className="lg:col-span-4 flex lg:justify-end">
                <Button as={Link} to="/contacto" variant="primary" className="w-full lg:w-auto px-6 py-3">Cotizar ahora</Button>
              </div>
            </div>
          </div>
        </section>
      </>
  );
}
