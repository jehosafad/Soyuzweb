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
        p.status,
        p.updated_at
      FROM public.projects p
      WHERE p.is_public = true
        AND p.status IN ('deployed', 'delivered')
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

module.exports = router;