import { useEffect, useMemo, useState } from "react";

function clearSession() {
    localStorage.removeItem("soyuz_access_token");
    localStorage.removeItem("soyuz_user");
    localStorage.removeItem("soyuz_admin_token");
}

function getStoredToken() {
    const token = localStorage.getItem("soyuz_access_token");
    if (!token || token === "undefined" || token === "null") return null;
    return token;
}

function decodeJwtPayload(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(
            base64.length + ((4 - (base64.length % 4)) % 4),
            "="
        );

        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

function getSession() {
    const token = getStoredToken();
    if (!token) return null;

    const payload = decodeJwtPayload(token);
    if (!payload) {
        clearSession();
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
        clearSession();
        return null;
    }

    return {
        token,
        user: {
            id: payload.sub || payload.id || null,
            email: payload.email || "",
            role: payload.role || "",
        },
    };
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

function toReadableStatus(status) {
    const map = {
        open: "Abierta",
        pending: "Pendiente",
        resolved: "Resuelta",
        archived: "Archivado",
        censored: "Censurado",
        deleted: "Eliminado",
        active: "Activa",
        inactive: "Inactiva",
        paused: "Pausada",
        cancelled: "Cancelada",
        in_development: "En desarrollo",
        analysis: "Análisis",
        qa: "QA",
        deployed: "Desplegado",
        delivered: "Entregado",
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

function getEffectiveCoveragePercent(subscriptionDraft) {
    if (!subscriptionDraft) return 0;

    const isPremiumActive =
        String(subscriptionDraft.planName || "").toLowerCase() === "premium" &&
        String(subscriptionDraft.status || "").toLowerCase() === "active";

    if (isPremiumActive) return 100;

    const raw = Number(subscriptionDraft.coveragePercent || 0);

    if (!Number.isFinite(raw)) return 0;

    return Math.max(0, Math.min(100, raw));
}

function parseApiResponse(response) {
    return response.text().then((raw) => (raw ? JSON.parse(raw) : null));
}

function MetricCard({ label, value, hint }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
                {label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className="mt-2 text-sm text-slate-600">{hint}</p>
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

function SectionCard({ title, description, children, className = "" }) {
    return (
        <section
            className={`rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200 ${className}`.trim()}
        >
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            ) : null}
            <div className="mt-4">{children}</div>
        </section>
    );
}

function EmptyBlock({ title, description }) {
    return (
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
    );
}

export default function AdminDashboard() {
    const session = getSession();

    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");

    const [crmData, setCrmData] = useState({
        summary: {
            leads: 0,
            clients: 0,
            projects: 0,
            openTickets: 0,
            pendingTickets: 0,
            resolvedTickets: 0,
            linkedQuotes: 0,
            premiumClients: 0,
        },
        sections: {
            leads: [],
            supportRequests: [],
        },
    });

    const [clientsData, setClientsData] = useState({
        total: 0,
        items: [],
    });

    const [projectsData, setProjectsData] = useState({
        total: 0,
        items: [],
    });

    const [quotesData, setQuotesData] = useState({
        total: 0,
        items: [],
    });

    const [savingId, setSavingId] = useState(null);
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");

    const [responseDrafts, setResponseDrafts] = useState({});
    const [responseStatusDrafts, setResponseStatusDrafts] = useState({});
    const [quoteDrafts, setQuoteDrafts] = useState({});
    const [leadDrafts, setLeadDrafts] = useState({});
    const [clientSubscriptionDrafts, setClientSubscriptionDrafts] = useState({});
    const [projectDrafts, setProjectDrafts] = useState({});

    // ── Sprint 12: Archivos entregables ──────────────────────────────────────
    const [fileUploadDrafts, setFileUploadDrafts] = useState({});
    const [uploadingFileId, setUploadingFileId] = useState(null);
    const [deletingFileId, setDeletingFileId] = useState(null);
    const [downloadingFileId, setDownloadingFileId] = useState(null);

    // ── Sprint 12: Portafolio público ────────────────────────────────────────
    const [portfolioTogglingId, setPortfolioTogglingId] = useState(null);

    async function loadAllData() {
        if (!session?.token) {
            clearSession();
            window.location.replace("/login");
            return;
        }

        setStatus("loading");
        setError("");

        try {
            const [crmResponse, clientsResponse, projectsResponse, quotesResponse] = await Promise.all([
                fetch("/api/admin/crm-overview", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${session.token}`,
                    },
                }),
                fetch("/api/admin/clients", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${session.token}`,
                    },
                }),
                fetch("/api/admin/projects", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${session.token}`,
                    },
                }),
                fetch("/api/admin/quotes", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${session.token}`,
                    },
                }),
            ]);

            const [crmJson, clientsJson, projectsJson, quotesJson] = await Promise.all([
                parseApiResponse(crmResponse),
                parseApiResponse(clientsResponse),
                parseApiResponse(projectsResponse),
                parseApiResponse(quotesResponse),
            ]);

            if (
                crmResponse.status === 401 ||
                clientsResponse.status === 401 ||
                projectsResponse.status === 401 ||
                quotesResponse.status === 401
            ) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!crmResponse.ok) {
                throw new Error(crmJson?.message || `Error HTTP ${crmResponse.status}`);
            }

            if (!clientsResponse.ok) {
                throw new Error(clientsJson?.message || `Error HTTP ${clientsResponse.status}`);
            }

            if (!projectsResponse.ok) {
                throw new Error(projectsJson?.message || `Error HTTP ${projectsResponse.status}`);
            }

            if (!quotesResponse.ok) {
                throw new Error(quotesJson?.message || `Error HTTP ${quotesResponse.status}`);
            }

            const nextCrmData =
                crmJson?.data || {
                    summary: {
                        leads: 0,
                        clients: 0,
                        projects: 0,
                        openTickets: 0,
                        pendingTickets: 0,
                        resolvedTickets: 0,
                        linkedQuotes: 0,
                        premiumClients: 0,
                    },
                    sections: {
                        leads: [],
                        supportRequests: [],
                    },
                };

            const nextClientsData =
                clientsJson?.data || {
                    total: 0,
                    items: [],
                };

            const nextProjectsData =
                projectsJson?.data || {
                    total: 0,
                    items: [],
                };

            const nextQuotesData =
                quotesJson?.data || {
                    total: 0,
                    items: [],
                };

            setCrmData(nextCrmData);
            setClientsData(nextClientsData);
            setProjectsData(nextProjectsData);
            setQuotesData(nextQuotesData);

            const nextTickets = nextCrmData.sections?.supportRequests || [];
            const nextLeads = nextCrmData.sections?.leads || [];
            const nextClients = nextClientsData.items || [];
            const nextProjects = nextProjectsData.items || [];

            setResponseDrafts((prev) => {
                const next = { ...prev };
                nextTickets.forEach((item) => {
                    if (next[item.id] === undefined) {
                        next[item.id] = item.admin_response || "";
                    }
                });
                return next;
            });

            setResponseStatusDrafts((prev) => {
                const next = { ...prev };
                nextTickets.forEach((item) => {
                    if (next[item.id] === undefined) {
                        next[item.id] = item.status || "pending";
                    }
                });
                return next;
            });

            setQuoteDrafts((prev) => {
                const next = { ...prev };
                nextTickets.forEach((item) => {
                    if (next[item.id] === undefined) {
                        next[item.id] = {
                            title: item.summary || "",
                            description: "",
                            amountCents: "",
                            expiresAt: "",
                        };
                    }
                });
                return next;
            });

            setLeadDrafts((prev) => {
                const next = { ...prev };
                nextLeads.forEach((item) => {
                    if (next[item.id] === undefined) {
                        next[item.id] = {
                            adminStatus: item.admin_status || "open",
                            adminNote: item.admin_note || "",
                        };
                    }
                });
                return next;
            });

            setClientSubscriptionDrafts((prev) => {
                const next = { ...prev };
                nextClients.forEach((item) => {
                    if (next[item.id] === undefined) {
                        next[item.id] = {
                            planName: item.plan_name || "Standard",
                            status: item.subscription_status || "inactive",
                            coveragePercent:
                                item.coverage_percent === null || item.coverage_percent === undefined
                                    ? 0
                                    : item.coverage_percent,
                            startsAt: item.starts_at ? String(item.starts_at).slice(0, 10) : "",
                            endsAt: item.ends_at ? String(item.ends_at).slice(0, 10) : "",
                        };
                    }
                });
                return next;
            });

            setProjectDrafts((prev) => {
                const next = { ...prev };
                nextProjects.forEach((item) => {
                    if (next[item.id] === undefined) {
                        next[item.id] = {
                            status: item.status || "pending",
                            deliveryEta: item.delivery_eta ? String(item.delivery_eta).slice(0, 10) : "",
                            note: item.latest_note || "",
                        };
                    }
                });
                return next;
            });

            setStatus("success");
        } catch (err) {
            setError(err.message || "No se pudo cargar el panel.");
            setStatus("error");
        }
    }

    useEffect(() => {
        void loadAllData();
    }, [session?.token]);

    async function handleLeadSave(leadId) {
        const draft = leadDrafts[leadId];
        if (!draft) return;

        setSavingId(`lead-${leadId}`);
        setActionError("");
        setActionSuccess("");

        try {
            const response = await fetch(`/api/admin/leads/${leadId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    adminStatus: draft.adminStatus,
                    adminNote: draft.adminNote,
                }),
            });

            const data = await parseApiResponse(response);

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            setActionSuccess("Contacto actualizado correctamente.");
            await loadAllData();
        } catch (err) {
            setActionError(err.message || "No se pudo actualizar el contacto.");
        } finally {
            setSavingId(null);
        }
    }

    async function handleStatusChange(requestId, nextStatus) {
        setSavingId(`ticket-status-${requestId}`);
        setActionError("");
        setActionSuccess("");

        try {
            const response = await fetch(`/api/admin/support-requests/${requestId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    status: nextStatus,
                }),
            });

            const data = await parseApiResponse(response);

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            setActionSuccess("Estado actualizado correctamente.");
            await loadAllData();
        } catch (err) {
            setActionError(err.message || "No se pudo actualizar la solicitud.");
        } finally {
            setSavingId(null);
        }
    }

    async function handleResponseSubmit(requestId) {
        setSavingId(`ticket-response-${requestId}`);
        setActionError("");
        setActionSuccess("");

        try {
            const response = await fetch(`/api/admin/support-requests/${requestId}/respond`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    adminResponse: responseDrafts[requestId] || "",
                    status: responseStatusDrafts[requestId] || "pending",
                }),
            });

            const data = await parseApiResponse(response);

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            setActionSuccess("Respuesta guardada correctamente.");
            await loadAllData();
        } catch (err) {
            setActionError(err.message || "No se pudo guardar la respuesta.");
        } finally {
            setSavingId(null);
        }
    }

    async function handleQuoteSubmit(requestId) {
        const draft = quoteDrafts[requestId] || {
            title: "",
            description: "",
            amountCents: "",
            expiresAt: "",
        };

        setSavingId(`ticket-quote-${requestId}`);
        setActionError("");
        setActionSuccess("");

        try {
            const response = await fetch("/api/admin/quotes/from-support-request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    supportRequestId: requestId,
                    title: draft.title,
                    description: draft.description,
                    amountCents: Number.parseInt(draft.amountCents, 10),
                    expiresAt: draft.expiresAt || null,
                }),
            });

            const data = await parseApiResponse(response);

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            setActionSuccess("Cotización creada correctamente.");
            setQuoteDrafts((prev) => ({
                ...prev,
                [requestId]: {
                    title: prev[requestId]?.title || "",
                    description: "",
                    amountCents: "",
                    expiresAt: "",
                },
            }));
            await loadAllData();
        } catch (err) {
            setActionError(err.message || "No se pudo crear la cotización.");
        } finally {
            setSavingId(null);
        }
    }

    async function handleSubscriptionSave(clientId) {
        const draft = clientSubscriptionDrafts[clientId];
        if (!draft) return;

        setSavingId(`client-${clientId}`);
        setActionError("");
        setActionSuccess("");

        try {
            const response = await fetch(`/api/admin/clients/${clientId}/subscription`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    planName: draft.planName,
                    status: draft.status,
                    coveragePercent: Number.parseInt(draft.coveragePercent, 10),
                    startsAt: draft.startsAt || null,
                    endsAt: draft.endsAt || null,
                }),
            });

            const data = await parseApiResponse(response);

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            setActionSuccess("Suscripción actualizada correctamente.");
            await loadAllData();
        } catch (err) {
            setActionError(err.message || "No se pudo actualizar la suscripción.");
        } finally {
            setSavingId(null);
        }
    }

    async function handleProjectSave(projectId) {
        const draft = projectDrafts[projectId];
        if (!draft) return;

        setSavingId(`project-${projectId}`);
        setActionError("");
        setActionSuccess("");

        try {
            const response = await fetch(`/api/admin/projects/${projectId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({
                    status: draft.status,
                    deliveryEta: draft.deliveryEta || null,
                    note: draft.note,
                }),
            });

            const data = await parseApiResponse(response);

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            setActionSuccess("Proyecto actualizado correctamente.");
            await loadAllData();
        } catch (err) {
            setActionError(err.message || "No se pudo actualizar el proyecto.");
        } finally {
            setSavingId(null);
        }
    }

    // ── Sprint 12: Toggle visibilidad en portafolio público ──────────────────

    async function handlePortfolioToggle(projectId, currentIsPublic) {
        setPortfolioTogglingId(projectId);
        setActionError("");
        setActionSuccess("");

        try {
            const response = await fetch(`/api/admin/projects/${projectId}/visibility`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({ isPublic: !currentIsPublic }),
            });

            const data = await parseApiResponse(response);

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            setActionSuccess(data?.message || "Visibilidad actualizada.");
            await loadAllData();
        } catch (err) {
            setActionError(err.message || "No se pudo cambiar la visibilidad.");
        } finally {
            setPortfolioTogglingId(null);
        }
    }

    // ── Sprint 12: Subir archivo entregable ──────────────────────────────────

    async function handleFileUpload(projectId) {
        const draft = fileUploadDrafts[projectId];
        if (!draft?.file || !draft?.label?.trim()) return;

        setUploadingFileId(projectId);
        setActionError("");
        setActionSuccess("");

        try {
            const formData = new FormData();
            formData.append("file", draft.file);
            formData.append("downloadLabel", draft.label.trim());

            const response = await fetch(`/api/admin/projects/${projectId}/files`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session.token}` },
                body: formData,
            });

            const data = await parseApiResponse(response);

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            // Limpiar el draft de este proyecto
            setFileUploadDrafts((prev) => {
                const next = { ...prev };
                delete next[projectId];
                return next;
            });

            setActionSuccess("Archivo subido correctamente. El cliente recibirá una notificación.");
            await loadAllData();
        } catch (err) {
            setActionError(err.message || "No se pudo subir el archivo.");
        } finally {
            setUploadingFileId(null);
        }
    }

    // ── Sprint 12: Eliminar archivo entregable ───────────────────────────────

    async function handleFileDelete(fileId, projectId) {
        if (!window.confirm("¿Eliminar este archivo? Esta acción no se puede deshacer.")) return;

        setDeletingFileId(fileId);
        setActionError("");
        setActionSuccess("");

        try {
            const response = await fetch(`/api/admin/projects/${projectId}/files/${fileId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${session.token}` },
            });

            const data = await parseApiResponse(response);

            if (response.status === 401) {
                clearSession();
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `Error HTTP ${response.status}`);
            }

            setActionSuccess("Archivo eliminado correctamente.");
            await loadAllData();
        } catch (err) {
            setActionError(err.message || "No se pudo eliminar el archivo.");
        } finally {
            setDeletingFileId(null);
        }
    }

    // ── Sprint 12: Descarga de archivo (admin) ───────────────────────────────

    async function handleAdminFileDownload(fileId, downloadLabel) {
        setDownloadingFileId(fileId);

        try {
            const response = await fetch(`/api/admin/files/${fileId}/download`, {
                method: "GET",
                headers: { Authorization: `Bearer ${session.token}` },
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

            const cd = response.headers.get("Content-Disposition") || "";
            const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
            const filename = match ? decodeURIComponent(match[1]) : downloadLabel || "archivo";

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
            setActionError(`No se pudo descargar el archivo: ${err.message}`);
        } finally {
            setDownloadingFileId(null);
        }
    }

    const leads = crmData.sections?.leads || [];
    const tickets = crmData.sections?.supportRequests || [];
    const clients = clientsData.items || [];
    const projects = projectsData.items || [];
    const quotes = quotesData.items || [];
    const summary = crmData.summary || {
        leads: 0,
        clients: 0,
        projects: 0,
        openTickets: 0,
        pendingTickets: 0,
        resolvedTickets: 0,
        linkedQuotes: 0,
        premiumClients: 0,
    };

    const quoteSummary = useMemo(
        () => ({
            total: quotes.length,
            pending: quotes.filter((q) => q.status === "pending").length,
            withRequest: quotes.filter((q) => q.source_request_id).length,
        }),
        [quotes]
    );

    return (
        <main className="min-h-screen bg-slate-50">
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
                                Soyuz CRM
                            </p>
                            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                                Panel de Administrador
                            </h1>
                            <p className="mt-3 text-sm text-slate-600">
                                ¡Bienvenido, jefe! 👨‍💻
                            </p>
                        </div>

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

                    <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
                        <MetricCard
                            label="Nuevos Contactos"
                            value={summary.leads}
                            hint="Mensajes recibidos desde el sitio web."
                        />
                        <MetricCard
                            label="Clientes"
                            value={summary.clients}
                            hint="Clientes registrados en la plataforma."
                        />
                        <MetricCard
                            label="Proyectos"
                            value={summary.projects}
                            hint="Proyectos activos en la plataforma."
                        />
                        <MetricCard
                            label="Tickets abiertos"
                            value={summary.openTickets}
                            hint="Solicitudes pendientes por atender."
                        />
                        <MetricCard
                            label="Premium activos"
                            value={summary.premiumClients}
                            hint="Clientes con plan Premium activo."
                        />
                    </div>

                    {actionError ? (
                        <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
                            {actionError}
                        </div>
                    ) : null}

                    {actionSuccess ? (
                        <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700 ring-1 ring-emerald-200">
                            {actionSuccess}
                        </div>
                    ) : null}

                    {status === "loading" ? (
                        <div className="mt-6 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                            <p className="text-sm font-semibold text-slate-900">Cargando panel</p>
                            <p className="mt-2 text-sm text-slate-600">
                                Estamos sincronizando contactos, solicitudes, clientes, proyectos y cotizaciones.
                            </p>
                        </div>
                    ) : null}

                    {status === "error" ? (
                        <div className="mt-6 rounded-2xl bg-red-50 p-5 ring-1 ring-red-200">
                            <p className="text-sm font-semibold text-red-700">No se pudo cargar el panel</p>
                            <p className="mt-2 text-sm text-red-600">{error}</p>
                        </div>
                    ) : null}

                    {status === "success" ? (
                        <>
                            <div className="mt-6 grid gap-6 lg:grid-cols-12">
                                <SectionCard
                                    title="Bandeja de contactos"
                                    description="Mensajes recibidos desde el sitio web."
                                    className="lg:col-span-4"
                                >
                                    {leads.length === 0 ? (
                                        <EmptyBlock
                                            title="Sin contactos recientes"
                                            description="Cuando recibas mensajes del sitio, aparecerán aquí."
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            {leads.map((lead) => (
                                                <article
                                                    key={lead.id}
                                                    className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
                                                >
                                                    <div className="flex flex-col gap-2">
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {lead.subject || "Sin asunto"}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            <StatusBadge>{lead.name || "Sin nombre"}</StatusBadge>
                                                            <StatusBadge>{lead.email}</StatusBadge>
                                                            <StatusBadge>{formatDate(lead.created_at)}</StatusBadge>
                                                            <StatusBadge>{toReadableStatus(lead.admin_status)}</StatusBadge>
                                                        </div>
                                                    </div>

                                                    <p className="mt-3 text-sm leading-6 text-slate-600">
                                                        {lead.message || "Sin mensaje."}
                                                    </p>

                                                    <div className="mt-4 space-y-3">
                                                        <select
                                                            value={leadDrafts[lead.id]?.adminStatus ?? lead.admin_status ?? "open"}
                                                            onChange={(event) =>
                                                                setLeadDrafts((prev) => ({
                                                                    ...prev,
                                                                    [lead.id]: {
                                                                        ...(prev[lead.id] || {
                                                                            adminStatus: lead.admin_status || "open",
                                                                            adminNote: lead.admin_note || "",
                                                                        }),
                                                                        adminStatus: event.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                                        >
                                                            <option value="open">Abierto</option>
                                                            <option value="archived">Archivado</option>
                                                            <option value="censored">Censurado</option>
                                                            <option value="deleted">Eliminado</option>
                                                        </select>

                                                        <textarea
                                                            rows={3}
                                                            value={leadDrafts[lead.id]?.adminNote ?? lead.admin_note ?? ""}
                                                            onChange={(event) =>
                                                                setLeadDrafts((prev) => ({
                                                                    ...prev,
                                                                    [lead.id]: {
                                                                        ...(prev[lead.id] || {
                                                                            adminStatus: lead.admin_status || "open",
                                                                            adminNote: lead.admin_note || "",
                                                                        }),
                                                                        adminNote: event.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            placeholder="Nota administrativa interna"
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
                                                        />

                                                        <button
                                                            type="button"
                                                            disabled={savingId === `lead-${lead.id}`}
                                                            onClick={() => handleLeadSave(lead.id)}
                                                            className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-cyan-300 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                                                        >
                                                            {savingId === `lead-${lead.id}` ? "Guardando..." : "Guardar lead"}
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </SectionCard>

                                <SectionCard
                                    title="Tickets del portal cliente"
                                    description="Soporte, respuesta operativa y conversión a cotización manual."
                                    className="lg:col-span-8"
                                >
                                    {tickets.length === 0 ? (
                                        <EmptyBlock
                                            title="Sin tickets"
                                            description="Cuando un cliente cree una solicitud desde su portal, aparecerá aquí."
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            {tickets.map((item) => (
                                                <article
                                                    key={item.id}
                                                    className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
                                                >
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">
                                                                {item.summary}
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-600">
                                                                {item.details || "Sin detalle adicional."}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            <StatusBadge>{toReadableStatus(item.status)}</StatusBadge>
                                                            <StatusBadge>{formatDate(item.created_at)}</StatusBadge>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                Cliente
                                                            </p>
                                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                                {item.user_email || "—"}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                Proyecto
                                                            </p>
                                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                                {item.project_name || "Sin proyecto vinculado"}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                Usuario
                                                            </p>
                                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                                #{item.user_id}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {item.admin_response ? (
                                                        <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                Respuesta interna enviada
                                                            </p>
                                                            <p className="mt-2 text-sm text-slate-700">{item.admin_response}</p>
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                <StatusBadge>
                                                                    Respondido: {formatDate(item.responded_at)}
                                                                </StatusBadge>
                                                                <StatusBadge>
                                                                    Por: {item.responded_by_email || "admin"}
                                                                </StatusBadge>
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    {item.latest_quote_id ? (
                                                        <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                Última cotización asociada
                                                            </p>
                                                            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                                <p className="text-sm font-semibold text-slate-900">
                                                                    {item.latest_quote_title}
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <StatusBadge>{item.latest_quote_status}</StatusBadge>
                                                                    <StatusBadge>
                                                                        {formatMoney(
                                                                            item.latest_quote_amount_cents,
                                                                            item.latest_quote_currency
                                                                        )}
                                                                    </StatusBadge>
                                                                    <StatusBadge>
                                                                        Expira: {formatDate(item.latest_quote_expires_at)}
                                                                    </StatusBadge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                                                        <label className="text-sm font-medium text-slate-700">
                                                            Cambiar estado
                                                        </label>

                                                        <div className="flex flex-wrap gap-2">
                                                            {["open", "pending", "resolved"].map((nextStatus) => (
                                                                <button
                                                                    key={nextStatus}
                                                                    type="button"
                                                                    disabled={
                                                                        savingId === `ticket-status-${item.id}` ||
                                                                        item.status === nextStatus
                                                                    }
                                                                    onClick={() => handleStatusChange(item.id, nextStatus)}
                                                                    className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    {toReadableStatus(nextStatus)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                                                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                                            <p className="text-sm font-semibold text-slate-900">
                                                                Responder solicitud
                                                            </p>

                                                            <div className="mt-4 space-y-3">
                                <textarea
                                    rows={5}
                                    value={responseDrafts[item.id] ?? ""}
                                    onChange={(event) =>
                                        setResponseDrafts((prev) => ({
                                            ...prev,
                                            [item.id]: event.target.value,
                                        }))
                                    }
                                    placeholder="Escribe una respuesta operativa o comercial."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
                                />

                                                                <select
                                                                    value={responseStatusDrafts[item.id] ?? item.status}
                                                                    onChange={(event) =>
                                                                        setResponseStatusDrafts((prev) => ({
                                                                            ...prev,
                                                                            [item.id]: event.target.value,
                                                                        }))
                                                                    }
                                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                                                >
                                                                    <option value="open">Abierta</option>
                                                                    <option value="pending">Pendiente</option>
                                                                    <option value="resolved">Resuelta</option>
                                                                </select>

                                                                <button
                                                                    type="button"
                                                                    disabled={savingId === `ticket-response-${item.id}`}
                                                                    onClick={() => handleResponseSubmit(item.id)}
                                                                    className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-cyan-300 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                                                                >
                                                                    {savingId === `ticket-response-${item.id}`
                                                                        ? "Guardando..."
                                                                        : "Guardar respuesta"}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                                            <p className="text-sm font-semibold text-slate-900">
                                                                Generar cotización manual
                                                            </p>

                                                            <div className="mt-4 space-y-3">
                                                                <input
                                                                    type="text"
                                                                    value={quoteDrafts[item.id]?.title ?? ""}
                                                                    onChange={(event) =>
                                                                        setQuoteDrafts((prev) => ({
                                                                            ...prev,
                                                                            [item.id]: {
                                                                                ...(prev[item.id] || {
                                                                                    title: "",
                                                                                    description: "",
                                                                                    amountCents: "",
                                                                                    expiresAt: "",
                                                                                }),
                                                                                title: event.target.value,
                                                                            },
                                                                        }))
                                                                    }
                                                                    placeholder="Título de la cotización"
                                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
                                                                />

                                                                <textarea
                                                                    rows={4}
                                                                    value={quoteDrafts[item.id]?.description ?? ""}
                                                                    onChange={(event) =>
                                                                        setQuoteDrafts((prev) => ({
                                                                            ...prev,
                                                                            [item.id]: {
                                                                                ...(prev[item.id] || {
                                                                                    title: "",
                                                                                    description: "",
                                                                                    amountCents: "",
                                                                                    expiresAt: "",
                                                                                }),
                                                                                description: event.target.value,
                                                                            },
                                                                        }))
                                                                    }
                                                                    placeholder="Descripción del servicio o trabajo a realizar."
                                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
                                                                />

                                                                <div className="grid gap-3 sm:grid-cols-2">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        step="1"
                                                                        value={quoteDrafts[item.id]?.amountCents ?? ""}
                                                                        onChange={(event) =>
                                                                            setQuoteDrafts((prev) => ({
                                                                                ...prev,
                                                                                [item.id]: {
                                                                                    ...(prev[item.id] || {
                                                                                        title: "",
                                                                                        description: "",
                                                                                        amountCents: "",
                                                                                        expiresAt: "",
                                                                                    }),
                                                                                    amountCents: event.target.value,
                                                                                },
                                                                            }))
                                                                        }
                                                                        placeholder="Monto en USD (ej: 500)"
                                                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
                                                                    />

                                                                    <input
                                                                        type="date"
                                                                        value={quoteDrafts[item.id]?.expiresAt ?? ""}
                                                                        onChange={(event) =>
                                                                            setQuoteDrafts((prev) => ({
                                                                                ...prev,
                                                                                [item.id]: {
                                                                                    ...(prev[item.id] || {
                                                                                        title: "",
                                                                                        description: "",
                                                                                        amountCents: "",
                                                                                        expiresAt: "",
                                                                                    }),
                                                                                    expiresAt: event.target.value,
                                                                                },
                                                                            }))
                                                                        }
                                                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                                                    />
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    disabled={savingId === `ticket-quote-${item.id}`}
                                                                    onClick={() => handleQuoteSubmit(item.id)}
                                                                    className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                                                                >
                                                                    {savingId === `ticket-quote-${item.id}`
                                                                        ? "Procesando..."
                                                                        : "Crear cotización"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </SectionCard>
                            </div>

                            <div className="mt-6 grid gap-6 lg:grid-cols-12">
                                <SectionCard
                                    title="Gestión de clientes"
                                    description="Rol, cobertura comercial y suscripción del cliente."
                                    className="lg:col-span-6"
                                >
                                    {clients.length === 0 ? (
                                        <EmptyBlock
                                            title="Sin clientes"
                                            description="Cuando existan usuarios con rol user, aparecerán aquí."
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            {clients.map((client) => {
                                                const draft = clientSubscriptionDrafts[client.id] || {
                                                    planName: client.plan_name || "Standard",
                                                    status: client.subscription_status || "inactive",
                                                    coveragePercent:
                                                        client.coverage_percent === null || client.coverage_percent === undefined
                                                            ? 0
                                                            : client.coverage_percent,
                                                    startsAt: client.starts_at ? String(client.starts_at).slice(0, 10) : "",
                                                    endsAt: client.ends_at ? String(client.ends_at).slice(0, 10) : "",
                                                };

                                                const effectiveCoveragePercent = getEffectiveCoveragePercent(draft);

                                                return (
                                                    <article
                                                        key={client.id}
                                                        className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
                                                    >
                                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-900">
                                                                    {client.email}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-600">
                                                                    Cliente #{client.id} · rol {client.role}
                                                                </p>
                                                            </div>

                                                            <div className="flex flex-wrap gap-2">
                                                                <StatusBadge>{draft.planName || "Standard"}</StatusBadge>
                                                                <StatusBadge>
                                                                    {toReadableStatus(draft.status || "inactive")}
                                                                </StatusBadge>
                                                            </div>
                                                        </div>

                                                        <p className="mt-3 text-sm text-slate-600">
                                                            Cobertura efectiva: {effectiveCoveragePercent}%
                                                        </p>

                                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                            <select
                                                                value={draft.planName}
                                                                onChange={(event) =>
                                                                    setClientSubscriptionDrafts((prev) => {
                                                                        const nextPlan = event.target.value;
                                                                        return {
                                                                            ...prev,
                                                                            [client.id]: {
                                                                                ...(prev[client.id] || {
                                                                                    planName: "Standard",
                                                                                    status: "inactive",
                                                                                    coveragePercent: 0,
                                                                                    startsAt: "",
                                                                                    endsAt: "",
                                                                                }),
                                                                                planName: nextPlan,
                                                                                coveragePercent:
                                                                                    nextPlan === "Premium"
                                                                                        ? 100
                                                                                        : (prev[client.id]?.coveragePercent ?? 0),
                                                                            },
                                                                        };
                                                                    })
                                                                }
                                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                                            >
                                                                <option value="Standard">Standard</option>
                                                                <option value="Premium">Premium</option>
                                                            </select>

                                                            <select
                                                                value={draft.status}
                                                                onChange={(event) =>
                                                                    setClientSubscriptionDrafts((prev) => ({
                                                                        ...prev,
                                                                        [client.id]: {
                                                                            ...(prev[client.id] || {
                                                                                planName: "Standard",
                                                                                status: "inactive",
                                                                                coveragePercent: 0,
                                                                                startsAt: "",
                                                                                endsAt: "",
                                                                            }),
                                                                            status: event.target.value,
                                                                        },
                                                                    }))
                                                                }
                                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                                            >
                                                                <option value="active">Activa</option>
                                                                <option value="inactive">Inactiva</option>
                                                                <option value="paused">Pausada</option>
                                                                <option value="cancelled">Cancelada</option>
                                                            </select>

                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="1"
                                                                disabled={String(draft.planName || "").toLowerCase() === "premium"}
                                                                value={effectiveCoveragePercent}
                                                                onChange={(event) =>
                                                                    setClientSubscriptionDrafts((prev) => ({
                                                                        ...prev,
                                                                        [client.id]: {
                                                                            ...(prev[client.id] || {
                                                                                planName: "Standard",
                                                                                status: "inactive",
                                                                                coveragePercent: 0,
                                                                                startsAt: "",
                                                                                endsAt: "",
                                                                            }),
                                                                            coveragePercent: event.target.value,
                                                                        },
                                                                    }))
                                                                }
                                                                placeholder="Cobertura %"
                                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                                            />

                                                            <div className="grid gap-3 sm:grid-cols-2 sm:col-span-2">
                                                                <input
                                                                    type="date"
                                                                    value={draft.startsAt}
                                                                    onChange={(event) =>
                                                                        setClientSubscriptionDrafts((prev) => ({
                                                                            ...prev,
                                                                            [client.id]: {
                                                                                ...(prev[client.id] || {
                                                                                    planName: "Standard",
                                                                                    status: "inactive",
                                                                                    coveragePercent: 0,
                                                                                    startsAt: "",
                                                                                    endsAt: "",
                                                                                }),
                                                                                startsAt: event.target.value,
                                                                            },
                                                                        }))
                                                                    }
                                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                                                />

                                                                <input
                                                                    type="date"
                                                                    value={draft.endsAt}
                                                                    onChange={(event) =>
                                                                        setClientSubscriptionDrafts((prev) => ({
                                                                            ...prev,
                                                                            [client.id]: {
                                                                                ...(prev[client.id] || {
                                                                                    planName: "Standard",
                                                                                    status: "inactive",
                                                                                    coveragePercent: 0,
                                                                                    startsAt: "",
                                                                                    endsAt: "",
                                                                                }),
                                                                                endsAt: event.target.value,
                                                                            },
                                                                        }))
                                                                    }
                                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                                                />
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            disabled={savingId === `client-${client.id}`}
                                                            onClick={() => handleSubscriptionSave(client.id)}
                                                            className="mt-4 inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-cyan-300 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                                                        >
                                                            {savingId === `client-${client.id}`
                                                                ? "Guardando..."
                                                                : "Guardar suscripción"}
                                                        </button>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    )}
                                </SectionCard>

                                <SectionCard
                                    title="Gestión de proyectos"
                                    description="Seguimiento de entrega y estado de cada proyecto."
                                    className="lg:col-span-6"
                                >
                                    {projects.length === 0 ? (
                                        <EmptyBlock
                                            title="Sin proyectos"
                                            description="Cuando existan proyectos vinculados a clientes, aparecerán aquí."
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            {projects.map((project) => (
                                                <article
                                                    key={project.id}
                                                    className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
                                                >
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">
                                                                {project.name}
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-600">
                                                                {project.user_email}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            <StatusBadge>{toReadableServiceType(project.service_type)}</StatusBadge>
                                                            <StatusBadge>{toReadableStatus(project.status)}</StatusBadge>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid gap-3">
                                                        <input
                                                            type="text"
                                                            value={projectDrafts[project.id]?.status ?? project.status}
                                                            onChange={(event) =>
                                                                setProjectDrafts((prev) => ({
                                                                    ...prev,
                                                                    [project.id]: {
                                                                        ...(prev[project.id] || {
                                                                            status: project.status || "pending",
                                                                            deliveryEta: project.delivery_eta
                                                                                ? String(project.delivery_eta).slice(0, 10)
                                                                                : "",
                                                                            note: project.latest_note || "",
                                                                        }),
                                                                        status: event.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            placeholder="Estado del proyecto"
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                                        />

                                                        <input
                                                            type="date"
                                                            value={
                                                                projectDrafts[project.id]?.deliveryEta ??
                                                                (project.delivery_eta
                                                                    ? String(project.delivery_eta).slice(0, 10)
                                                                    : "")
                                                            }
                                                            onChange={(event) =>
                                                                setProjectDrafts((prev) => ({
                                                                    ...prev,
                                                                    [project.id]: {
                                                                        ...(prev[project.id] || {
                                                                            status: project.status || "pending",
                                                                            deliveryEta: project.delivery_eta
                                                                                ? String(project.delivery_eta).slice(0, 10)
                                                                                : "",
                                                                            note: project.latest_note || "",
                                                                        }),
                                                                        deliveryEta: event.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                                        />

                                                        <textarea
                                                            rows={4}
                                                            value={projectDrafts[project.id]?.note ?? project.latest_note ?? ""}
                                                            onChange={(event) =>
                                                                setProjectDrafts((prev) => ({
                                                                    ...prev,
                                                                    [project.id]: {
                                                                        ...(prev[project.id] || {
                                                                            status: project.status || "pending",
                                                                            deliveryEta: project.delivery_eta
                                                                                ? String(project.delivery_eta).slice(0, 10)
                                                                                : "",
                                                                            note: project.latest_note || "",
                                                                        }),
                                                                        note: event.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            placeholder="Nota operativa para el tracking del cliente"
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                                                        />
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <StatusBadge>
                                                            Fase actual: {toReadableStatus(project.latest_phase || project.status)}
                                                        </StatusBadge>
                                                        <StatusBadge>
                                                            ETA: {project.delivery_eta ? formatDate(project.delivery_eta) : "—"}
                                                        </StatusBadge>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        disabled={savingId === `project-${project.id}`}
                                                        onClick={() => handleProjectSave(project.id)}
                                                        className="mt-4 inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-cyan-300 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                                                    >
                                                        {savingId === `project-${project.id}`
                                                            ? "Guardando..."
                                                            : "Guardar proyecto"}
                                                    </button>

                                                    {/* ── Portfolio toggle ── */}
                                                    <div className="mt-4 flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            disabled={portfolioTogglingId === project.id}
                                                            onClick={() =>
                                                                handlePortfolioToggle(project.id, project.is_public)
                                                            }
                                                            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ring-1 transition disabled:cursor-not-allowed disabled:opacity-70 ${
                                                                project.is_public
                                                                    ? "bg-emerald-400 text-slate-900 ring-emerald-300 hover:bg-emerald-300"
                                                                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                                                            }`}
                                                        >
                                                            {portfolioTogglingId === project.id
                                                                ? "Actualizando..."
                                                                : project.is_public
                                                                    ? "✓ Visible en portafolio"
                                                                    : "Oculto del portafolio"}
                                                        </button>
                                                        <span className="text-xs text-slate-500">
                                                            {project.is_public
                                                                ? "Este proyecto aparece en la landing pública."
                                                                : "Solo tú lo ves."}
                                                        </span>
                                                    </div>

                                                    {/* ── Archivos entregados ── */}
                                                    <div className="mt-5">
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            Archivos entregados
                                                        </p>

                                                        {Array.isArray(project.files) && project.files.length > 0 ? (
                                                            <div className="mt-3 space-y-2">
                                                                {project.files.map((file) => (
                                                                    <div
                                                                        key={file.id}
                                                                        className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between"
                                                                    >
                                                                        <div className="min-w-0">
                                                                            <p className="truncate text-sm font-medium text-slate-900">
                                                                                {file.download_label}
                                                                            </p>
                                                                            <p className="mt-0.5 text-xs text-slate-500">
                                                                                {file.original_name} ·{" "}
                                                                                {file.mime_type || "—"} ·{" "}
                                                                                {file.size_bytes
                                                                                    ? `${(file.size_bytes / 1024).toFixed(1)} KB`
                                                                                    : "—"}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                type="button"
                                                                                disabled={downloadingFileId === file.id}
                                                                                onClick={() =>
                                                                                    handleAdminFileDownload(
                                                                                        file.id,
                                                                                        file.download_label
                                                                                    )
                                                                                }
                                                                                className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
                                                                            >
                                                                                {downloadingFileId === file.id
                                                                                    ? "..."
                                                                                    : "⬇"}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                disabled={deletingFileId === file.id}
                                                                                onClick={() =>
                                                                                    handleFileDelete(
                                                                                        file.id,
                                                                                        project.id
                                                                                    )
                                                                                }
                                                                                className="inline-flex items-center justify-center rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100 disabled:opacity-60"
                                                                            >
                                                                                {deletingFileId === file.id
                                                                                    ? "..."
                                                                                    : "✕"}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="mt-2 text-xs text-slate-500">
                                                                Sin archivos subidos a este proyecto.
                                                            </p>
                                                        )}

                                                        {/* Formulario de subida */}
                                                        <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                Subir nuevo archivo
                                                            </p>
                                                            <div className="mt-3 space-y-3">
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        fileUploadDrafts[project.id]?.label ?? ""
                                                                    }
                                                                    onChange={(event) =>
                                                                        setFileUploadDrafts((prev) => ({
                                                                            ...prev,
                                                                            [project.id]: {
                                                                                ...(prev[project.id] || {}),
                                                                                label: event.target.value,
                                                                            },
                                                                        }))
                                                                    }
                                                                    placeholder="Etiqueta visible para el cliente (ej. Manual de usuario)"
                                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
                                                                />
                                                                <input
                                                                    type="file"
                                                                    accept=".pdf,.zip,.rar,.docx,.doc,.xlsx,.xls,.txt,.png,.jpg,.jpeg,.webp,.svg"
                                                                    onChange={(event) =>
                                                                        setFileUploadDrafts((prev) => ({
                                                                            ...prev,
                                                                            [project.id]: {
                                                                                ...(prev[project.id] || {}),
                                                                                file: event.target.files?.[0] || null,
                                                                            },
                                                                        }))
                                                                    }
                                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold focus:border-cyan-400"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        uploadingFileId === project.id ||
                                                                        !fileUploadDrafts[project.id]?.file ||
                                                                        !fileUploadDrafts[project.id]?.label?.trim()
                                                                    }
                                                                    onClick={() =>
                                                                        handleFileUpload(project.id)
                                                                    }
                                                                    className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-cyan-300 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                                                                >
                                                                    {uploadingFileId === project.id
                                                                        ? "Subiendo..."
                                                                        : "Subir archivo"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </SectionCard>
                            </div>

                            <div className="mt-6 grid gap-6 lg:grid-cols-12">
                                <SectionCard
                                    title="Módulo financiero mínimo"
                                    description="Cotizaciones manuales generadas desde tickets y su trazabilidad."
                                    className="lg:col-span-8"
                                >
                                    {quotes.length === 0 ? (
                                        <EmptyBlock
                                            title="Sin cotizaciones"
                                            description="Cuando el equipo genere presupuestos manuales, aparecerán aquí."
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            {quotes.map((quote) => (
                                                <article
                                                    key={quote.id}
                                                    className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
                                                >
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">{quote.title}</p>
                                                            <p className="mt-1 text-sm text-slate-600">
                                                                {quote.description || "Sin descripción adicional."}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            <StatusBadge>{quote.status}</StatusBadge>
                                                            <StatusBadge>
                                                                {formatMoney(quote.amount_cents, quote.currency)}
                                                            </StatusBadge>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                Cliente
                                                            </p>
                                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                                {quote.user_email}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                Proyecto
                                                            </p>
                                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                                {quote.project_name || "Sin proyecto"}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                Ticket origen
                                                            </p>
                                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                                {quote.source_request_id ? `#${quote.source_request_id}` : "—"}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                                Expiración
                                                            </p>
                                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                                {formatDate(quote.expires_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </SectionCard>

                                <SectionCard
                                    title="Resumen general"
                                    description="Vista rápida del estado de tu negocio."
                                    className="lg:col-span-4"
                                >
                                    <div className="space-y-3">
                                        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                                            <p className="text-sm font-semibold text-slate-900">Solicitudes pendientes</p>
                                            <p className="mt-2 text-sm text-slate-600">
                                                {summary.pendingTickets} en seguimiento.
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                                            <p className="text-sm font-semibold text-slate-900">Cotizaciones</p>
                                            <p className="mt-2 text-sm text-slate-600">
                                                {quoteSummary.total} registradas, {quoteSummary.pending} pendientes.
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                                            <p className="text-sm font-semibold text-slate-900">Clientes Premium</p>
                                            <p className="mt-2 text-sm text-slate-600">
                                                {summary.premiumClients} clientes con soporte y mantenimiento incluido.
                                            </p>
                                        </div>
                                    </div>
                                </SectionCard>
                            </div>
                        </>
                    ) : null}
                </div>
            </section>
        </main>
    );
}