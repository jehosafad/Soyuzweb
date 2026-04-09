import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import BentoCard from "../components/BentoCard";
import Button from "../components/Button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toReadableServiceType(serviceType) {
  const map = {
    web_platform: "Plataforma web",
    web_app: "Aplicación web",
    landing_page: "Landing page",
    ecommerce: "E-commerce",
    crm: "CRM",
    dashboard: "Dashboard",
    maintenance: "Mantenimiento",
    ui_ux: "UI/UX",
    branding: "Branding",
  };
  return map[serviceType] || serviceType || "Desarrollo";
}

function serviceIcon(serviceType) {
  const icons = {
    web_platform: "🏗️",
    web_app: "⚡",
    landing_page: "🎯",
    ecommerce: "🛒",
    crm: "📊",
    dashboard: "📈",
    maintenance: "🔧",
    ui_ux: "🎨",
    branding: "✨",
  };
  return icons[serviceType] || "💼";
}

// ─── Componentes de estado ────────────────────────────────────────────────────

function SkeletonCard() {
  return (
      <div className="animate-pulse rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-5/6 rounded bg-slate-100" />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <div className="h-6 w-20 rounded-full bg-slate-100" />
          <div className="h-6 w-16 rounded-full bg-slate-100" />
        </div>
      </div>
  );
}

function EmptyPortfolio() {
  return (
      <div className="col-span-full flex flex-col items-center rounded-3xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-200">
        <span className="text-5xl" aria-hidden="true">🚀</span>
        <p className="mt-5 text-lg font-semibold text-slate-900">
          Proyectos en camino
        </p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
          Muy pronto publicaremos los primeros casos de éxito de Soyuz. ¿Quieres ser el primero?
        </p>
        <Button as={Link} to="/contacto" variant="primary" className="mt-8">
          Cotizar mi proyecto
        </Button>
      </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Portfolio() {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"

  useEffect(() => {
    let cancelled = false;

    async function fetchPortfolio() {
      setStatus("loading");

      try {
        const response = await fetch("/api/public/portfolio", {
          method: "GET",
          headers: { "Cache-Control": "no-store" },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const raw = await response.text();
        const data = raw ? JSON.parse(raw) : null;

        if (!cancelled) {
          setProjects(data?.data || []);
          setStatus("success");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setProjects([]);
        }
      }
    }

    void fetchPortfolio();

    return () => {
      cancelled = true;
    };
  }, []);

  // Proyecto destacado = el primero de la lista (el más reciente)
  const featured = projects[0] || null;
  const rest = projects.slice(1);

  return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <SectionHeading
            eyebrow="Portafolio"
            title="Proyectos y casos de éxito"
            description="Proyectos reales entregados y desplegados por Agencia Soyuz. Cada uno representa un cliente real con necesidades concretas y resultados medibles."
        />

        {/* Estado de carga */}
        {status === "loading" ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((n) => (
                  <SkeletonCard key={n} />
              ))}
            </div>
        ) : null}

        {/* Estado de error — degradación elegante a mensaje limpio */}
        {status === "error" ? (
            <div className="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">
                No se pudo cargar el portafolio en este momento. Inténtalo de nuevo más tarde.
              </p>
              <Button
                  as={Link}
                  to="/contacto"
                  variant="primary"
                  className="mt-6"
              >
                Contáctanos directamente
              </Button>
            </div>
        ) : null}

        {/* Portafolio dinámico */}
        {status === "success" ? (
            <>
              {projects.length === 0 ? (
                  <div className="mt-10 grid">
                    <EmptyPortfolio />
                  </div>
              ) : (
                  <>
                    {/* Bento destacado */}
                    {featured ? (
                        <div className="mt-10 grid gap-6 lg:grid-cols-12">
                          <div className="lg:col-span-7">
                            <BentoCard
                                icon={serviceIcon(featured.service_type)}
                                title={featured.name}
                                description={
                                    featured.description ||
                                    "Proyecto entregado y desplegado con éxito por Agencia Soyuz."
                                }
                                highlight
                            >
                              <div className="grid gap-3 sm:grid-cols-2">
                                {[
                                  { label: "Tipo", value: toReadableServiceType(featured.service_type) },
                                  { label: "Estado", value: featured.status === "deployed" ? "Desplegado" : "Entregado" },
                                  { label: "Actualizado", value: featured.updated_at ? new Date(featured.updated_at).toLocaleDateString("es-MX", { month: "short", year: "numeric" }) : "—" },
                                  { label: "ID", value: `Proyecto #${featured.id}` },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                                    >
                                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {item.label}
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-slate-900">
                                        {item.value}
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
                                title="Nuestro enfoque"
                                description="Claridad, consistencia visual y estructura profesional en cada entrega."
                            >
                              <div className="mt-2 flex flex-wrap gap-2">
                                {["DevSecOps", "React", "Node.js", "TailwindCSS"].map((b) => (
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
                                icon="🛡️"
                                title="Garantía incluida"
                                description="Cada proyecto entregado incluye 6 meses de mantenimiento y soporte operativo."
                            >
                              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                <p className="text-sm font-semibold text-slate-900">
                                  Portal exclusivo para clientes
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                  Seguimiento en tiempo real, tickets y entregables.
                                </p>
                              </div>
                            </BentoCard>
                          </div>
                        </div>
                    ) : null}

                    {/* Grid del resto */}
                    {rest.length > 0 ? (
                        <div className="mt-10">
                          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {rest.map((project) => (
                                <div
                                    key={project.id}
                                    className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                                                        <span className="text-xl" aria-hidden="true">
                                                            {serviceIcon(project.service_type)}
                                                        </span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">
                                        {project.name}
                                      </p>
                                      <p className="mt-1 text-sm text-slate-600">
                                        {project.description ||
                                            "Proyecto entregado con éxito por Soyuz."}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex flex-wrap gap-2">
                                                    <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                                        {toReadableServiceType(project.service_type)}
                                                    </span>
                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                        {project.status === "deployed"
                                                            ? "Desplegado"
                                                            : "Entregado"}
                                                    </span>
                                  </div>

                                  <div className="mt-6">
                                    <Button
                                        variant="secondary"
                                        className="w-full"
                                        as={Link}
                                        to="/contacto"
                                    >
                                      Cotizar similar
                                    </Button>
                                  </div>
                                </div>
                            ))}
                          </div>
                        </div>
                    ) : null}
                  </>
              )}
            </>
        ) : null}

        {/* CTA final — siempre visible */}
        <div className="mt-16 rounded-3xl bg-slate-900 p-8 text-center text-white">
          <p className="text-lg font-semibold">¿Tienes un proyecto en mente?</p>
          <p className="mt-2 text-sm text-slate-400">
            Cuéntanos qué necesitas y construimos algo igual de sólido para ti.
          </p>
          <Button
              as={Link}
              to="/contacto"
              variant="primary"
              className="mt-6"
          >
            Hablar con el equipo
          </Button>
        </div>
      </section>
  );
}