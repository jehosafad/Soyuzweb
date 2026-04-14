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
        <div className="h-16 w-16 mx-auto rounded-2xl overflow-hidden ring-1 ring-slate-200"><img src="/logo-soyuz.jpeg" alt="Soyuz" className="h-full w-full object-cover" /></div>
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
  const [status, setStatus] = useState("loading");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminProjects, setAdminProjects] = useState([]);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem("soyuz_access_token");
      if (token) {
        const p = JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
        if (p.role === "admin") setIsAdmin(true);
      }
    } catch {}
  }, []);

  function getToken() { return localStorage.getItem("soyuz_access_token"); }

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const r = await fetch("/api/admin/projects", { headers: { Authorization: `Bearer ${getToken()}` } });
        if (r.ok) { const d = await r.json(); setAdminProjects(d?.data?.items || []); }
      } catch {}
    })();
  }, [isAdmin]);

  async function toggleVis(id, cur) {
    setTogglingId(id);
    try {
      const r = await fetch(`/api/admin/projects/${id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ isPublic: !cur }),
      });
      if (r.ok) {
        setAdminProjects((p) => p.map((x) => x.id === id ? { ...x, is_public: !cur } : x));
        const pr = await fetch("/api/public/portfolio");
        if (pr.ok) { const d = await pr.json(); setProjects(d?.data || []); }
      }
    } catch {}
    setTogglingId(null);
  }

  // ── Media upload + featured ──────────────────────────────
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectMedia, setProjectMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [mediaCaption, setMediaCaption] = useState("");
  const [editDrafts, setEditDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  async function saveProjectInfo(projectId) {
    const draft = editDrafts[projectId];
    if (!draft) return;
    setSaving(true);
    try {
      const impArr = (draft.implementations || "").split(",").map(s => s.trim()).filter(Boolean);
      const r = await fetch(`/api/admin/projects/${projectId}/portfolio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: draft.name || undefined,
          description: draft.description || undefined,
          portfolioDescription: draft.portfolioDescription || undefined,
          implementations: impArr.length > 0 ? impArr : undefined,
        }),
      });
      if (r.ok) {
        const pr = await fetch("/api/admin/projects", { headers: { Authorization: `Bearer ${getToken()}` } });
        if (pr.ok) { const d = await pr.json(); setAdminProjects(d?.data?.items || []); }
        const pub = await fetch("/api/public/portfolio");
        if (pub.ok) { const d = await pub.json(); setProjects(d?.data || []); }
      }
    } catch {}
    setSaving(false);
  }

  async function loadMedia(projectId) {
    try {
      const r = await fetch(`/api/admin/projects/${projectId}/media`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (r.ok) { const d = await r.json(); setProjectMedia(d?.data || []); }
    } catch {}
  }

  async function handleMediaUpload(projectId) {
    const input = document.getElementById(`media-file-${projectId}`);
    if (!input?.files?.[0]) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("media", input.files[0]);
      fd.append("caption", mediaCaption);
      const r = await fetch(`/api/admin/projects/${projectId}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (r.ok) { await loadMedia(projectId); setMediaCaption(""); input.value = ""; }
    } catch {}
    setUploading(false);
  }

  async function deleteMedia(projectId, mediaId) {
    try {
      await fetch(`/api/admin/projects/${projectId}/media/${mediaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      await loadMedia(projectId);
    } catch {}
  }

  async function toggleFeatured(id, cur) {
    setTogglingId(id);
    try {
      const r = await fetch(`/api/admin/projects/${id}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ isFeatured: !cur }),
      });
      if (r.ok) {
        setAdminProjects((p) => p.map((x) => x.id === id ? { ...x, is_featured: !cur } : x));
      }
    } catch {}
    setTogglingId(null);
  }

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

        {/* Panel admin: gestión de portafolio */}
        {isAdmin && adminProjects.length > 0 && (
            <div className="mt-8 rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-700">
              <p className="text-sm font-semibold text-white mb-1">Gestión de portafolio (solo admin)</p>
              <p className="text-xs text-slate-400 mb-4">Visibilidad, casos destacados y multimedia.</p>
              <div className="space-y-3">
                {adminProjects.map((p) => (
                    <div key={p.id} className="rounded-xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.status} · {p.user_email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <button onClick={() => toggleVis(p.id, p.is_public)} disabled={togglingId === p.id}
                                  className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${p.is_public ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30" : "bg-slate-700 text-slate-400 ring-1 ring-slate-600"} disabled:opacity-50`}>
                            {p.is_public ? "🟢 Visible" : "Oculto"}
                          </button>
                          <button onClick={() => toggleFeatured(p.id, p.is_featured)} disabled={togglingId === p.id}
                                  className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${p.is_featured ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30" : "bg-slate-700 text-slate-400 ring-1 ring-slate-600"} disabled:opacity-50`}>
                            {p.is_featured ? "⭐ Destacado" : "No destacado"}
                          </button>
                          <button onClick={() => { if (editingProjectId === p.id) { setEditingProjectId(null); } else { setEditingProjectId(p.id); loadMedia(p.id); setEditDrafts(prev => ({ ...prev, [p.id]: { name: p.name || "", description: p.description || "", portfolioDescription: p.portfolio_description || "", implementations: (p.implementations || []).join(", ") } })); } }}
                                  className="rounded-lg bg-cyan-400/20 px-2 py-1 text-[11px] font-semibold text-cyan-400 ring-1 ring-cyan-400/30 hover:bg-cyan-400/30">
                            {editingProjectId === p.id ? "Cerrar" : "✏️ Editar"}
                          </button>
                        </div>
                      </div>
                      {editingProjectId === p.id && (
                          <div className="border-t border-white/10 bg-white/5 p-4 space-y-4">
                            {/* Editar info */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase text-cyan-400 tracking-wide">Información del proyecto</p>
                              <input type="text" value={editDrafts[p.id]?.name ?? ""}
                                     onChange={(e) => setEditDrafts(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), name: e.target.value } }))}
                                     placeholder="Título" className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-white ring-1 ring-white/10" />
                              <textarea rows={2} value={editDrafts[p.id]?.description ?? ""}
                                        onChange={(e) => setEditDrafts(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), description: e.target.value } }))}
                                        placeholder="Descripción del proyecto" className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-white ring-1 ring-white/10" />
                              <input type="text" value={editDrafts[p.id]?.implementations ?? ""}
                                     onChange={(e) => setEditDrafts(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), implementations: e.target.value } }))}
                                     placeholder="Implementaciones (separar con comas: React, Node.js, PostgreSQL)" className="w-full rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300 ring-1 ring-white/10" />
                              <button onClick={() => saveProjectInfo(p.id)} disabled={saving}
                                      className="rounded-lg bg-cyan-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50">
                                {saving ? "Guardando..." : "Guardar cambios"}
                              </button>
                            </div>

                            {/* Media */}
                            <div>
                              <p className="text-[10px] font-bold uppercase text-cyan-400 tracking-wide mb-2">Fotos y videos ({projectMedia.length})</p>
                              {projectMedia.length > 0 && (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {projectMedia.map((m) => (
                                        <div key={m.id} className="relative rounded-lg overflow-hidden ring-1 ring-white/20 group">
                                          {m.media_type === "image" ? (
                                              <div className="h-20 bg-slate-800 flex items-center justify-center text-xs text-slate-400">🖼 {m.original_name}</div>
                                          ) : (
                                              <div className="h-20 flex items-center justify-center bg-slate-800 text-xs text-slate-400">🎬 {m.original_name}</div>
                                          )}
                                          <p className="px-2 py-1 text-[10px] text-slate-300 truncate">{m.caption || m.original_name}</p>
                                          <button onClick={() => deleteMedia(p.id, m.id)}
                                                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">×</button>
                                        </div>
                                    ))}
                                  </div>
                              )}
                              <div className="flex flex-wrap items-end gap-2">
                                <div className="flex-1 min-w-[150px]">
                                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Foto o video</label>
                                  <input type="file" id={`media-file-${p.id}`} accept="image/*,video/*"
                                         className="w-full rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-cyan-400/20 file:px-2 file:py-1 file:text-xs file:text-cyan-400" />
                                </div>
                                <div className="flex-1 min-w-[100px]">
                                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Descripción</label>
                                  <input type="text" value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} placeholder="Ej: Vista principal"
                                         className="w-full rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 ring-1 ring-white/10" />
                                </div>
                                <button onClick={() => handleMediaUpload(p.id)} disabled={uploading}
                                        className="rounded-lg bg-cyan-400 px-4 py-1.5 text-xs font-bold text-slate-900 hover:bg-cyan-300 disabled:opacity-50">
                                  {uploading ? "Subiendo..." : "Subir"}
                                </button>
                              </div>
                            </div>
                          </div>
                      )}
                    </div>
                ))}
              </div>
            </div>
        )}

        {/* ── Proyectos destacados (estáticos) ── */}
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* CETIS */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="h-52 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
              <img src="/logo-soyuz.jpeg" alt="CETIS" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/20 opacity-80" />
            </div>
            <div className="p-6 space-y-3">
              <h3 className="text-xl font-bold text-slate-900">Plataforma Educativa CETIS</h3>
              <p className="text-sm text-slate-600">
                Sistema integral de gestión académica diseñado para instituciones educativas. Permite la administración de alumnos, docentes, materias, calificaciones y asistencia desde una interfaz web moderna y accesible. Incluye portal de alumnos para consulta de calificaciones y portal administrativo con reportes en tiempo real.
              </p>
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Implementaciones</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Gestión académica", "Portal de alumnos y docentes", "Control de asistencia", "Reportes en tiempo real", "React", "Node.js", "PostgreSQL"].map((t) => (
                      <span key={t} className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[10px] font-medium text-cyan-700 ring-1 ring-cyan-200">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* EntreMaletas */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="h-52 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
              <img src="/logo-soyuz.jpeg" alt="EntreMaletas" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/20 opacity-80" />
            </div>
            <div className="p-6 space-y-3">
              <h3 className="text-xl font-bold text-slate-900">EntreMaletas</h3>
              <p className="text-sm text-slate-600">
                Aplicación multiplataforma para el registro y exploración de experiencias de viaje en forma de bitácoras digitales enriquecidas con texto, fotografías e información de lugar. Disponible como aplicación web y móvil para Android e iOS, con sistema de roles (usuario/administrador), feed de viajes en tiempo real y panel de administración completo.
              </p>
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Implementaciones</p>
                <div className="flex flex-wrap gap-1.5">
                  {["App web + móvil", "Bitácoras de viaje con fotos", "Sistema de roles", "Feed en tiempo real", "Panel de administración", "React", "Node.js", "PostgreSQL"].map((t) => (
                      <span key={t} className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[10px] font-medium text-cyan-700 ring-1 ring-cyan-200">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

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

                              {featured.implementations && featured.implementations.length > 0 && (
                                  <div className="mt-4">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Implementaciones</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {featured.implementations.map((imp) => (
                                          <span key={imp} className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[10px] font-medium text-cyan-700 ring-1 ring-cyan-200">{imp}</span>
                                      ))}
                                    </div>
                                  </div>
                              )}

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

                                  {project.implementations && project.implementations.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-1">
                                        {project.implementations.map((imp) => (
                                            <span key={imp} className="rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-medium text-cyan-700 ring-1 ring-cyan-200">{imp}</span>
                                        ))}
                                      </div>
                                  )}

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