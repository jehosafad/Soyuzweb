import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProjectTimeline from "../components/ProjectTimeline";

function getStoredUser() {
    try {
        const raw = localStorage.getItem("soyuz_user");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function getStoredToken() {
    const token = localStorage.getItem("soyuz_access_token");
    if (!token || token === "undefined" || token === "null") return null;
    return token;
}

function clearSession() {
    localStorage.removeItem("soyuz_access_token");
    localStorage.removeItem("soyuz_user");
    localStorage.removeItem("soyuz_admin_token");
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

function formatMoney(amountCents, currency = "USD") {
    const amount = Number(amountCents || 0) / 100;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(amount);
}

function bytesToHuman(size) {
    const value = Number(size || 0);
    if (!value) return "—";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function toReadableStatus(status) {
    const map = {
        pending: "Pendiente",
        analysis: "Análisis",
        in_development: "En desarrollo",
        qa: "QA",
        deployed: "Desplegado",
        delivered: "Entregado",
        paused: "Pausado",
        cancelled: "Cancelado",
        active: "Activa",
        inactive: "Inactiva",
        open: "Abierta",
        resolved: "Resuelta",
        archived: "Archivado",
        censored: "Censurado",
        deleted: "Eliminado",
    };

    return map[status] || status || "—";
}

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

    return map[serviceType] || serviceType || "—";
}

function getEffectiveCoveragePercent(subscription) {
    if (!subscription) return 0;

    const isPremiumActive =
        String(subscription.plan_name || "").toLowerCase() === "premium" &&
        String(subscription.status || "").toLowerCase() === "active";

    if (isPremiumActive) return 100;

    const raw = Number(subscription.coverage_percent || 0);

    if (!Number.isFinite(raw)) return 0;

    return Math.max(0, Math.min(100, raw));
}

function getWarrantyMeta(warranty) {
    if (!warranty?.starts_at || !warranty?.ends_at) {
        return {
            totalDays: 0,
            elapsedDays: 0,
            remainingDays: 0,
            percentElapsed: 0,
            isExpired: false,
        };
    }

    const start = new Date(warranty.starts_at);
    const end = new Date(warranty.ends_at);
    const now = new Date();

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(1, Math.ceil((end - start) / msPerDay));
    const elapsedDays = Math.max(0, Math.ceil((now - start) / msPerDay));
    const remainingDays = Math.max(0, Math.ceil((end - now) / msPerDay));
    const percentElapsed = Math.max(
        0,
        Math.min(100, Math.round((elapsedDays / totalDays) * 100))
    );

    return {
        totalDays,
        elapsedDays,
        remainingDays,
        percentElapsed,
        isExpired: now > end,
    };
}

function MetricCard({ label, value, hint }) {
    return (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
                {label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className="mt-2 text-sm text-slate-600">{hint}</p>
        </div>
    );
}

function PanelCard({ title, children, className = "" }) {
    return (
        <section
            className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 ${className}`.trim()}
        >
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function EmptyState({ title, description, actionLabel, actionTo = "/contacto" }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

            <Link
                to={actionTo}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-cyan-300 transition hover:bg-cyan-300"
            >
                {actionLabel}
            </Link>
        </div>
    );
}

function LoadingBlock() {
    return (
        <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">Cargando portal</p>
            <p className="mt-2 text-sm text-slate-600">
                Estamos sincronizando tus datos de proyectos, archivos, garantía y cobertura.
            </p>
        </div>
    );
}

function ErrorBlock({ message }) {
    return (
        <div className="rounded-2xl bg-red-50 p-5 ring-1 ring-red-200">
            <p className="text-sm font-semibold text-red-700">No se pudo cargar el portal</p>
            <p className="mt-2 text-sm leading-6 text-red-600">
                {message || "Ocurrió un error inesperado al cargar tu portal."}
            </p>
        </div>
    );
}

function StatusBadge({ children }) {
    return (
        <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
      {children}
    </span>
    );
}

export default function ClientPortal() {
    const user = getStoredUser();

    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");
    const [portalData, setPortalData] = useState({
        summary: {
            messagesCount: 0,
            projectsCount: 0,
            filesCount: 0,
            quotesCount: 0,
        },
        messages: [],
        projects: [],
        deliveredFiles: [],
        activeQuotes: [],
        supportRequests: [],
        warranty: null,
        subscription: null,
        meta: {
            schemaReady: true,
        },
    });

    const [supportForm, setSupportForm] = useState({
        projectId: "",
        summary: "",
        details: "",
    });
    const [submitStatus, setSubmitStatus] = useState("idle");
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");
    const [downloadingFileId, setDownloadingFileId] = useState(null);

    const loadPortal = useCallback(async () => {
        const token = getStoredToken();

        if (!token) {
            clearSession();
            window.location.replace("/login");
            return;
        }

        setStatus("loading");
        setError("");

        try {
            const response = await fetch("/api/client/portal", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const raw = await response.text();
            const data = raw ? JSON.parse(raw) : null;

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            setPortalData(
                data?.data || {
                    summary: {
                        messagesCount: 0,
                        projectsCount: 0,
                        filesCount: 0,
                        quotesCount: 0,
                    },
                    messages: [],
                    projects: [],
                    deliveredFiles: [],
                    activeQuotes: [],
                    supportRequests: [],
                    warranty: null,
                    subscription: null,
                    meta: {
                        schemaReady: true,
                    },
                }
            );
            setStatus("success");
        } catch (err) {
            setError(err.message || "No se pudo cargar el portal.");
            setStatus("error");
        }
    }, []);

    useEffect(() => {
        void loadPortal();
    }, [loadPortal]);

    async function handleFileDownload(fileId, downloadLabel) {
        const token = getStoredToken();
        if (!token) {
            clearSession();
            window.location.replace("/login");
            return;
        }

        setDownloadingFileId(fileId);

        try {
            const response = await fetch(`/api/client/files/${fileId}/download`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                const raw = await response.text();
                const data = raw ? JSON.parse(raw) : null;
                throw new Error(data?.message || `Error al descargar (HTTP ${response.status})`);
            }

            // Obtener nombre del archivo desde la cabecera Content-Disposition
            const cd = response.headers.get("Content-Disposition") || "";
            const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
            const filename = match
                ? decodeURIComponent(match[1])
                : downloadLabel || "archivo_entregable";

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert(`No se pudo descargar el archivo: ${err.message}`);
        } finally {
            setDownloadingFileId(null);
        }
    }

    async function handleSubmitSupportRequest(event) {
        event.preventDefault();

        const token = getStoredToken();
        if (!token) {
            clearSession();
            window.location.replace("/login");
            return;
        }

        setSubmitStatus("loading");
        setSubmitError("");
        setSubmitSuccess("");

        try {
            const response = await fetch("/api/client/support-requests", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    projectId: supportForm.projectId || null,
                    summary: supportForm.summary,
                    details: supportForm.details,
                }),
            });

            const raw = await response.text();
            const data = raw ? JSON.parse(raw) : null;

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            setSupportForm({
                projectId: "",
                summary: "",
                details: "",
            });
            setSubmitStatus("success");
            setSubmitSuccess("Tu solicitud fue registrada correctamente.");
            await loadPortal();
        } catch (err) {
            setSubmitStatus("error");
            setSubmitError(err.message || "No se pudo registrar la solicitud.");
        }
    }

    const summary = useMemo(
        () =>
            portalData?.summary || {
                messagesCount: portalData.messages?.length || 0,
                projectsCount: portalData.projects?.length || 0,
                filesCount: portalData.deliveredFiles?.length || 0,
                quotesCount: portalData.activeQuotes?.length || 0,
            },
        [portalData]
    );

    const messages = portalData?.messages || [];
    const projects = portalData?.projects || [];
    const deliveredFiles = portalData?.deliveredFiles || [];
    const activeQuotes = portalData?.activeQuotes || [];
    const supportRequests = portalData?.supportRequests || [];
    const warranty = portalData?.warranty || null;
    const subscription = portalData?.subscription || null;
    const schemaReady = portalData?.meta?.schemaReady !== false;
    const warrantyMeta = getWarrantyMeta(warranty);

    const linkedQuotesByRequest = useMemo(() => {
        const map = {};
        activeQuotes.forEach((quote) => {
            if (!quote?.source_request_id) return;
            if (!map[quote.source_request_id]) {
                map[quote.source_request_id] = [];
            }
            map[quote.source_request_id].push(quote);
        });
        return map;
    }, [activeQuotes]);

    const isPremium =
        subscription &&
        subscription.plan_name?.toLowerCase() === "premium" &&
        subscription.status?.toLowerCase() === "active";

    const effectiveCoveragePercent = getEffectiveCoveragePercent(subscription);

    return (
        <main className="min-h-screen bg-slate-50">
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
                                Portal del Cliente
                            </p>
                            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                                Bienvenido a Soyuz
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                Desde aquí verás tus mensajes enviados, proyectos activos, archivos
                                entregados, garantía de mantenimiento y estado de suscripción.
                            </p>
                            <p className="mt-3 text-sm text-slate-500">
                                Hola,{" "}
                                <span className="font-medium text-slate-700">{user?.email || "cliente"}</span> 👋
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <a
                                href="#solicitudes-soporte"
                                className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-cyan-300 transition hover:bg-cyan-300"
                            >
                                Solicitar soporte
                            </a>

                            <button
                                onClick={() => {
                                    clearSession();
                                    window.location.replace("/login");
                                }}
                                className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>

                {!schemaReady ? (
                    <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                        <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
                            <p className="text-sm font-semibold text-amber-800">
                                Tu portal se está configurando
                            </p>
                            <p className="mt-2 text-sm leading-6 text-amber-700">
                                Estamos preparando tu espacio. En breve podrás ver toda tu información aquí.
                            </p>
                        </div>
                    </div>
                ) : null}

                <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Mensajes"
                        value={summary.messagesCount}
                        hint="Historial de comunicación con Soyuz."
                    />
                    <MetricCard
                        label="Proyectos"
                        value={summary.projectsCount}
                        hint="Desarrollos activos visibles para este cliente."
                    />
                    <MetricCard
                        label="Archivos"
                        value={summary.filesCount}
                        hint="Entregables disponibles para descarga."
                    />
                    <MetricCard
                        label="Cotizaciones"
                        value={summary.quotesCount}
                        hint="Presupuestos manuales para nuevas modificaciones."
                    />
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-12">
                    <PanelCard title="Mis mensajes" className="lg:col-span-6">
                        {status === "loading" ? <LoadingBlock /> : null}
                        {status === "error" ? <ErrorBlock message={error} /> : null}
                        {status === "success" && messages.length === 0 ? (
                            <EmptyState
                                title="Aún no hay mensajes sincronizados"
                                description="Aquí verás tu historial de mensajes y respuestas con el equipo de Soyuz."
                                actionLabel="Ir a contacto"
                            />
                        ) : null}

                        {status === "success" && messages.length > 0 ? (
                            <div className="space-y-4">
                                {messages.map((item) => (
                                    <article
                                        key={item.id}
                                        className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
                                    >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {item.subject || "Mensaje sin asunto"}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {formatDate(item.created_at)}
                                                </p>
                                            </div>
                                            <StatusBadge>{item.email}</StatusBadge>
                                        </div>

                                        <p className="mt-3 text-sm leading-6 text-slate-600">{item.message}</p>
                                    </article>
                                ))}
                            </div>
                        ) : null}
                    </PanelCard>

                    <PanelCard title="Proyectos activos" className="lg:col-span-6">
                        {status === "loading" ? <LoadingBlock /> : null}
                        {status === "error" ? <ErrorBlock message={error} /> : null}
                        {status === "success" && projects.length === 0 ? (
                            <EmptyState
                                title="No hay proyectos visibles todavía"
                                description="Tus desarrollos en curso aparecerán aquí con estado, fase actual, fecha estimada y progreso operativo."
                                actionLabel="Solicitar actualización"
                            />
                        ) : null}

                        {status === "success" && projects.length > 0 ? (
                            <div className="space-y-4">
                                {projects.map((project) => (
                                    <article
                                        key={project.id}
                                        className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                                                <p className="mt-1 text-sm text-slate-600">
                                                    {project.description || "Sin descripción registrada."}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <StatusBadge>Estado: {toReadableStatus(project.status)}</StatusBadge>
                                                <StatusBadge>
                                                    Fase actual: {toReadableStatus(project.latest_phase || project.status)}
                                                </StatusBadge>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">Servicio</p>
                                                <p className="mt-1 text-sm font-medium text-slate-800">
                                                    {project.service_type || "—"}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">ETA</p>
                                                <p className="mt-1 text-sm font-medium text-slate-800">
                                                    {formatDate(project.delivery_eta)}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                                    Último cambio
                                                </p>
                                                <p className="mt-1 text-sm font-medium text-slate-800">
                                                    {formatDate(project.latest_phase_at)}
                                                </p>
                                            </div>
                                        </div>

                                        {project.latest_note ? (
                                            <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                                    Nota operativa
                                                </p>
                                                <p className="mt-1 text-sm text-slate-700">{project.latest_note}</p>
                                            </div>
                                        ) : null}

                                        <div className="mt-4">
                                            <ProjectTimeline items={project.status_history || []} />
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : null}
                    </PanelCard>

                    <PanelCard title="Archivos entregados" className="lg:col-span-4">
                        {status === "loading" ? <LoadingBlock /> : null}
                        {status === "error" ? <ErrorBlock message={error} /> : null}
                        {status === "success" && deliveredFiles.length === 0 ? (
                            <EmptyState
                                title="Sin archivos disponibles"
                                description="Aquí se listarán entregables, manuales, accesos o documentos asociados a tus proyectos."
                                actionLabel="Solicitar archivos"
                            />
                        ) : null}

                        {status === "success" && deliveredFiles.length > 0 ? (
                            <div className="space-y-4">
                                {deliveredFiles.map((file) => (
                                    <article
                                        key={file.id}
                                        className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                                    >
                                        <p className="text-sm font-semibold text-slate-900">{file.download_label}</p>
                                        <p className="mt-1 text-sm text-slate-600">
                                            {file.project_name || file.original_name}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <StatusBadge>{file.mime_type || "archivo"}</StatusBadge>
                                            <StatusBadge>{bytesToHuman(file.size_bytes)}</StatusBadge>
                                            <StatusBadge>{formatDate(file.created_at)}</StatusBadge>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={downloadingFileId === file.id}
                                            onClick={() => handleFileDownload(file.id, file.download_label)}
                                            className="mt-4 inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-cyan-300 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {downloadingFileId === file.id ? "Descargando..." : "⬇ Descargar"}
                                        </button>
                                    </article>
                                ))}
                            </div>
                        ) : null}
                    </PanelCard>

                    <PanelCard title="Garantía de 6 meses" className="lg:col-span-4">
                        {status === "loading" ? <LoadingBlock /> : null}
                        {status === "error" ? <ErrorBlock message={error} /> : null}

                        {status === "success" && !warranty ? (
                            <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                                <p className="text-sm font-semibold text-slate-900">Garantía no vinculada aún</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    La garantía se activará cuando se registre una entrega real con
                                    su fecha de despliegue y vencimiento.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <StatusBadge>Estado: pendiente</StatusBadge>
                                    <StatusBadge>Cobertura: mantenimiento base</StatusBadge>
                                </div>
                            </div>
                        ) : null}

                        {status === "success" && warranty ? (
                            <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {warranty.project_name || "Garantía activa"}
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                            {warranty.notes || "Cobertura base registrada para este proyecto."}
                                        </p>
                                    </div>

                                    <StatusBadge>
                                        {warrantyMeta.isExpired
                                            ? "Expirada"
                                            : `${warrantyMeta.remainingDays} días restantes`}
                                    </StatusBadge>
                                </div>

                                <div className="mt-4">
                                    <div className="h-3 w-full overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                                        <div
                                            className={`h-full rounded-full ${
                                                warrantyMeta.isExpired ? "bg-red-400" : "bg-cyan-400"
                                            }`}
                                            style={{ width: `${warrantyMeta.percentElapsed}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                        <span>Inicio {formatDate(warranty.starts_at)}</span>
                                        <span>Fin {formatDate(warranty.ends_at)}</span>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-3">
                                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Estado</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">
                                            {toReadableStatus(warranty.status)}
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Cobertura</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">
                                            {isPremium ? "Cobertura completa por plan Premium" : "Mantenimiento base"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </PanelCard>

                    <PanelCard title="Suscripción y cobertura" className="lg:col-span-4">
                        {status === "loading" ? <LoadingBlock /> : null}
                        {status === "error" ? <ErrorBlock message={error} /> : null}

                        {status === "success" && !subscription ? (
                            <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                                <p className="text-sm font-semibold text-slate-900">Sin plan sincronizado</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Si este cliente tiene Premium, aquí mostraremos cobertura completa.
                                    Si es Standard, aparecerán las cotizaciones cuando la garantía expire.
                                </p>
                                <Link
                                    to="/contacto"
                                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-cyan-300 transition hover:bg-cyan-300"
                                >
                                    Consultar cobertura
                                </Link>
                            </div>
                        ) : null}

                        {status === "success" && subscription ? (
                            <div className="space-y-4">
                                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                Plan {subscription.plan_name}
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                                Estado actual de cobertura para mantenimiento y modificaciones.
                                            </p>
                                        </div>

                                        <StatusBadge>
                                            {isPremium ? "Premium activo" : "Standard / sin cobertura total"}
                                        </StatusBadge>
                                    </div>

                                    <div className="mt-4 grid gap-3">
                                        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Estado</p>
                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                {toReadableStatus(subscription.status)}
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                Cobertura
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                {subscription.coverage_percent}%
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                Vigencia
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                {formatDate(subscription.starts_at)} — {formatDate(subscription.ends_at)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {activeQuotes.length > 0 ? (
                                    <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                                        <p className="text-sm font-semibold text-slate-900">Cotizaciones activas</p>

                                        <div className="mt-4 space-y-3">
                                            {activeQuotes.map((quote) => (
                                                <div
                                                    key={quote.id}
                                                    className="rounded-xl bg-white p-4 ring-1 ring-slate-200"
                                                >
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">
                                                                {quote.title}
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-600">
                                                                {quote.description || "Sin descripción adicional."}
                                                            </p>
                                                        </div>

                                                        <StatusBadge>{toReadableStatus(quote.status)}</StatusBadge>
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <StatusBadge>
                                                            {formatMoney(quote.amount_cents, quote.currency)}
                                                        </StatusBadge>
                                                        <StatusBadge>Expira: {formatDate(quote.expires_at)}</StatusBadge>
                                                        {quote.source_request_id ? (
                                                            <StatusBadge>Ligada a ticket #{quote.source_request_id}</StatusBadge>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </PanelCard>
                </div>

                <div className="mt-8">
                    <PanelCard title="Solicitudes y siguiente integración">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div id="solicitudes-soporte" className="space-y-4">
                                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                                    <p className="text-sm font-semibold text-slate-900">
                                        Nueva solicitud de soporte o modificación
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        Usa este formulario para pedir ajustes, soporte o una nueva modificación.
                                        El ticket quedará vinculado a tu cuenta y opcionalmente a un proyecto.
                                    </p>

                                    <form onSubmit={handleSubmitSupportRequest} className="mt-5 space-y-4">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-800">
                                                Proyecto relacionado
                                            </label>
                                            <select
                                                value={supportForm.projectId}
                                                onChange={(event) =>
                                                    setSupportForm((prev) => ({
                                                        ...prev,
                                                        projectId: event.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                            >
                                                <option value="">Sin proyecto específico</option>
                                                {projects.map((project) => (
                                                    <option key={project.id} value={project.id}>
                                                        {project.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-800">
                                                Resumen
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={180}
                                                value={supportForm.summary}
                                                onChange={(event) =>
                                                    setSupportForm((prev) => ({
                                                        ...prev,
                                                        summary: event.target.value,
                                                    }))
                                                }
                                                placeholder="Ej. Ajuste visual en el dashboard del cliente"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-800">
                                                Detalle
                                            </label>
                                            <textarea
                                                rows={5}
                                                maxLength={3000}
                                                value={supportForm.details}
                                                onChange={(event) =>
                                                    setSupportForm((prev) => ({
                                                        ...prev,
                                                        details: event.target.value,
                                                    }))
                                                }
                                                placeholder="Describe el ajuste, error o necesidad operativa con el mayor contexto posible."
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
                                                required
                                            />
                                        </div>

                                        {submitError ? (
                                            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-200">
                                                {submitError}
                                            </div>
                                        ) : null}

                                        {submitSuccess ? (
                                            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
                                                {submitSuccess}
                                            </div>
                                        ) : null}

                                        <button
                                            type="submit"
                                            disabled={submitStatus === "loading"}
                                            className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-cyan-300 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {submitStatus === "loading"
                                                ? "Registrando solicitud..."
                                                : "Enviar solicitud"}
                                        </button>
                                    </form>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                                    <p className="text-sm font-semibold text-slate-900">
                                        Solicitudes de soporte
                                    </p>

                                    {status === "loading" ? (
                                        <p className="mt-3 text-sm text-slate-600">Cargando solicitudes...</p>
                                    ) : null}

                                    {status === "error" ? (
                                        <p className="mt-3 text-sm text-red-600">{error}</p>
                                    ) : null}

                                    {status === "success" && supportRequests.length === 0 ? (
                                        <p className="mt-3 text-sm leading-6 text-slate-600">
                                            Aún no hay solicitudes registradas para este cliente.
                                        </p>
                                    ) : null}

                                    {status === "success" && supportRequests.length > 0 ? (
                                        <div className="mt-4 space-y-3">
                                            {supportRequests.map((request) => {
                                                const linkedQuotes = linkedQuotesByRequest[request.id] || [];

                                                return (
                                                    <div
                                                        key={request.id}
                                                        className="rounded-xl bg-white p-4 ring-1 ring-slate-200"
                                                    >
                                                        <div className="flex flex-wrap gap-2">
                                                            <StatusBadge>{toReadableStatus(request.status)}</StatusBadge>
                                                            <StatusBadge>{formatDate(request.created_at)}</StatusBadge>
                                                        </div>

                                                        <p className="mt-3 text-sm font-semibold text-slate-900">
                                                            {request.summary}
                                                        </p>
                                                        <p className="mt-1 text-sm text-slate-600">
                                                            {request.details || "Sin detalles adicionales."}
                                                        </p>

                                                        {request.admin_response ? (
                                                            <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                    Respuesta de Soyuz
                                                                </p>
                                                                <p className="mt-2 text-sm text-slate-700">
                                                                    {request.admin_response}
                                                                </p>
                                                                <div className="mt-3 flex flex-wrap gap-2">
                                                                    <StatusBadge>
                                                                        Respondido: {formatDate(request.responded_at)}
                                                                    </StatusBadge>
                                                                    <StatusBadge>
                                                                        Por: {request.responded_by_email || "equipo Soyuz"}
                                                                    </StatusBadge>
                                                                </div>
                                                            </div>
                                                        ) : null}

                                                        {linkedQuotes.length > 0 ? (
                                                            <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                    Cotización asociada
                                                                </p>
                                                                <div className="mt-3 space-y-3">
                                                                    {linkedQuotes.map((quote) => (
                                                                        <div
                                                                            key={quote.id}
                                                                            className="rounded-xl bg-white p-3 ring-1 ring-slate-200"
                                                                        >
                                                                            <p className="text-sm font-semibold text-slate-900">
                                                                                {quote.title}
                                                                            </p>
                                                                            <p className="mt-1 text-sm text-slate-600">
                                                                                {quote.description || "Sin descripción adicional."}
                                                                            </p>
                                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                                <StatusBadge>
                                                                                    {formatMoney(quote.amount_cents, quote.currency)}
                                                                                </StatusBadge>
                                                                                <StatusBadge>
                                                                                    {toReadableStatus(quote.status)}
                                                                                </StatusBadge>
                                                                                <StatusBadge>
                                                                                    Expira: {formatDate(quote.expires_at)}
                                                                                </StatusBadge>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                                    <p className="text-sm font-semibold text-slate-900">Tracking en vivo</p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Timeline real por fases con eventos operativos del proyecto.
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                                    <p className="text-sm font-semibold text-slate-900">Garantía operativa</p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Barra de vigencia, días restantes y lectura clara de cobertura.
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                                    <p className="text-sm font-semibold text-slate-900">Premium vs Standard</p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Diferenciación visible entre cobertura total y cotización manual.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </PanelCard>
                </div>
            </section>
        </main>
    );
}