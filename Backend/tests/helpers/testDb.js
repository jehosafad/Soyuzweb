const { pool } = require("../../src/config/db");
const { seedAdminFromEnv } = require("../../src/services/authService");

async function resetTestDb() {
    await pool.query("TRUNCATE TABLE public.contact_messages RESTART IDENTITY CASCADE");
    await pool.query("TRUNCATE TABLE public.users RESTART IDENTITY CASCADE");
}

async function prepareAdmin() {
    return seedAdminFromEnv();
}

async function countContactMessages() {
    const result = await pool.query(
        "SELECT COUNT(*)::int AS count FROM public.contact_messages"
    );
    return result.rows[0].count;
}

async function insertLead({
                              name,
                              email,
                              subject,
                              message,
                              ip = "127.0.0.1",
                              userAgent = "jest-test",
                              createdAt = null,
                          }) {
    if (createdAt) {
        const result = await pool.query(
            `
            INSERT INTO public.contact_messages
            (name, email, subject, message, ip, user_agent, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
            RETURNING id, created_at
            `,
            [name, email, subject, message, ip, userAgent, createdAt]
        );

        return result.rows[0];
    }

    const result = await pool.query(
        `
        INSERT INTO public.contact_messages
        (name, email, subject, message, ip, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at
        `,
        [name, email, subject, message, ip, userAgent]
    );

    return result.rows[0];
}

module.exports = {
    resetTestDb,
    prepareAdmin,
    countContactMessages,
    insertLead,
};