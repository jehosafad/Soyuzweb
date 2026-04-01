const pinoHttp = require("pino-http");
const crypto = require("crypto");
const { logger } = require("../config/logger");

// RequestId: acepta header entrante (si viene), si no genera uno
function genReqId(req, res) {
    const incoming = req.headers["x-request-id"];
    const id =
        typeof incoming === "string" && incoming.length > 0 && incoming.length <= 128
            ? incoming
            : crypto.randomUUID();

    res.setHeader("x-request-id", id);
    return id;
}

const httpLogger = pinoHttp({
    logger,
    genReqId,

    // No queremos loguear PII (IP, user-agent, body, etc.)
    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url,
            };
        },
        res(res) {
            return { statusCode: res.statusCode };
        },
    },

    // Para evitar ruido: no logs automáticos de health/ready
    autoLogging: {
        ignore: (req) => req.url === "/api/health" || req.url === "/api/ready",
    },
});

module.exports = { httpLogger };