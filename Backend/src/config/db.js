const { Pool } = require("pg");
const env = require("./env");

// Supabase/Render usa DATABASE_URL; local usa variables individuales
const poolConfig = env.DATABASE_URL
    ? {
        connectionString: env.DATABASE_URL,
        ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
    }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
    };

const pool = new Pool(poolConfig);

async function assertDbConnection() {
    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
    } finally {
        client.release();
    }
}

module.exports = { pool, assertDbConnection };
