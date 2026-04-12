const path = require("path");

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
require("dotenv").config({ path: path.join(__dirname, envFile), override: true });

// Usar DATABASE_URL directamente si existe (Supabase/Render)
const databaseUrl = process.env.DATABASE_URL || (() => {
    const user = encodeURIComponent(process.env.DB_USER || "postgres");
    const pass = encodeURIComponent(process.env.DB_PASSWORD || "postgres");
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || 5432;
    const db = process.env.DB_NAME || "soyuz_db";
    return `postgres://${user}:${pass}@${host}:${port}/${db}`;
})();

module.exports = {
    dir: "migrations",
    migrationsTable: "pgmigrations",
    databaseUrl,
};
