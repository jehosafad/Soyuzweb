const express = require("express");
const { pool } = require("../config/db");

const router = express.Router();

/**
 * GET /api/public/portfolio
 * Devuelve los proyectos marcados como públicos y con estado terminal.
 * Sin autenticación — accesible desde la landing page.
 */
router.get("/portfolio", async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.service_type,
        p.description,
        p.portfolio_description,
        p.portfolio_url,
        p.status,
        p.is_featured,
        p.implementations,
        p.updated_at,
        COALESCE(media.items, '[]'::json) AS media
      FROM public.projects p
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', pm.id,
            'media_type', pm.media_type,
            'storage_key', pm.storage_key,
            'caption', pm.caption,
            'sort_order', pm.sort_order
          ) ORDER BY pm.sort_order ASC
        ) AS items
        FROM public.portfolio_media pm
        WHERE pm.project_id = p.id
      ) media ON TRUE
      WHERE p.is_public = true
      ORDER BY p.updated_at DESC, p.id DESC
      LIMIT 50
    `);

        return res.status(200).json({
            ok: true,
            data: result.rows,
        });
    } catch (err) {
        return next(err);
    }
});

/**
 * GET /api/public/featured
 * Devuelve los proyectos marcados como destacados para la landing.
 */
router.get("/featured", async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT
        p.id, p.name, p.service_type, p.description,
        p.portfolio_description, p.portfolio_url, p.status, p.implementations, p.updated_at,
        COALESCE(media.items, '[]'::json) AS media
      FROM public.projects p
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object('id', pm.id, 'media_type', pm.media_type, 'storage_key', pm.storage_key, 'caption', pm.caption)
          ORDER BY pm.sort_order ASC
        ) AS items
        FROM public.portfolio_media pm WHERE pm.project_id = p.id
      ) media ON TRUE
      WHERE p.is_public = true AND p.is_featured = true
      ORDER BY p.updated_at DESC
      LIMIT 6
    `);

        return res.status(200).json({ ok: true, data: result.rows });
    } catch (err) {
        return next(err);
    }
});

/**
 * GET /api/public/paypal-config
 * Devuelve el Client ID de PayPal para el SDK del frontend.
 */
router.get("/paypal-config", (req, res) => {
    const clientId = process.env.PAYPAL_CLIENT_ID || "";
    const mode = process.env.PAYPAL_MODE || "sandbox";

    return res.status(200).json({
        ok: true,
        data: {
            clientId,
            mode,
            enabled: Boolean(clientId),
        },
    });
});

module.exports = router;