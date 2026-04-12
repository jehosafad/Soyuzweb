const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: path.join(__dirname, "../../", envFile), override: true });

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),

    CORS_ORIGINS: z.string().optional(),
    FRONTEND_ORIGIN: z.string().min(1).default("http://localhost:5173"),

    BODY_LIMIT: z.string().default("10kb"),

    RATE_LIMIT_API_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_API_LIMIT: z.coerce.number().int().positive().default(300),
    RATE_LIMIT_API_BURST_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_API_BURST_LIMIT: z.coerce.number().int().positive().default(60),

    RATE_LIMIT_CONTACT_WINDOW_MS: z.coerce.number().int().positive().default(600000),
    RATE_LIMIT_CONTACT_LIMIT: z.coerce.number().int().positive().default(20),
    RATE_LIMIT_CONTACT_BURST_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_CONTACT_BURST_LIMIT: z.coerce.number().int().positive().default(5),

    SERVER_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    SERVER_HEADERS_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
    SERVER_KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().positive().default(65000),

    CONTACT_DEDUPE_WINDOW_SEC: z.coerce.number().int().positive().default(600),
    CONTACT_EMAIL_WINDOW_SEC: z.coerce.number().int().positive().default(600),
    CONTACT_MAX_PER_EMAIL_WINDOW: z.coerce.number().int().positive().default(3),
    CONTACT_MAX_URLS: z.coerce.number().int().nonnegative().default(2),

    LOG_LEVEL: z.string().optional(),

    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default("8h"),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
    ADMIN_EMAIL: z.string().email(),
    ADMIN_PASSWORD: z.string().min(8),
    ADMIN_ROLE: z.enum(["admin"]).default("admin"),

    DB_HOST: z.string().min(1).optional().default("localhost"),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_USER: z.string().min(1).optional().default("postgres"),
    DB_PASSWORD: z.string().min(1).optional().default("postgres"),
    DB_NAME: z.string().min(1).optional().default("soyuz_db"),

    DATABASE_URL: z.string().optional(),

    // PayPal (opcionales — si no están, el módulo de pagos queda deshabilitado)
    PAYPAL_CLIENT_ID: z.string().optional(),
    PAYPAL_SECRET: z.string().optional(),
    PAYPAL_MODE: z.enum(["sandbox", "production"]).default("sandbox"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Variables de entorno inválidas:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}

module.exports = parsed.data;