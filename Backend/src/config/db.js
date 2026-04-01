const { Pool } = require("pg");
const env = require("./env");

const pool = new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
});

// Fail fast si la DB no responde (útil en dev/CI)
async function assertDbConnection() {
    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
    } finally {
        client.release();
    }
}

module.exports = { pool, assertDbConnection };