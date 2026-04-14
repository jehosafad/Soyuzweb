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

    // ── Stats y Cliente expandido ──────────────────────────────────────────
    const [adminStats, setAdminStats] = useState(null);
    const [expandedClientId, setExpandedClientId] = useState(null);
    const [expandedLeadId, setExpandedLeadId] = useState(null);
    const [expandedTicketId, setExpandedTicketId] = useState(null);

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

            // Stats en segundo plano
            try {
                const statsResp = await fetch("/api/admin/stats", {
                    headers: { Authorization: `Bearer ${session.token}` },
                });
                if (statsResp.ok) {
                    const sj = await statsResp.json();
                    if (sj?.data) setAdminStats(sj.data);
                }
            } catch {}
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
                    isInitialProject: Boolean(draft.isInitialProject),
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
            {/* ── Top nav ──────────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <a href="/" className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition">
                        <span className="grid h-8 w-8 place-items-center rounded-xl overflow-hidden bg-slate-50 ring-1 ring-slate-200">
                            <img src="/logo-soyuz.jpeg" alt="Soyuz" className="h-full w-full object-cover" />
                        </span>
                        Soyuz
                    </a>
                    <div className="flex items-center gap-3">
                        <a href="/" className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">Ir al sitio web</a>
                        <button onClick={() => { clearSession(); window.location.replace("/login"); }} className="rounded-xl px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50">Cerrar sesión</button>
                    </div>
                </div>
            </nav>

            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                    <div>
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
                                        <div className="space-y-2">
                                            {leads.map((lead) => {
                                                const isOpen = expandedLeadId === lead.id;
                                                return (
                                                    <div key={lead.id} className="rounded-2xl ring-1 ring-slate-200 overflow-hidden">
                                                        <button type="button" onClick={() => setExpandedLeadId(isOpen ? null : lead.id)}
                                                                className="flex w-full items-center justify-between bg-white px-4 py-3 text-left transition hover:bg-slate-50">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-slate-900 truncate">{lead.subject || "Sin asunto"}</p>
                                                                <p className="text-xs text-slate-500">{lead.name} · {lead.email} · {formatDate(lead.created_at)}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <StatusBadge>{toReadableStatus(lead.admin_status)}</StatusBadge>
                                                                <span className="text-xs text-slate-400">{isOpen ? "▲" : "▼"}</span>
                                                            </div>
                                                        </button>
                                                        {isOpen && (
                                                            <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                                                                <p className="text-sm text-slate-600">{lead.message || "Sin mensaje."}</p>

                                                                <select
                                                                    value={leadDrafts[lead.id]?.adminStatus ?? lead.admin_status ?? "open"}
                                                                    onChange={(e) => setLeadDrafts((prev) => ({
                                                                        ...prev, [lead.id]: { ...(prev[lead.id] || { adminStatus: lead.admin_status || "open", adminNote: lead.admin_note || "" }), adminStatus: e.target.value },
                                                                    }))}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                                                >
                                                                    <option value="open">Abierto</option>
                                                                    <option value="archived">Archivado</option>
                                                                    <option value="censored">Censurado</option>
                                                                    <option value="deleted">Eliminado</option>
                                                                </select>

                                                                <textarea rows={2}
                                                                          value={leadDrafts[lead.id]?.adminNote ?? lead.admin_note ?? ""}
                                                                          onChange={(e) => setLeadDrafts((prev) => ({
                                                                              ...prev, [lead.id]: { ...(prev[lead.id] || { adminStatus: lead.admin_status || "open", adminNote: lead.admin_note || "" }), adminNote: e.target.value },
                                                                          }))}
                                                                          placeholder="Nota interna"
                                                                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                                                />

                                                                <div className="flex gap-2">
                                                                    <button type="button" disabled={savingId === `lead-${lead.id}`}
                                                                            onClick={async () => { await handleLeadSave(lead.id); setExpandedLeadId(null); }}
                                                                            className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50">
                                                                        {savingId === `lead-${lead.id}` ? "Guardando..." : "Guardar nota"}
                                                                    </button>

                                                                    {lead.admin_status !== "archived" && (
                                                                        <button type="button" disabled={savingId === `accept-${lead.id}`}
                                                                                onClick={async () => {
                                                                                    setSavingId(`accept-${lead.id}`);
                                                                                    setActionError(""); setActionSuccess("");
                                                                                    try {
                                                                                        const resp = await fetch(`/api/admin/leads/${lead.id}/accept`, {
                                                                                            method: "POST",
                                                                                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
                                                                                            body: JSON.stringify({ adminNote: leadDrafts[lead.id]?.adminNote || "" }),
                                                                                        });
                                                                                        const data = await resp.json();
                                                                                        if (resp.ok) {
                                                                                            setActionSuccess(data?.message || "Proyecto creado.");
                                                                                            setExpandedLeadId(null);
                                                                                            await loadAllData();
                                                                                        } else {
                                                                                            setActionError(data?.message || "No se pudo aceptar.");
                                                                                        }
                                                                                    } catch { setActionError("Error de conexión."); }
                                                                                    setSavingId(null);
                                                                                }}
                                                                                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                                                                            {savingId === `accept-${lead.id}` ? "Creando..." : "✓ Aceptar proyecto"}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
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
                                        <div className="space-y-2">
                                            {tickets.map((item) => {
                                                const isTicketOpen = expandedTicketId === item.id;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="rounded-2xl ring-1 ring-slate-200 overflow-hidden"
                                                    >
                                                        <button type="button" onClick={() => setExpandedTicketId(isTicketOpen ? null : item.id)}
                                                                className="flex w-full items-center justify-between bg-white px-4 py-3 text-left transition hover:bg-slate-50">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-slate-900 truncate">{item.summary}</p>
                                                                <p className="text-xs text-slate-500">{item.user_email} · {formatDate(item.created_at)}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <StatusBadge>{toReadableStatus(item.status)}</StatusBadge>
                                                                <span className="text-xs text-slate-400">{isTicketOpen ? "▲" : "▼"}</span>
                                                            </div>
                                                        </button>
                                                        {isTicketOpen && (
                                                            <div className="border-t border-slate-100 bg-slate-50 p-5">
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
                                                                            Generar cotización
                                                                        </p>

                                                                        {/* Bot de cotización */}
                                                                        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-blue-50 p-3 ring-1 ring-blue-200">
                                                                            <div className="flex-1 min-w-[120px]">
                                                                                <label className="block text-[10px] font-semibold text-blue-700 mb-1">Categoría</label>
                                                                                <select
                                                                                    value={quoteDrafts[item.id]?.botCategory ?? "web_app"}
                                                                                    onChange={(e) => setQuoteDrafts((prev) => ({
                                                                                        ...prev,
                                                                                        [item.id]: { ...(prev[item.id] || { title:"", description:"", amountCents:"", expiresAt:"" }), botCategory: e.target.value },
                                                                                    }))}
                                                                                    className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs"
                                                                                >
                                                                                    <option value="landing_page">Landing Page</option>
                                                                                    <option value="web_app">Aplicación Web</option>
                                                                                    <option value="ecommerce">E-commerce</option>
                                                                                    <option value="mobile_app">App Móvil</option>
                                                                                    <option value="automation">Automatización</option>
                                                                                    <option value="maintenance">Mantenimiento</option>
                                                                                    <option value="design">Diseño</option>
                                                                                    <option value="consulting">Consultoría</option>
                                                                                    <option value="other">Otro</option>
                                                                                </select>
                                                                            </div>
                                                                            <div className="flex-1 min-w-[100px]">
                                                                                <label className="block text-[10px] font-semibold text-blue-700 mb-1">Complejidad</label>
                                                                                <select
                                                                                    value={quoteDrafts[item.id]?.botComplexity ?? "medium"}
                                                                                    onChange={(e) => setQuoteDrafts((prev) => ({
                                                                                        ...prev,
                                                                                        [item.id]: { ...(prev[item.id] || { title:"", description:"", amountCents:"", expiresAt:"" }), botComplexity: e.target.value },
                                                                                    }))}
                                                                                    className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs"
                                                                                >
                                                                                    <option value="low">Baja</option>
                                                                                    <option value="medium">Media</option>
                                                                                    <option value="high">Alta</option>
                                                                                </select>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    try {
                                                                                        const resp = await fetch("/api/admin/quote-bot", {
                                                                                            method: "POST",
                                                                                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
                                                                                            body: JSON.stringify({
                                                                                                serviceCategory: quoteDrafts[item.id]?.botCategory || "web_app",
                                                                                                complexity: quoteDrafts[item.id]?.botComplexity || "medium",
                                                                                            }),
                                                                                        });
                                                                                        const data = await resp.json();
                                                                                        if (resp.ok && data?.data?.suggestedPriceUsd) {
                                                                                            const cents = Math.round(data.data.suggestedPriceUsd * 100);
                                                                                            setQuoteDrafts((prev) => ({
                                                                                                ...prev,
                                                                                                [item.id]: { ...(prev[item.id] || { title:"", description:"", expiresAt:"" }), amountCents: String(cents) },
                                                                                            }));
                                                                                            setActionSuccess(`Precio sugerido: $${data.data.suggestedPriceUsd} USD`);
                                                                                        }
                                                                                    } catch { setActionError("Error al consultar el bot."); }
                                                                                }}
                                                                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                                                                            >
                                                                                Sugerir precio
                                                                            </button>
                                                                        </div>

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

                                                                            <label className="flex items-center gap-2 mt-2">
                                                                                <input type="checkbox" checked={Boolean(quoteDrafts[item.id]?.isInitialProject)}
                                                                                       onChange={(e) => setQuoteDrafts((prev) => ({
                                                                                           ...prev, [item.id]: { ...(prev[item.id] || { title:"", description:"", amountCents:"", expiresAt:"" }), isInitialProject: e.target.checked },
                                                                                       }))}
                                                                                       className="rounded border-slate-300" />
                                                                                <span className="text-xs text-slate-600">Cobro de proyecto inicial (ignora cobertura)</span>
                                                                            </label>

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
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </SectionCard>
                            </div>


                            {/* ── CLIENTES REGISTRADOS (expandible) ──────── */}
                            <div className="mt-6">
                                <SectionCard
                                    title="Clientes registrados"
                                    description="Haz clic en un cliente para ver sus proyectos, cotizaciones y suscripción."
                                    className=""
                                >
                                    {clients.length === 0 ? (
                                        <EmptyBlock title="Sin clientes" description="Cuando se registren clientes, aparecerán aquí." />
                                    ) : (
                                        <div className="space-y-2">
                                            {clients.map((client) => {
                                                const isExpanded = expandedClientId === client.id;
                                                const clientProjects = projects.filter((p) => p.user_id === client.id);
                                                const clientQuotes = quotes.filter((q) => q.user_id === client.id);

                                                return (
                                                    <div key={client.id} className="rounded-2xl ring-1 ring-slate-200 overflow-hidden">
                                                        {/* Header clickeable */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                                                            className="flex w-full items-center justify-between bg-white px-5 py-4 text-left transition hover:bg-slate-50"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-slate-900 truncate">{client.email}</p>
                                                                <p className="mt-0.5 text-xs text-slate-500">
                                                                    {client.plan_name || "Standard"} · {client.subscription_status || "Sin suscripción"} · Registrado {formatDate(client.created_at)}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${client.plan_name === "Premium" && client.subscription_status === "active" ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>
                                                                    {client.plan_name || "Standard"}
                                                                </span>
                                                                <span className="text-slate-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                                                            </div>
                                                        </button>

                                                        {/* Panel expandible */}
                                                        {isExpanded && (
                                                            <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-5">
                                                                {/* Suscripción */}
                                                                <div>
                                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Suscripción</p>
                                                                    <div className="grid gap-3 sm:grid-cols-3">
                                                                        {["Standard", "Premium"].map((plan) => (
                                                                            <div key={plan} className="flex items-center gap-2">
                                                                                <select
                                                                                    value={clientSubscriptionDrafts[client.id]?.planName ?? client.plan_name ?? "Standard"}
                                                                                    onChange={(e) => setClientSubscriptionDrafts((prev) => ({
                                                                                        ...prev,
                                                                                        [client.id]: { ...(prev[client.id] || {}), planName: e.target.value },
                                                                                    }))}
                                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                                                                >
                                                                                    <option value="Standard">Standard</option>
                                                                                    <option value="Premium">Premium</option>
                                                                                </select>
                                                                            </div>
                                                                        )).slice(0, 1)}
                                                                        <select
                                                                            value={clientSubscriptionDrafts[client.id]?.status ?? client.subscription_status ?? "inactive"}
                                                                            onChange={(e) => setClientSubscriptionDrafts((prev) => ({
                                                                                ...prev,
                                                                                [client.id]: { ...(prev[client.id] || {}), status: e.target.value },
                                                                            }))}
                                                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                                                        >
                                                                            <option value="active">Activa</option>
                                                                            <option value="inactive">Inactiva</option>
                                                                            <option value="paused">Pausada</option>
                                                                            <option value="cancelled">Cancelada</option>
                                                                        </select>
                                                                        <button
                                                                            type="button"
                                                                            disabled={savingId === `subscription-${client.id}`}
                                                                            onClick={() => handleSubscriptionSave(client.id)}
                                                                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                                                        >
                                                                            {savingId === `subscription-${client.id}` ? "Guardando..." : "Guardar"}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Proyectos del cliente */}
                                                                <div>
                                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                                                                        Proyectos ({clientProjects.length})
                                                                    </p>
                                                                    {clientProjects.length === 0 ? (
                                                                        <p className="text-xs text-slate-400">Este cliente no tiene proyectos asignados.</p>
                                                                    ) : (
                                                                        <div className="space-y-3">
                                                                            {clientProjects.map((project) => (
                                                                                <div key={project.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                                                                                    <div className="flex items-start justify-between">
                                                                                        <div>
                                                                                            <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                                                                                            <p className="mt-0.5 text-xs text-slate-500">{project.service_type} · {toReadableStatus(project.status)}</p>
                                                                                        </div>
                                                                                        {project.is_public && (
                                                                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Público</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                                                                        <select
                                                                                            value={projectDrafts[project.id]?.status ?? project.status}
                                                                                            onChange={(e) => setProjectDrafts((prev) => ({
                                                                                                ...prev,
                                                                                                [project.id]: { ...(prev[project.id] || {}), status: e.target.value },
                                                                                            }))}
                                                                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                                                                                        >
                                                                                            {["pending","analysis","in_development","qa","deployed","delivered"].map((s) => (
                                                                                                <option key={s} value={s}>{toReadableStatus(s)}</option>
                                                                                            ))}
                                                                                        </select>
                                                                                        <input
                                                                                            type="date"
                                                                                            value={projectDrafts[project.id]?.deliveryEta ?? project.delivery_eta?.slice(0, 10) ?? ""}
                                                                                            onChange={(e) => setProjectDrafts((prev) => ({
                                                                                                ...prev,
                                                                                                [project.id]: { ...(prev[project.id] || {}), deliveryEta: e.target.value },
                                                                                            }))}
                                                                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled={savingId === `project-${project.id}`}
                                                                                            onClick={() => handleProjectSave(project.id)}
                                                                                            className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-cyan-300 disabled:opacity-50"
                                                                                        >
                                                                                            {savingId === `project-${project.id}` ? "..." : "Guardar"}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Cotizaciones del cliente */}
                                                                <div>
                                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                                                                        Cotizaciones ({clientQuotes.length})
                                                                    </p>
                                                                    {clientQuotes.length === 0 ? (
                                                                        <p className="text-xs text-slate-400">Sin cotizaciones para este cliente.</p>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {clientQuotes.map((q) => (
                                                                                <div key={q.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                                                                                    <div>
                                                                                        <p className="text-sm font-medium text-slate-900">{q.title}</p>
                                                                                        <p className="text-xs text-slate-500">{formatDate(q.created_at)} · {toReadableStatus(q.status)}</p>
                                                                                    </div>
                                                                                    <p className="text-sm font-bold text-emerald-600">{formatMoney(q.amount_cents, q.currency)}</p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Crear cotización directa */}
                                                                <div>
                                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Crear cotización</p>
                                                                    <div className="grid gap-2 sm:grid-cols-4">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Título"
                                                                            id={`dq-title-${client.id}`}
                                                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                                                                        />
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            step="1"
                                                                            placeholder="Monto USD"
                                                                            id={`dq-amount-${client.id}`}
                                                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                                                                        />
                                                                        <input
                                                                            type="date"
                                                                            id={`dq-expires-${client.id}`}
                                                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                const title = document.getElementById(`dq-title-${client.id}`)?.value || "";
                                                                                const amount = document.getElementById(`dq-amount-${client.id}`)?.value || "0";
                                                                                const expires = document.getElementById(`dq-expires-${client.id}`)?.value || "";
                                                                                if (!title || Number(amount) <= 0) { setActionError("Título y monto son requeridos."); return; }
                                                                                try {
                                                                                    const resp = await fetch("/api/admin/quotes/direct", {
                                                                                        method: "POST",
                                                                                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
                                                                                        body: JSON.stringify({ userId: client.id, title, amountUsd: Number(amount), expiresAt: expires || null }),
                                                                                    });
                                                                                    const data = await resp.json();
                                                                                    if (resp.ok) { setActionSuccess("Cotización creada."); void loadAllData(); }
                                                                                    else setActionError(data?.message || "Error al crear cotización.");
                                                                                } catch { setActionError("Error de conexión."); }
                                                                            }}
                                                                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                                                                        >
                                                                            Crear
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </SectionCard>
                            </div>

                            {/* ── RESUMEN + ESTADÍSTICAS ─────────────────── */}
                            <div className="mt-6 grid gap-6 lg:grid-cols-12">
                                <SectionCard
                                    title="Resumen general"
                                    description="Vista rápida del estado de tu negocio."
                                    className="lg:col-span-4"
                                >
                                    <div className="space-y-3">
                                        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                                            <p className="text-sm font-semibold text-slate-900">Solicitudes pendientes</p>
                                            <p className="mt-2 text-sm text-slate-600">{summary.pendingTickets} en seguimiento.</p>
                                        </div>
                                        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                                            <p className="text-sm font-semibold text-slate-900">Cotizaciones</p>
                                            <p className="mt-2 text-sm text-slate-600">{quoteSummary.total} registradas, {quoteSummary.pending} pendientes.</p>
                                        </div>
                                        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                                            <p className="text-sm font-semibold text-slate-900">Clientes Premium</p>
                                            <p className="mt-2 text-sm text-slate-600">{summary.premiumClients} con soporte incluido.</p>
                                        </div>
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    title="Estadísticas"
                                    description="Distribución de proyectos y actividad."
                                    className="lg:col-span-8"
                                >
                                    {adminStats ? (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                                <p className="text-xs font-semibold text-slate-700 mb-3">Estado de proyectos</p>
                                                <div className="space-y-2">
                                                    {(adminStats.projectStatus || []).map((ps) => {
                                                        const mx = Math.max(...(adminStats.projectStatus || []).map(p => p.count), 1);
                                                        const pct = Math.round((ps.count / mx) * 100);
                                                        const cl = { pending:"bg-amber-400", in_development:"bg-blue-500", qa:"bg-purple-500", deployed:"bg-emerald-500", delivered:"bg-cyan-500" };
                                                        return (<div key={ps.status}><div className="flex justify-between text-[11px] text-slate-600 mb-0.5"><span>{toReadableStatus(ps.status)}</span><span className="font-bold">{ps.count}</span></div><div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden"><div className={`h-full rounded-full ${cl[ps.status]||"bg-slate-400"}`} style={{width:`${pct}%`}} /></div></div>);
                                                    })}
                                                    {(adminStats.projectStatus||[]).length === 0 && <p className="text-xs text-slate-400">Sin datos</p>}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                                <p className="text-xs font-semibold text-slate-700 mb-3">Solicitudes (30 días)</p>
                                                <div className="flex items-end gap-1 h-24">
                                                    {(adminStats.ticketTrend||[]).length > 0 ? adminStats.ticketTrend.map((d) => {
                                                        const mx = Math.max(...adminStats.ticketTrend.map(x=>x.count),1);
                                                        return (<div key={d.day} className="flex-1 bg-blue-500 rounded-t-sm hover:bg-blue-600 transition" style={{height:`${Math.max((d.count/mx)*100,4)}%`}} title={`${d.day}: ${d.count}`} />);
                                                    }) : <p className="text-xs text-slate-400 m-auto">Sin actividad</p>}
                                                </div>
                                                {(adminStats.ticketTrend||[]).length>0 && <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>{adminStats.ticketTrend[0]?.day?.slice(5)}</span><span>{adminStats.ticketTrend.at(-1)?.day?.slice(5)}</span></div>}
                                            </div>
                                            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                                <p className="text-xs font-semibold text-slate-700 mb-1">Ingresos por cotizaciones</p>
                                                <p className="text-2xl font-bold text-emerald-600">${Number(adminStats.revenue?.total_revenue_usd||0).toLocaleString("en-US",{minimumFractionDigits:2})}</p>
                                                <p className="text-[11px] text-slate-500 mt-1">{adminStats.revenue?.paid_count||0} pagadas · {adminStats.revenue?.pending_count||0} pendientes</p>
                                            </div>
                                            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                                <p className="text-xs font-semibold text-slate-700 mb-3">Nuevos clientes</p>
                                                <div className="flex items-end gap-2 h-20">
                                                    {(adminStats.clientGrowth||[]).length>0 ? adminStats.clientGrowth.map((m)=>{
                                                        const mx=Math.max(...adminStats.clientGrowth.map(x=>x.new_clients),1);
                                                        return (<div key={m.month} className="flex-1 flex flex-col items-center gap-0.5"><span className="text-[10px] font-bold text-slate-600">{m.new_clients}</span><div className="w-full bg-cyan-400 rounded-t-sm" style={{height:`${Math.max((m.new_clients/mx)*100,8)}%`}} /><span className="text-[9px] text-slate-400">{m.month?.slice(5)}</span></div>);
                                                    }) : <p className="text-xs text-slate-400 m-auto">Sin datos</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ) : <p className="text-center text-sm text-slate-400 py-6">Cargando estadísticas...</p>}
                                </SectionCard>
                            </div>
                        </>
                    ) : null}
                </div>
            </section>
        </main>
    );
}
