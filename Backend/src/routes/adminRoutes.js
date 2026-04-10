const express = require("express");
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { upload, UPLOADS_DIR } = require("../config/upload");
const {
    sendTicketResponseNotification,
    sendNewQuoteNotification,
    sendProjectPhaseNotification,
    sendNewDeliverableNotification,
} = require("../services/emailService");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

// ─── Constantes de validación ─────────────────────────────────────────────────

const ALLOWED_SUPPORT_STATUSES = new Set(["open", "pending", "resolved"]);
const ALLOWED_LEAD_STATUSES = new Set(["open", "archived", "censored", "deleted"]);
const ALLOWED_PLAN_NAMES = new Set(["Standard", "Premium"]);
const ALLOWED_SUBSCRIPTION_STATUSES = new Set(["active", "inactive", "paused", "cancelled"]);

// Fases que disparan notificación de avance al cliente
const NOTIFIABLE_PHASES = new Set(["qa", "deployed", "delivered", "in_development"]);

// ─── Normalizadores ───────────────────────────────────────────────────────────

function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeLeadStatus(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeNullableText(value) {
    const normalized = String(value || "").trim();
    return normalized === "" ? null : normalized;
}

function normalizeNullableDate(value) {
    const normalized = String(value || "").trim();
    return normalized === "" ? null : normalized;
}

// ─── Queries internas reutilizables ───────────────────────────────────────────

async function fetchSupportRequests(limit = 100) {
    const result = await pool.query(
        `
    SELECT
      sr.id,
      sr.user_id,
      sr.project_id,
      sr.summary,
      sr.details,
      sr.status,
      sr.created_at,
      sr.admin_response,
      sr.responded_at,
      u.email AS user_email,
      u.role AS user_role,
      p.name AS project_name,
      responder.email AS responded_by_email,
      latest_quote.id AS latest_quote_id,
      latest_quote.title AS latest_quote_title,
      latest_quote.amount_cents AS latest_quote_amount_cents,
      latest_quote.currency AS latest_quote_currency,
      latest_quote.status AS latest_quote_status,
      latest_quote.expires_at AS latest_quote_expires_at
    FROM public.support_requests sr
    INNER JOIN public.users u ON u.id = sr.user_id
    LEFT JOIN public.projects p ON p.id = sr.project_id
    LEFT JOIN public.users responder ON responder.id = sr.responded_by
    LEFT JOIN LATERAL (
      SELECT
        q.id,
        q.title,
        q.amount_cents,
        q.currency,
        q.status,
        q.expires_at
      FROM public.quotes q
      WHERE q.source_request_id = sr.id
      ORDER BY q.created_at DESC, q.id DESC
      LIMIT 1
    ) latest_quote ON TRUE
    ORDER BY
      CASE sr.status
        WHEN 'open' THEN 0
        WHEN 'pending' THEN 1
        WHEN 'resolved' THEN 2
        ELSE 3
      END,
      sr.created_at DESC,
      sr.id DESC
    LIMIT $1
    `,
        [limit]
    );

    return result.rows;
}

async function fetchLeads(limit = 100) {
    const result = await pool.query(
        `
    SELECT
      id,
      name,
      email,
      subject,
      message,
      admin_status,
      admin_note,
      created_at
    FROM public.contact_messages
    ORDER BY created_at DESC, id DESC
    LIMIT $1
    `,
        [limit]
    );

    return result.rows;
}

// ─── Resumen CRM ──────────────────────────────────────────────────────────────

router.get("/crm-overview", async (req, res, next) => {
    try {
        const [
            leads,
            supportRequests,
            leadCountResult,
            clientsResult,
            projectsResult,
            ticketCountsResult,
            linkedQuotesResult,
            premiumClientsResult,
        ] = await Promise.all([
            fetchLeads(20),
            fetchSupportRequests(20),
            pool.query(`SELECT COUNT(*)::int AS total FROM public.contact_messages`),
            pool.query(`SELECT COUNT(*)::int AS total FROM public.users WHERE role = 'user'`),
            pool.query(`SELECT COUNT(*)::int AS total FROM public.projects`),
            pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
          COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_count
        FROM public.support_requests
      `),
            pool.query(`
        SELECT COUNT(*)::int AS total
        FROM public.quotes
        WHERE source_request_id IS NOT NULL
      `),
            pool.query(`
        SELECT COUNT(*)::int AS total
        FROM public.subscriptions
        WHERE LOWER(plan_name) = 'premium' AND status = 'active'
      `),
        ]);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: {
                summary: {
                    leads: leadCountResult.rows[0]?.total || 0,
                    clients: clientsResult.rows[0]?.total || 0,
                    projects: projectsResult.rows[0]?.total || 0,
                    openTickets: ticketCountsResult.rows[0]?.open_count || 0,
                    pendingTickets: ticketCountsResult.rows[0]?.pending_count || 0,
                    resolvedTickets: ticketCountsResult.rows[0]?.resolved_count || 0,
                    linkedQuotes: linkedQuotesResult.rows[0]?.total || 0,
                    premiumClients: premiumClientsResult.rows[0]?.total || 0,
                },
                sections: {
                    leads,
                    supportRequests,
                },
            },
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Leads ────────────────────────────────────────────────────────────────────

router.get("/leads", async (req, res, next) => {
    try {
        const leads = await fetchLeads(100);
        return res.status(200).json({ ok: true, requestId: req.id || null, data: leads });
    } catch (err) {
        return next(err);
    }
});

router.patch("/leads/:id/status", async (req, res, next) => {
    try {
        const leadId = Number.parseInt(req.params.id, 10);
        const adminStatus = normalizeLeadStatus(req.body?.adminStatus);
        const adminNote = normalizeNullableText(req.body?.adminNote);

        if (!Number.isInteger(leadId) || leadId <= 0) {
            const err = new Error("El lead indicado no es válido.");
            err.statusCode = 400;
            throw err;
        }

        if (!ALLOWED_LEAD_STATUSES.has(adminStatus)) {
            const err = new Error("El estado del lead no es válido.");
            err.statusCode = 400;
            throw err;
        }

        const result = await pool.query(
            `
      UPDATE public.contact_messages
      SET admin_status = $2, admin_note = $3
      WHERE id = $1
      RETURNING id, name, email, subject, message, admin_status, admin_note, created_at
      `,
            [leadId, adminStatus, adminNote]
        );

        if (result.rowCount === 0) {
            const err = new Error("El lead no existe.");
            err.statusCode = 404;
            throw err;
        }

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: result.rows[0],
            message: "Lead actualizado correctamente.",
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Tickets de soporte ───────────────────────────────────────────────────────

router.get("/support-requests", async (req, res, next) => {
    try {
        const items = await fetchSupportRequests(100);

        const summaryResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_count,
        COUNT(*) FILTER (WHERE project_id IS NOT NULL)::int AS with_project
      FROM public.support_requests
    `);

        const linkedQuotesResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM public.quotes
      WHERE source_request_id IS NOT NULL
    `);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: {
                summary: {
                    total: summaryResult.rows[0]?.total || 0,
                    open: summaryResult.rows[0]?.open_count || 0,
                    pending: summaryResult.rows[0]?.pending_count || 0,
                    resolved: summaryResult.rows[0]?.resolved_count || 0,
                    withProject: summaryResult.rows[0]?.with_project || 0,
                    linkedQuotes: linkedQuotesResult.rows[0]?.total || 0,
                },
                items,
            },
        });
    } catch (err) {
        return next(err);
    }
});

router.patch("/support-requests/:id/status", async (req, res, next) => {
    try {
        const requestId = Number.parseInt(req.params.id, 10);
        const status = normalizeStatus(req.body?.status);

        if (!Number.isInteger(requestId) || requestId <= 0) {
            const err = new Error("El identificador de la solicitud no es válido.");
            err.statusCode = 400;
            throw err;
        }

        if (!ALLOWED_SUPPORT_STATUSES.has(status)) {
            const err = new Error("El estado solicitado no es válido.");
            err.statusCode = 400;
            throw err;
        }

        const result = await pool.query(
            `
      UPDATE public.support_requests
      SET status = $2
      WHERE id = $1
      RETURNING id, user_id, project_id, summary, details, status, created_at
      `,
            [requestId, status]
        );

        if (result.rowCount === 0) {
            const err = new Error("La solicitud no existe.");
            err.statusCode = 404;
            throw err;
        }

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: result.rows[0],
            message: "Estado actualizado correctamente.",
        });
    } catch (err) {
        return next(err);
    }
});

// PATCH /support-requests/:id/respond — dispara email al cliente
router.patch("/support-requests/:id/respond", async (req, res, next) => {
    try {
        const requestId = Number.parseInt(req.params.id, 10);
        const adminId = Number.parseInt(req.auth.sub, 10);
        const adminResponse = String(req.body?.adminResponse || "").trim();
        const nextStatusRaw = req.body?.status;
        const nextStatus =
            nextStatusRaw === undefined || nextStatusRaw === null || String(nextStatusRaw).trim() === ""
                ? null
                : normalizeStatus(nextStatusRaw);

        if (!Number.isInteger(requestId) || requestId <= 0) {
            const err = new Error("El identificador de la solicitud no es válido.");
            err.statusCode = 400;
            throw err;
        }

        if (!Number.isInteger(adminId) || adminId <= 0) {
            const err = new Error("Token admin inválido.");
            err.statusCode = 401;
            throw err;
        }

        if (adminResponse.length < 4 || adminResponse.length > 4000) {
            const err = new Error("La respuesta debe tener entre 4 y 4000 caracteres.");
            err.statusCode = 400;
            throw err;
        }

        if (nextStatus !== null && !ALLOWED_SUPPORT_STATUSES.has(nextStatus)) {
            const err = new Error("El estado solicitado no es válido.");
            err.statusCode = 400;
            throw err;
        }

        // Obtener email del cliente para notificación
        const clientResult = await pool.query(
            `
      SELECT sr.summary, u.email AS client_email
      FROM public.support_requests sr
      INNER JOIN public.users u ON u.id = sr.user_id
      WHERE sr.id = $1
      LIMIT 1
      `,
            [requestId]
        );

        const result = await pool.query(
            `
      UPDATE public.support_requests
      SET
        admin_response = $2,
        responded_at = NOW(),
        responded_by = $3,
        status = COALESCE($4, status)
      WHERE id = $1
      RETURNING id, user_id, project_id, summary, details, status,
                admin_response, responded_at, responded_by, created_at
      `,
            [requestId, adminResponse, adminId, nextStatus]
        );

        if (result.rowCount === 0) {
            const err = new Error("La solicitud no existe.");
            err.statusCode = 404;
            throw err;
        }

        // Disparar email (no bloquea la respuesta HTTP)
        if (clientResult.rows[0]) {
            const { client_email, summary } = clientResult.rows[0];
            sendTicketResponseNotification({
                to: client_email,
                ticketSummary: summary,
                adminResponse,
            }).catch(() => {});
        }

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: result.rows[0],
            message: "Respuesta guardada correctamente.",
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Clientes / Suscripciones ─────────────────────────────────────────────────

router.get("/clients", async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.role,
        u.created_at,
        latest_sub.plan_name,
        latest_sub.status AS subscription_status,
        latest_sub.coverage_percent,
        latest_sub.starts_at,
        latest_sub.ends_at
      FROM public.users u
      LEFT JOIN LATERAL (
        SELECT s.plan_name, s.status, s.coverage_percent, s.starts_at, s.ends_at
        FROM public.subscriptions s
        WHERE s.user_id = u.id
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT 1
      ) latest_sub ON TRUE
      WHERE u.role = 'user'
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT 100
    `);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: { total: result.rows.length, items: result.rows },
        });
    } catch (err) {
        return next(err);
    }
});

router.post("/clients/:id/subscription", async (req, res, next) => {
    try {
        const userId = Number.parseInt(req.params.id, 10);
        const planNameRaw = String(req.body?.planName || "").trim();
        const statusRaw = normalizeStatus(req.body?.status);
        const requestedCoveragePercent = Number.parseInt(req.body?.coveragePercent, 10);
        const startsAt = normalizeNullableDate(req.body?.startsAt);
        const endsAt = normalizeNullableDate(req.body?.endsAt);

        if (!Number.isInteger(userId) || userId <= 0) {
            const err = new Error("El cliente no es válido.");
            err.statusCode = 400;
            throw err;
        }

        if (!ALLOWED_PLAN_NAMES.has(planNameRaw)) {
            const err = new Error("El plan indicado no es válido.");
            err.statusCode = 400;
            throw err;
        }

        if (!ALLOWED_SUBSCRIPTION_STATUSES.has(statusRaw)) {
            const err = new Error("El estado de suscripción no es válido.");
            err.statusCode = 400;
            throw err;
        }

        if (
            !Number.isInteger(requestedCoveragePercent) ||
            requestedCoveragePercent < 0 ||
            requestedCoveragePercent > 100
        ) {
            const err = new Error("La cobertura debe ser un entero entre 0 y 100.");
            err.statusCode = 400;
            throw err;
        }

        const normalizedCoveragePercent =
            planNameRaw === "Premium" && statusRaw === "active" ? 100 : requestedCoveragePercent;

        const userCheck = await pool.query(
            `SELECT id FROM public.users WHERE id = $1 AND role = 'user' LIMIT 1`,
            [userId]
        );

        if (userCheck.rowCount === 0) {
            const err = new Error("El cliente no existe.");
            err.statusCode = 404;
            throw err;
        }

        const result = await pool.query(
            `
      INSERT INTO public.subscriptions (user_id, plan_name, status, coverage_percent, starts_at, ends_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, plan_name, status, coverage_percent, starts_at, ends_at, created_at
      `,
            [userId, planNameRaw, statusRaw, normalizedCoveragePercent, startsAt, endsAt]
        );

        return res.status(201).json({
            ok: true,
            requestId: req.id || null,
            data: result.rows[0],
            message: "Suscripción registrada correctamente.",
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Proyectos ────────────────────────────────────────────────────────────────

router.get("/projects", async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT
        p.id,
        p.user_id,
        u.email AS user_email,
        p.name,
        p.service_type,
        p.status,
        p.description,
        p.delivery_eta,
        p.is_public,
        p.created_at,
        p.updated_at,
        latest.status AS latest_phase,
        latest.note AS latest_note,
        latest.changed_at AS latest_phase_at,
        COALESCE(project_files.items, '[]'::json) AS files
      FROM public.projects p
      INNER JOIN public.users u ON u.id = p.user_id
      LEFT JOIN LATERAL (
        SELECT h.status, h.note, h.changed_at
        FROM public.project_status_history h
        WHERE h.project_id = p.id
        ORDER BY h.changed_at DESC, h.id DESC
        LIMIT 1
      ) latest ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', f.id,
            'original_name', f.original_name,
            'download_label', f.download_label,
            'mime_type', f.mime_type,
            'size_bytes', f.size_bytes,
            'created_at', f.created_at
          ) ORDER BY f.created_at DESC, f.id DESC
        ) AS items
        FROM public.delivered_files f
        WHERE f.project_id = p.id
      ) project_files ON TRUE
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 100
    `);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: { total: result.rows.length, items: result.rows },
        });
    } catch (err) {
        return next(err);
    }
});

// PATCH /projects/:id — dispara email si la fase es notable
router.patch("/projects/:id", async (req, res, next) => {
    try {
        const projectId = Number.parseInt(req.params.id, 10);
        const status = normalizeStatus(req.body?.status);
        const deliveryEta = normalizeNullableDate(req.body?.deliveryEta);
        const note = normalizeNullableText(req.body?.note);

        if (!Number.isInteger(projectId) || projectId <= 0) {
            const err = new Error("El proyecto no es válido.");
            err.statusCode = 400;
            throw err;
        }

        if (status.length < 2 || status.length > 64) {
            const err = new Error("El estado del proyecto no es válido.");
            err.statusCode = 400;
            throw err;
        }

        // Obtener datos del proyecto + email del cliente
        const contextResult = await pool.query(
            `
      SELECT p.name, p.status AS prev_status, u.email AS client_email
      FROM public.projects p
      INNER JOIN public.users u ON u.id = p.user_id
      WHERE p.id = $1
      LIMIT 1
      `,
            [projectId]
        );

        if (contextResult.rowCount === 0) {
            const err = new Error("El proyecto no existe.");
            err.statusCode = 404;
            throw err;
        }

        const { name: projectName, prev_status: prevStatus, client_email: clientEmail } = contextResult.rows[0];

        const projectResult = await pool.query(
            `
      UPDATE public.projects
      SET status = $2, delivery_eta = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING id, user_id, name, service_type, status, description,
                delivery_eta, is_public, created_at, updated_at
      `,
            [projectId, status, deliveryEta]
        );

        await pool.query(
            `
      INSERT INTO public.project_status_history (project_id, status, note)
      VALUES ($1, $2, $3)
      `,
            [projectId, status, note]
        );

        // Email solo si la fase cambió y es notable
        if (status !== prevStatus && NOTIFIABLE_PHASES.has(status) && clientEmail) {
            const PHASE_LABELS = {
                in_development: "En desarrollo",
                qa: "Control de calidad (QA)",
                deployed: "Desplegado",
                delivered: "Entregado ✓",
            };

            sendProjectPhaseNotification({
                to: clientEmail,
                projectName,
                newPhase: PHASE_LABELS[status] || status,
            }).catch(() => {});
        }

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: projectResult.rows[0],
            message: "Proyecto actualizado correctamente.",
        });
    } catch (err) {
        return next(err);
    }
});

// PATCH /projects/:id/visibility — toggle portafolio público
router.patch("/projects/:id/visibility", async (req, res, next) => {
    try {
        const projectId = Number.parseInt(req.params.id, 10);
        const isPublic = Boolean(req.body?.isPublic);

        if (!Number.isInteger(projectId) || projectId <= 0) {
            const err = new Error("El proyecto no es válido.");
            err.statusCode = 400;
            throw err;
        }

        const result = await pool.query(
            `
      UPDATE public.projects
      SET is_public = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, service_type, status, is_public, updated_at
      `,
            [projectId, isPublic]
        );

        if (result.rowCount === 0) {
            const err = new Error("El proyecto no existe.");
            err.statusCode = 404;
            throw err;
        }

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: result.rows[0],
            message: isPublic
                ? "Proyecto ahora visible en el portafolio público."
                : "Proyecto ocultado del portafolio público.",
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Archivos entregables ─────────────────────────────────────────────────────

// POST /projects/:id/files — subir archivo al proyecto
router.post(
    "/projects/:id/files",
    (req, res, next) => {
        upload.single("file")(req, res, (err) => {
            if (err) {
                err.statusCode = err.statusCode || 400;
                return next(err);
            }
            return next();
        });
    },
    async (req, res, next) => {
        try {
            const projectId = Number.parseInt(req.params.id, 10);
            const downloadLabel = String(req.body?.downloadLabel || "").trim();

            if (!Number.isInteger(projectId) || projectId <= 0) {
                const err = new Error("El proyecto no es válido.");
                err.statusCode = 400;
                throw err;
            }

            if (!req.file) {
                const err = new Error("No se recibió ningún archivo.");
                err.statusCode = 400;
                throw err;
            }

            if (downloadLabel.length < 2 || downloadLabel.length > 255) {
                const err = new Error("La etiqueta del archivo debe tener entre 2 y 255 caracteres.");
                err.statusCode = 400;
                throw err;
            }

            // Verificar que el proyecto existe y obtener datos del cliente para notificación
            const projectCheck = await pool.query(
                `
        SELECT p.id, p.name, u.email AS client_email
        FROM public.projects p
        INNER JOIN public.users u ON u.id = p.user_id
        WHERE p.id = $1
        LIMIT 1
        `,
                [projectId]
            );

            if (projectCheck.rowCount === 0) {
                // Borrar el archivo subido si el proyecto no existe
                fs.unlink(req.file.path, () => {});
                const err = new Error("El proyecto no existe.");
                err.statusCode = 404;
                throw err;
            }

            const { name: projectName, client_email: clientEmail } = projectCheck.rows[0];

            const result = await pool.query(
                `
        INSERT INTO public.delivered_files (
          project_id,
          original_name,
          download_label,
          storage_key,
          mime_type,
          size_bytes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, project_id, original_name, download_label,
                  storage_key, mime_type, size_bytes, created_at
        `,
                [
                    projectId,
                    req.file.originalname,
                    downloadLabel,
                    req.file.filename,
                    req.file.mimetype,
                    req.file.size,
                ]
            );

            // Notificar al cliente (no bloquea la respuesta)
            if (clientEmail) {
                sendNewDeliverableNotification({
                    to: clientEmail,
                    projectName,
                    fileLabel: downloadLabel,
                }).catch(() => {});
            }

            return res.status(201).json({
                ok: true,
                requestId: req.id || null,
                data: result.rows[0],
                message: "Archivo subido correctamente.",
            });
        } catch (err) {
            // Limpiar archivo si hubo error en BD
            if (req.file?.path) {
                fs.unlink(req.file.path, () => {});
            }
            return next(err);
        }
    }
);

// DELETE /projects/:id/files/:fileId — eliminar archivo
router.delete("/projects/:id/files/:fileId", async (req, res, next) => {
    try {
        const projectId = Number.parseInt(req.params.id, 10);
        const fileId = Number.parseInt(req.params.fileId, 10);

        if (!Number.isInteger(projectId) || projectId <= 0) {
            const err = new Error("El proyecto no es válido.");
            err.statusCode = 400;
            throw err;
        }

        if (!Number.isInteger(fileId) || fileId <= 0) {
            const err = new Error("El archivo no es válido.");
            err.statusCode = 400;
            throw err;
        }

        const result = await pool.query(
            `
      DELETE FROM public.delivered_files
      WHERE id = $1 AND project_id = $2
      RETURNING id, storage_key, original_name
      `,
            [fileId, projectId]
        );

        if (result.rowCount === 0) {
            const err = new Error("El archivo no existe o no pertenece a este proyecto.");
            err.statusCode = 404;
            throw err;
        }

        // Eliminar del disco (silencioso si el archivo ya no existe)
        const filePath = path.join(UPLOADS_DIR, result.rows[0].storage_key);
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr && unlinkErr.code !== "ENOENT") {
                console.warn(`[adminRoutes] No se pudo borrar el archivo en disco: ${filePath}`);
            }
        });

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: { deletedId: result.rows[0].id },
            message: "Archivo eliminado correctamente.",
        });
    } catch (err) {
        return next(err);
    }
});

// GET /files/:fileId/download — descarga de archivo (admin)
router.get("/files/:fileId/download", async (req, res, next) => {
    try {
        const fileId = Number.parseInt(req.params.fileId, 10);

        if (!Number.isInteger(fileId) || fileId <= 0) {
            const err = new Error("El archivo no es válido.");
            err.statusCode = 400;
            throw err;
        }

        const result = await pool.query(
            `SELECT id, original_name, storage_key, mime_type FROM public.delivered_files WHERE id = $1 LIMIT 1`,
            [fileId]
        );

        if (result.rowCount === 0) {
            const err = new Error("El archivo no existe.");
            err.statusCode = 404;
            throw err;
        }

        const { original_name, storage_key, mime_type } = result.rows[0];
        const filePath = path.join(UPLOADS_DIR, storage_key);

        if (!fs.existsSync(filePath)) {
            const err = new Error("El archivo ya no está disponible en el servidor.");
            err.statusCode = 410;
            throw err;
        }

        res.setHeader("Content-Type", mime_type || "application/octet-stream");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${encodeURIComponent(original_name)}"`
        );

        return res.sendFile(filePath, { root: "/" });
    } catch (err) {
        return next(err);
    }
});

// ─── Cotizaciones ─────────────────────────────────────────────────────────────

router.get("/quotes", async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT
        q.id,
        q.user_id,
        u.email AS user_email,
        q.project_id,
        p.name AS project_name,
        q.source_request_id,
        q.title,
        q.description,
        q.amount_cents,
        q.currency,
        q.status,
        q.created_at,
        q.expires_at
      FROM public.quotes q
      INNER JOIN public.users u ON u.id = q.user_id
      LEFT JOIN public.projects p ON p.id = q.project_id
      ORDER BY q.created_at DESC, q.id DESC
      LIMIT 100
    `);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: { total: result.rows.length, items: result.rows },
        });
    } catch (err) {
        return next(err);
    }
});

// POST /quotes/from-support-request — dispara email al cliente
router.post("/quotes/from-support-request", async (req, res, next) => {
    try {
        const supportRequestId = Number.parseInt(req.body?.supportRequestId, 10);
        const title = String(req.body?.title || "").trim();
        const description = String(req.body?.description || "").trim();
        const currency = String(req.body?.currency || "MXN").trim().toUpperCase();
        const amountCents = Number.parseInt(req.body?.amountCents, 10);
        const expiresAtRaw = req.body?.expiresAt;
        const expiresAt =
            expiresAtRaw && String(expiresAtRaw).trim() !== "" ? String(expiresAtRaw).trim() : null;

        if (!Number.isInteger(supportRequestId) || supportRequestId <= 0) {
            const err = new Error("La solicitud origen no es válida.");
            err.statusCode = 400;
            throw err;
        }

        if (title.length < 4 || title.length > 180) {
            const err = new Error("El título de la cotización debe tener entre 4 y 180 caracteres.");
            err.statusCode = 400;
            throw err;
        }

        if (description.length > 3000) {
            const err = new Error("La descripción de la cotización es demasiado larga.");
            err.statusCode = 400;
            throw err;
        }

        if (!Number.isInteger(amountCents) || amountCents <= 0) {
            const err = new Error("El monto debe ser un entero positivo en centavos.");
            err.statusCode = 400;
            throw err;
        }

        if (currency.length < 3 || currency.length > 8) {
            const err = new Error("La moneda indicada no es válida.");
            err.statusCode = 400;
            throw err;
        }

        const requestResult = await pool.query(
            `
      SELECT sr.id, sr.user_id, sr.project_id, sr.status, u.email AS client_email
      FROM public.support_requests sr
      INNER JOIN public.users u ON u.id = sr.user_id
      WHERE sr.id = $1
      LIMIT 1
      `,
            [supportRequestId]
        );

        const sourceRequest = requestResult.rows[0];

        if (!sourceRequest) {
            const err = new Error("La solicitud origen no existe.");
            err.statusCode = 404;
            throw err;
        }

        const quoteResult = await pool.query(
            `
      INSERT INTO public.quotes (
        user_id, project_id, source_request_id,
        title, description, amount_cents, currency, status, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
      RETURNING id, user_id, project_id, source_request_id, title, description,
                amount_cents, currency, status, created_at, expires_at
      `,
            [
                sourceRequest.user_id,
                sourceRequest.project_id,
                sourceRequest.id,
                title,
                description,
                amountCents,
                currency,
                expiresAt,
            ]
        );

        await pool.query(
            `
      UPDATE public.support_requests
      SET status = CASE WHEN status = 'resolved' THEN 'resolved' ELSE 'pending' END
      WHERE id = $1
      `,
            [supportRequestId]
        );

        // Notificar al cliente (no bloquea la respuesta)
        if (sourceRequest.client_email) {
            const amountFormatted = new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency,
                maximumFractionDigits: 2,
            }).format(amountCents / 100);

            const expiresAtFormatted = expiresAt
                ? new Intl.DateTimeFormat("es-MX", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                }).format(new Date(expiresAt))
                : null;

            sendNewQuoteNotification({
                to: sourceRequest.client_email,
                quoteTitle: title,
                amountFormatted,
                expiresAt: expiresAtFormatted,
            }).catch(() => {});
        }

        return res.status(201).json({
            ok: true,
            requestId: req.id || null,
            data: quoteResult.rows[0],
            message: "Cotización creada correctamente.",
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Bot de Cotización Inteligente ────────────────────────────────────────────

const QUOTE_BOT_PRICES = {
    // service_category → base prices by complexity
    "landing_page": { low: 150, medium: 350, high: 600 },
    "web_app": { low: 500, medium: 1200, high: 3000 },
    "ecommerce": { low: 800, medium: 2000, high: 5000 },
    "mobile_app": { low: 1000, medium: 3000, high: 7000 },
    "automation": { low: 200, medium: 600, high: 1500 },
    "maintenance": { low: 50, medium: 150, high: 400 },
    "design": { low: 100, medium: 300, high: 800 },
    "consulting": { low: 80, medium: 200, high: 500 },
    "other": { low: 100, medium: 400, high: 1000 },
};

router.post("/quote-bot", async (req, res, next) => {
    try {
        const serviceCategory = String(req.body?.serviceCategory || "other").trim().toLowerCase();
        const complexity = String(req.body?.complexity || "medium").trim().toLowerCase();

        const validComplexities = ["low", "medium", "high"];
        if (!validComplexities.includes(complexity)) {
            const err = new Error("La complejidad debe ser: low, medium o high.");
            err.statusCode = 400;
            throw err;
        }

        const prices = QUOTE_BOT_PRICES[serviceCategory] || QUOTE_BOT_PRICES["other"];
        const suggestedPrice = prices[complexity];

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: {
                serviceCategory,
                complexity,
                suggestedPriceUsd: suggestedPrice,
                currency: "USD",
                note: `Precio sugerido basado en categoría "${serviceCategory}" y complejidad "${complexity}".`,
            },
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Dashboard Estadísticas Admin ─────────────────────────────────────────────

router.get("/stats", async (req, res, next) => {
    try {
        const [
            revenueResult,
            monthlyRevenueResult,
            projectStatusResult,
            ticketTrendResult,
            clientGrowthResult,
        ] = await Promise.all([
            // Total revenue from quotes paid
            pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN amount_usd > 0 THEN amount_usd ELSE amount_cents / 100.0 * 0.058 END), 0)::numeric(12,2) AS total_revenue_usd,
          COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count
        FROM public.quotes
      `),

            // Monthly revenue (last 6 months)
            pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(CASE WHEN amount_usd > 0 THEN amount_usd ELSE amount_cents / 100.0 * 0.058 END), 0)::numeric(12,2) AS revenue
        FROM public.quotes
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `),

            // Project status distribution
            pool.query(`
        SELECT status, COUNT(*)::int AS count
        FROM public.projects
        GROUP BY status
        ORDER BY count DESC
      `),

            // Ticket trend (last 30 days)
            pool.query(`
        SELECT
          TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day,
          COUNT(*)::int AS count
        FROM public.support_requests
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY created_at::date
        ORDER BY created_at::date ASC
      `),

            // Client growth (last 6 months)
            pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS new_clients
        FROM public.users
        WHERE role = 'user' AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `),
        ]);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: {
                revenue: revenueResult.rows[0] || { total_revenue_usd: 0, paid_count: 0, pending_count: 0 },
                monthlyRevenue: monthlyRevenueResult.rows,
                projectStatus: projectStatusResult.rows,
                ticketTrend: ticketTrendResult.rows,
                clientGrowth: clientGrowthResult.rows,
            },
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Portfolio Media CRUD ─────────────────────────────────────────────────────

router.get("/projects/:id/media", async (req, res, next) => {
    try {
        const projectId = Number.parseInt(req.params.id, 10);

        if (!Number.isInteger(projectId) || projectId <= 0) {
            const err = new Error("El proyecto no es válido.");
            err.statusCode = 400;
            throw err;
        }

        const result = await pool.query(
            `
      SELECT id, project_id, media_type, storage_key, original_name, caption, sort_order, created_at
      FROM public.portfolio_media
      WHERE project_id = $1
      ORDER BY sort_order ASC, created_at ASC
      `,
            [projectId]
        );

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: result.rows,
        });
    } catch (err) {
        return next(err);
    }
});

router.post(
    "/projects/:id/media",
    (req, res, next) => {
        upload.single("media")(req, res, (err) => {
            if (err) {
                err.statusCode = err.statusCode || 400;
                return next(err);
            }
            return next();
        });
    },
    async (req, res, next) => {
        try {
            const projectId = Number.parseInt(req.params.id, 10);
            const caption = String(req.body?.caption || "").trim() || null;
            const sortOrder = Number.parseInt(req.body?.sortOrder || "0", 10) || 0;

            if (!Number.isInteger(projectId) || projectId <= 0) {
                const err = new Error("El proyecto no es válido.");
                err.statusCode = 400;
                throw err;
            }

            if (!req.file) {
                const err = new Error("No se recibió ningún archivo multimedia.");
                err.statusCode = 400;
                throw err;
            }

            // Determine media type from mime
            const mime = req.file.mimetype || "";
            let mediaType = "image";
            if (mime.startsWith("video/")) mediaType = "video";

            const projectCheck = await pool.query(
                `SELECT id FROM public.projects WHERE id = $1 LIMIT 1`,
                [projectId]
            );

            if (projectCheck.rowCount === 0) {
                fs.unlink(req.file.path, () => {});
                const err = new Error("El proyecto no existe.");
                err.statusCode = 404;
                throw err;
            }

            const result = await pool.query(
                `
        INSERT INTO public.portfolio_media (project_id, media_type, storage_key, original_name, caption, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, project_id, media_type, storage_key, original_name, caption, sort_order, created_at
        `,
                [projectId, mediaType, req.file.filename, req.file.originalname, caption, sortOrder]
            );

            return res.status(201).json({
                ok: true,
                requestId: req.id || null,
                data: result.rows[0],
                message: "Archivo multimedia agregado al portafolio.",
            });
        } catch (err) {
            if (req.file?.path) fs.unlink(req.file.path, () => {});
            return next(err);
        }
    }
);

router.delete("/projects/:id/media/:mediaId", async (req, res, next) => {
    try {
        const projectId = Number.parseInt(req.params.id, 10);
        const mediaId = Number.parseInt(req.params.mediaId, 10);

        if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(mediaId) || mediaId <= 0) {
            const err = new Error("Parámetros inválidos.");
            err.statusCode = 400;
            throw err;
        }

        const result = await pool.query(
            `DELETE FROM public.portfolio_media WHERE id = $1 AND project_id = $2 RETURNING id, storage_key`,
            [mediaId, projectId]
        );

        if (result.rowCount === 0) {
            const err = new Error("El archivo multimedia no existe.");
            err.statusCode = 404;
            throw err;
        }

        const filePath = path.join(UPLOADS_DIR, result.rows[0].storage_key);
        fs.unlink(filePath, () => {});

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: { deletedId: result.rows[0].id },
            message: "Archivo multimedia eliminado.",
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Actualizar descripción de portafolio del proyecto ────────────────────────

router.patch("/projects/:id/portfolio", async (req, res, next) => {
    try {
        const projectId = Number.parseInt(req.params.id, 10);
        const portfolioDescription = String(req.body?.portfolioDescription || "").trim() || null;
        const portfolioUrl = String(req.body?.portfolioUrl || "").trim() || null;

        if (!Number.isInteger(projectId) || projectId <= 0) {
            const err = new Error("El proyecto no es válido.");
            err.statusCode = 400;
            throw err;
        }

        const result = await pool.query(
            `
      UPDATE public.projects
      SET portfolio_description = $2, portfolio_url = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, portfolio_description, portfolio_url, is_public
      `,
            [projectId, portfolioDescription, portfolioUrl]
        );

        if (result.rowCount === 0) {
            const err = new Error("El proyecto no existe.");
            err.statusCode = 404;
            throw err;
        }

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: result.rows[0],
            message: "Portafolio del proyecto actualizado.",
        });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;