const env = require("./env");

function parseOrigins() {
    const raw =
        env.CORS_ORIGINS && String(env.CORS_ORIGINS).trim().length > 0
            ? String(env.CORS_ORIGINS)
            : String(env.FRONTEND_ORIGIN);

    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

const allowedOrigins = new Set(parseOrigins());

const corsOptions = {
    origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowedOrigins.has(origin)) return cb(null, true);

        const err = new Error("CORS_NOT_ALLOWED");
        err.statusCode = 403;
        return cb(err);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    optionsSuccessStatus: 204,
};

const helmetOptions = {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "no-referrer" },
    frameguard: { action: "deny" },
};

module.exports = {
    corsOptions,
    helmetOptions,
    bodyLimit: env.BODY_LIMIT,
};