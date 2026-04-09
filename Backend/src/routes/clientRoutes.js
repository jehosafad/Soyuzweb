const express = require("express");
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { UPLOADS_DIR } = require("../config/upload");

const router = express.Router();

function toPortalResponse({
                              messages = [],
                              projects = [],
                              deliveredFiles = [],
                              activeQuotes = [],
                              supportRequests = [],
                              warranty = null,
                              subscription = null,
                              schemaReady = true,
                          }) {
    return {
        summary: {
            messagesCount: messages.length,
            projectsCount: projects.length,
            filesCount: deliveredFiles.length,
            quotesCount: activeQuotes.length,
        },
        messages,
        projects,
        deliveredFiles,
        activeQuotes,
        supportRequests,
        warranty,
        subscription,
        meta: { schemaReady },
    };
}

async function isClientPortalSchemaReady() {
    const result = await pool.query(`
    SELECT
      to_regclass('public.projects') IS NOT NULL AS projects_ready,
      to_regclass('public.project_status_history') IS NOT NULL AS project_status_history_ready,
      to_regclass('public.delivered_files') IS NOT NULL AS delivered_files_ready,
      to_regclass('public.warranties') IS NOT NULL AS warranties_ready,
      to_regclass('public.subscriptions') IS NOT NULL AS subscriptions_ready,
      to_regclass('public.quotes') IS NOT NULL AS quotes_ready,
      to_regclass('public.support_requests') IS NOT NULL AS support_requests_ready
  `);

    const row = result.rows[0] || {};

    return Boolean(
        row.projects_ready &&
        row.project_status_history_ready &&
        row.delivered_files_ready &&
        row.warranties_ready &&
        row.subscriptions_ready &&
        row.quotes_ready &&
        row.support_requests_ready
    );
}

function normalizeSupportPayload(body) {
    const summary = String(body?.summary || "").trim();
    const details = String(body?.details || "").trim();
    const projectIdRaw = body?.projectId;

    let projectId = null;

    if (
        projectIdRaw !== undefined &&
        projectIdRaw !== null &&
        String(projectIdRaw).trim() !== ""
    ) {
        const parsed = Number.parseInt(projectIdRaw, 10);
        projectId = Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
    }

    return { summary, details, projectId };
}

function validateSupportPayload({ summary, details, projectId }) {
    if (summary.length < 6 || summary.length > 180) {
        const err = new Error("El resumen debe tener entre 6 y 180 caracteres.");
        err.statusCode = 400;
        throw err;
    }

    if (details.length < 12 || details.length > 3000) {
        const err = new Error("El detalle debe tener entre 12 y 3000 caracteres.");
        err.statusCode = 400;
        throw err;
    }

    if (Number.isNaN(projectId)) {
        const err = new Error("El proyecto seleccionado no es válido.");
        err.statusCode = 400;
        throw err;
    }
}

// ─── Portal principal ─────────────────────────────────────────────────────────

router.get("/portal", requireAuth, requireRole("user"), async (req, res, next) => {
    try {
        const userId = Number.parseInt(req.auth.sub, 10);
        const userEmail = (req.auth.email || "").toLowerCase();

        if (!Number.isInteger(userId) || userId <= 0) {
            const err = new Error("Token inválido: usuario no resuelto.");
            err.statusCode = 401;
            throw err;
        }

        const schemaReady = await isClientPortalSchemaReady();

        if (!schemaReady) {
            return res.status(200).json({
                ok: true,
                requestId: req.id || null,
                data: toPortalResponse({ schemaReady: false }),
            });
        }

        const [
            messagesResult,
            projectsResult,
            deliveredFilesResult,
            warrantyResult,
            subscriptionResult,
            quotesResult,
            supportRequestsResult,
        ] = await Promise.all([
            pool.query(
                `
        SELECT id, name, email, subject, message, created_at
        FROM public.contact_messages
        WHERE LOWER(email) = LOWER($1)
        ORDER BY created_at DESC, id DESC
        LIMIT 20
        `,
                [userEmail]
            ),

            pool.query(
                `
        SELECT
          p.id,
          p.name,
          p.service_type,
          COALESCE(latest.status, p.status) AS status,
          p.description,
          p.delivery_eta,
          p.created_at,
          p.updated_at,
          latest.status AS latest_phase,
          latest.note AS latest_note,
          latest.changed_at AS latest_phase_at,
          COALESCE(history.items, '[]'::json) AS status_history
        FROM public.projects p
        LEFT JOIN LATERAL (
          SELECT h.id, h.status, h.note, h.changed_at
          FROM public.project_status_history h
          WHERE h.project_id = p.id
          ORDER BY h.changed_at DESC, h.id DESC
          LIMIT 1
        ) latest ON TRUE
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'id', h.id,
              'status', h.status,
              'note', h.note,
              'changed_at', h.changed_at
            )
            ORDER BY h.changed_at ASC, h.id ASC
          ) AS items
          FROM public.project_status_history h
          WHERE h.project_id = p.id
        ) history ON TRUE
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT 20
        `,
                [userId]
            ),

            pool.query(
                `
        SELECT
          f.id,
          f.project_id,
          p.name AS project_name,
          f.original_name,
          f.download_label,
          f.mime_type,
          f.size_bytes,
          f.created_at
        FROM public.delivered_files f
        INNER JOIN public.projects p ON p.id = f.project_id
        WHERE p.user_id = $1
        ORDER BY f.created_at DESC, f.id DESC
        LIMIT 20
        `,
                [userId]
            ),

            pool.query(
                `
        SELECT w.id, w.project_id, p.name AS project_name,
               w.starts_at, w.ends_at, w.status, w.notes, w.created_at
        FROM public.warranties w
        INNER JOIN public.projects p ON p.id = w.project_id
        WHERE p.user_id = $1
        ORDER BY w.created_at DESC, w.id DESC
        LIMIT 1
        `,
                [userId]
            ),

            pool.query(
                `
        SELECT id, plan_name, status, coverage_percent, starts_at, ends_at, created_at
        FROM public.subscriptions
        WHERE user_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        `,
                [userId]
            ),

            pool.query(
                `
        SELECT id, project_id, source_request_id, title, description,
               amount_cents, currency, status, created_at, expires_at
        FROM public.quotes
        WHERE user_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 20
        `,
                [userId]
            ),

            pool.query(
                `
        SELECT
          sr.id, sr.project_id, sr.summary, sr.details, sr.status,
          sr.created_at, sr.admin_response, sr.responded_at,
          au.email AS responded_by_email
        FROM public.support_requests sr
        LEFT JOIN public.users au ON au.id = sr.responded_by
        WHERE sr.user_id = $1
        ORDER BY sr.created_at DESC, sr.id DESC
        LIMIT 20
        `,
                [userId]
            ),
        ]);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: toPortalResponse({
                messages: messagesResult.rows,
                projects: projectsResult.rows,
                deliveredFiles: deliveredFilesResult.rows,
                activeQuotes: quotesResult.rows,
                supportRequests: supportRequestsResult.rows,
                warranty: warrantyResult.rows[0] || null,
                subscription: subscriptionResult.rows[0] || null,
                schemaReady: true,
            }),
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Descarga segura de archivos (cliente autenticado) ────────────────────────

router.get("/files/:fileId/download", requireAuth, requireRole("user"), async (req, res, next) => {
    try {
        const userId = Number.parseInt(req.auth.sub, 10);
        const fileId = Number.parseInt(req.params.fileId, 10);

        if (!Number.isInteger(userId) || userId <= 0) {
            const err = new Error("Token inválido.");
            err.statusCode = 401;
            throw err;
        }

        if (!Number.isInteger(fileId) || fileId <= 0) {
            const err = new Error("El archivo no es válido.");
            err.statusCode = 400;
            throw err;
        }

        // Verificar que el archivo pertenece a un proyecto de este usuario (anti-suplantación)
        const result = await pool.query(
            `
      SELECT f.id, f.original_name, f.storage_key, f.mime_type
      FROM public.delivered_files f
      INNER JOIN public.projects p ON p.id = f.project_id
      WHERE f.id = $1 AND p.user_id = $2
      LIMIT 1
      `,
            [fileId, userId]
        );

        if (result.rowCount === 0) {
            const err = new Error("El archivo no existe o no tienes permiso para descargarlo.");
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

// ─── Tickets de soporte ───────────────────────────────────────────────────────

router.post("/support-requests", requireAuth, requireRole("user"), async (req, res, next) => {
    try {
        const userId = Number.parseInt(req.auth.sub, 10);

        if (!Number.isInteger(userId) || userId <= 0) {
            const err = new Error("Token inválido: usuario no resuelto.");
            err.statusCode = 401;
            throw err;
        }

        const schemaReady = await isClientPortalSchemaReady();

        if (!schemaReady) {
            const err = new Error(
                "La estructura del portal aún no está lista para registrar solicitudes."
            );
            err.statusCode = 503;
            throw err;
        }

        const payload = normalizeSupportPayload(req.body);
        validateSupportPayload(payload);

        if (payload.projectId) {
            const projectOwnership = await pool.query(
                `SELECT id FROM public.projects WHERE id = $1 AND user_id = $2 LIMIT 1`,
                [payload.projectId, userId]
            );

            if (projectOwnership.rowCount === 0) {
                const err = new Error("El proyecto seleccionado no pertenece a este cliente.");
                err.statusCode = 403;
                throw err;
            }
        }

        const insertResult = await pool.query(
            `
      INSERT INTO public.support_requests (user_id, project_id, summary, details, status)
      VALUES ($1, $2, $3, $4, 'open')
      RETURNING id, user_id, project_id, summary, details, status, created_at
      `,
            [userId, payload.projectId, payload.summary, payload.details]
        );

        return res.status(201).json({
            ok: true,
            requestId: req.id || null,
            data: insertResult.rows[0],
            message: "Solicitud registrada correctamente.",
        });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;