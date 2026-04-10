const express = require("express");
const { pool } = require("../config/db");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { createOrder, captureOrder, isPayPalConfigured } = require("../services/paypalService");

const router = express.Router();

// ─── Cliente: Crear orden PayPal para pagar una cotización ────────────────────

router.post("/create-order", requireAuth, requireRole("user"), async (req, res, next) => {
    try {
        if (!isPayPalConfigured()) {
            const err = new Error("El sistema de pagos aún no está habilitado. Contacta a soporte.");
            err.statusCode = 503;
            throw err;
        }

        const userId = Number.parseInt(req.auth.sub, 10);
        const quoteIdRaw = req.body?.quoteId;
        const directAmountRaw = req.body?.amountUsd;
        const directDescription = String(req.body?.description || "").trim();

        let amountUsd = 0;
        let description = "";
        let quoteId = null;

        if (quoteIdRaw && Number.parseInt(quoteIdRaw, 10) > 0) {
            // ── Pago de cotización ────────────────────────────────
            quoteId = Number.parseInt(quoteIdRaw, 10);

            const quoteResult = await pool.query(
                `SELECT id, title, description, amount_cents, amount_usd, currency, status
                 FROM public.quotes
                 WHERE id = $1 AND user_id = $2 AND status = 'pending'
                 LIMIT 1`,
                [quoteId, userId]
            );

            if (quoteResult.rowCount === 0) {
                const err = new Error("La cotización no existe, no te pertenece o ya fue pagada.");
                err.statusCode = 404;
                throw err;
            }

            const quote = quoteResult.rows[0];
            amountUsd = Number(quote.amount_usd || 0);
            if (amountUsd <= 0 && quote.amount_cents > 0) {
                amountUsd = Math.round((quote.amount_cents / 100) * 0.058 * 100) / 100;
            }
            description = `Soyuz - ${quote.title}`;

        } else if (directAmountRaw && Number(directAmountRaw) > 0) {
            // ── Pago directo (suscripción premium, etc.) ─────────
            amountUsd = Number(directAmountRaw);
            description = directDescription || "Soyuz - Pago directo";

        } else {
            const err = new Error("Se requiere una cotización o un monto directo para procesar el pago.");
            err.statusCode = 400;
            throw err;
        }

        if (amountUsd <= 0) {
            const err = new Error("El monto no es válido.");
            err.statusCode = 400;
            throw err;
        }

        const order = await createOrder({
            amountUsd,
            description,
            referenceId: quoteId ? `quote-${quoteId}` : `direct-${userId}-${Date.now()}`,
        });

        await pool.query(
            `INSERT INTO public.payments (user_id, quote_id, paypal_order_id, amount_usd, status, description)
             VALUES ($1, $2, $3, $4, 'pending', $5)`,
            [userId, quoteId, order.id, amountUsd, description]
        );

        // Si es pago de suscripción, activar premium
        if (!quoteId && directDescription && directDescription.includes("Premium")) {
            await pool.query(
                `INSERT INTO public.subscriptions (user_id, plan_name, status, coverage_percent, starts_at, ends_at)
                 VALUES ($1, 'Premium', 'active', 100, NOW()::date,
                     CASE WHEN EXISTS (
                         SELECT 1 FROM public.subscriptions WHERE user_id = $1 AND ends_at > NOW()::date
                     ) THEN (SELECT GREATEST(ends_at, NOW()::date) + INTERVAL '1 month' FROM public.subscriptions WHERE user_id = $1 ORDER BY ends_at DESC LIMIT 1)
                     ELSE (NOW() + INTERVAL '7 months')::date
                     END
                 )
                 ON CONFLICT DO NOTHING`,
                [userId]
            );
        }

        return res.status(201).json({
            ok: true,
            requestId: req.id || null,
            data: { paypalOrderId: order.id, approveUrl: order.approveUrl, amountUsd },
            message: "Orden de pago creada.",
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Cliente: Capturar pago después de que PayPal apruebe ─────────────────────

router.post("/capture-order", requireAuth, requireRole("user"), async (req, res, next) => {
    try {
        const userId = Number.parseInt(req.auth.sub, 10);
        const paypalOrderId = String(req.body?.paypalOrderId || "").trim();

        if (!paypalOrderId) {
            const err = new Error("Se requiere el ID de la orden de PayPal.");
            err.statusCode = 400;
            throw err;
        }

        // Verificar que la orden existe y pertenece al usuario
        const paymentResult = await pool.query(
            `SELECT id, quote_id, status FROM public.payments
             WHERE paypal_order_id = $1 AND user_id = $2 AND status = 'pending'
             LIMIT 1`,
            [paypalOrderId, userId]
        );

        if (paymentResult.rowCount === 0) {
            const err = new Error("La orden de pago no existe o ya fue procesada.");
            err.statusCode = 404;
            throw err;
        }

        const payment = paymentResult.rows[0];

        // Capturar en PayPal
        const capture = await captureOrder(paypalOrderId);

        if (capture.status !== "COMPLETED") {
            await pool.query(
                `UPDATE public.payments SET status = 'failed', updated_at = NOW() WHERE id = $1`,
                [payment.id]
            );

            const err = new Error(`El pago no fue completado. Estado: ${capture.status}`);
            err.statusCode = 400;
            throw err;
        }

        // Marcar pago como completado
        await pool.query(
            `UPDATE public.payments
             SET status = 'completed', paypal_capture_id = $2, updated_at = NOW()
             WHERE id = $1`,
            [payment.id, capture.captureId]
        );

        // Marcar cotización como pagada
        if (payment.quote_id) {
            await pool.query(
                `UPDATE public.quotes SET status = 'paid' WHERE id = $1`,
                [payment.quote_id]
            );
        }

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: {
                paymentId: payment.id,
                captureId: capture.captureId,
                status: "completed",
                amountUsd: capture.amount,
            },
            message: "Pago procesado correctamente.",
        });
    } catch (err) {
        return next(err);
    }
});

// ─── Cliente: Historial de pagos ──────────────────────────────────────────────

router.get("/my-payments", requireAuth, requireRole("user"), async (req, res, next) => {
    try {
        const userId = Number.parseInt(req.auth.sub, 10);

        const result = await pool.query(
            `SELECT p.id, p.quote_id, p.paypal_order_id, p.amount_usd, p.status,
                    p.description, p.created_at, p.updated_at,
                    q.title AS quote_title
             FROM public.payments p
             LEFT JOIN public.quotes q ON q.id = p.quote_id
             WHERE p.user_id = $1
             ORDER BY p.created_at DESC
             LIMIT 50`,
            [userId]
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

// ─── Admin: Ver todos los pagos ───────────────────────────────────────────────

router.get("/all", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT p.id, p.user_id, u.email AS user_email, p.quote_id,
                    p.paypal_order_id, p.paypal_capture_id, p.amount_usd,
                    p.status, p.description, p.created_at, p.updated_at,
                    q.title AS quote_title
             FROM public.payments p
             INNER JOIN public.users u ON u.id = p.user_id
             LEFT JOIN public.quotes q ON q.id = p.quote_id
             ORDER BY p.created_at DESC
             LIMIT 100`
        );

        const summaryResult = await pool.query(
            `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
                COALESCE(SUM(amount_usd) FILTER (WHERE status = 'completed'), 0)::numeric(12,2) AS total_collected_usd
             FROM public.payments`
        );

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: {
                summary: summaryResult.rows[0] || {},
                items: result.rows,
            },
        });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
