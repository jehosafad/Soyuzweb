const pino = require("pino");
const env = require("./env");

const isProd = env.NODE_ENV === "production";

const transport = isProd
    ? undefined
    : pino.transport({
        target: "pino-pretty",
        options: {
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
            singleLine: true,
        },
    });

const logger = pino(
    {
        level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
        base: {
            service: "soyuz-api",
            env: env.NODE_ENV,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        // Redacción defensiva (por si algún día se loguea algo sensible)
        redact: {
            paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                "req.headers['set-cookie']",
                "res.headers['set-cookie']",
                "password",
                "token",
                "accessToken",
                "refreshToken",
            ],
            censor: "[REDACTED]",
        },
    },
    transport
);

module.exports = { logger };