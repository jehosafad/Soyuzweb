const { pool } = require("../config/db");

function health(req, res) {
    return res.json({
        ok: true,
        status: "healthy",
        uptimeSec: Math.floor(process.uptime()),
    });
}

async function ready(req, res, next) {
    const timeoutMs = 1500;

    try {
        await Promise.race([
            pool.query("SELECT 1"),
            new Promise((_, reject) =>
                setTimeout(() => {
                    const err = new Error("DB_TIMEOUT");
                    err.statusCode = 503;
                    reject(err);
                }, timeoutMs)
            ),
        ]);

        return res.json({ ok: true, status: "ready" });
    } catch (err) {
        err.statusCode = err.statusCode || 503;
        err.message = "DB_NOT_READY";
        return next(err);
    }
}

module.exports = { health, ready };