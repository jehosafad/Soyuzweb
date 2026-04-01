const app = require("./app");
const env = require("./config/env");
const { assertDbConnection, pool } = require("./config/db");

let server = null;
let isShuttingDown = false;

async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`🛑 Señal recibida: ${signal}. Cerrando Soyuz API...`);

    const forceExitTimer = setTimeout(() => {
        console.error("❌ Cierre forzado por timeout.");
        process.exit(1);
    }, 10_000);

    forceExitTimer.unref();

    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) return reject(err);
                    return resolve();
                });
            });
        }

        await pool.end();

        clearTimeout(forceExitTimer);
        console.log("✅ Soyuz API cerrada correctamente.");
        process.exit(0);
    } catch (err) {
        clearTimeout(forceExitTimer);
        console.error("❌ Error durante shutdown:", err?.message);
        process.exit(1);
    }
}

async function start() {
    await assertDbConnection();

    server = app.listen(env.PORT, () => {
        console.log(`✅ Soyuz API corriendo en http://localhost:${env.PORT}`);
    });

    server.requestTimeout = env.SERVER_REQUEST_TIMEOUT_MS;
    server.headersTimeout = env.SERVER_HEADERS_TIMEOUT_MS;
    server.keepAliveTimeout = env.SERVER_KEEP_ALIVE_TIMEOUT_MS;
    server.setTimeout(env.SERVER_REQUEST_TIMEOUT_MS);
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

process.on("unhandledRejection", (reason) => {
    console.error("❌ unhandledRejection:", reason);
    void shutdown("unhandledRejection");
});

process.on("uncaughtException", (err) => {
    console.error("❌ uncaughtException:", err);
    void shutdown("uncaughtException");
});

start().catch((err) => {
    console.error("❌ No se pudo iniciar el servidor:", err?.message);
    process.exit(1);
});