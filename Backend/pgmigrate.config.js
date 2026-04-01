const path = require("path");

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
require("dotenv").config({ path: path.join(__dirname, envFile), override: true });

const env = require("./src/config/env");

const user = encodeURIComponent(env.DB_USER);
const pass = encodeURIComponent(env.DB_PASSWORD);
const host = env.DB_HOST;
const port = env.DB_PORT;
const db = env.DB_NAME;

const fallbackUrl = `postgres://${user}:${pass}@${host}:${port}/${db}`;

module.exports = {
    dir: "migrations",
    migrationsTable: "pgmigrations",
    databaseUrl: env.DATABASE_URL || fallbackUrl,
};