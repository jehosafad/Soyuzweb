const rateLimit = require("express-rate-limit");
const env = require("../config/env");

function handler(req, res, next, options) {
    res.status(options.statusCode).json({
        ok: false,
        error: "RATE_LIMIT",
        message: "Demasiadas solicitudes. Intenta más tarde.",
        requestId: req.id || null,
    });
}

function makeLimiter({ windowMs, limit }) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        handler,
        // Importante: dejamos el keyGenerator por defecto para evitar bypass IPv6
        // y cumplir validaciones de express-rate-limit.
    });
}

// API general (burst + ventana)
const apiBurstLimiter = makeLimiter({
    windowMs: env.RATE_LIMIT_API_BURST_WINDOW_MS,
    limit: env.RATE_LIMIT_API_BURST_LIMIT,
});

const apiLimiter = makeLimiter({
    windowMs: env.RATE_LIMIT_API_WINDOW_MS,
    limit: env.RATE_LIMIT_API_LIMIT,
});

// Contacto (más estricto)
const contactBurstLimiter = makeLimiter({
    windowMs: env.RATE_LIMIT_CONTACT_BURST_WINDOW_MS,
    limit: env.RATE_LIMIT_CONTACT_BURST_LIMIT,
});

const contactLimiter = makeLimiter({
    windowMs: env.RATE_LIMIT_CONTACT_WINDOW_MS,
    limit: env.RATE_LIMIT_CONTACT_LIMIT,
});

// Login (anti fuerza bruta — 5 intentos por ventana de 15 min)
const loginLimiter = makeLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 5,
});

module.exports = {
    apiBurstLimiter,
    apiLimiter,
    contactBurstLimiter,
    contactLimiter,
    loginLimiter,
};