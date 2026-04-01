const env = require("../config/env");

function errorHandler(err, req, res, next) {
    if (err?.message === "CORS_NOT_ALLOWED") {
        err.statusCode = 403;
    }
    if (err?.type === "entity.too.large" || err?.status === 413) {
        err.statusCode = 413;
        err.message = "PAYLOAD_TOO_LARGE";
    }
    if (err?.type === "entity.parse.failed") {
        err.statusCode = 400;
        err.message = "INVALID_JSON";
    }

    const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    const requestId = req.id || null;

    const log = req.log || console;
    if (status >= 500) log.error({ err, requestId }, "request_failed");
    else log.warn({ err, requestId }, "request_rejected");

    const payload = {
        ok: false,
        error: status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
        message: status === 500 ? "Error interno del servidor." : err.message,
        requestId,
    };

    if (env.NODE_ENV !== "production" && err?.stack) {
        payload.stack = err.stack;
    }

    res.status(status).json(payload);
}

module.exports = { errorHandler };