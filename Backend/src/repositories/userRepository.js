const { pool } = require("../config/db");

async function findUserByEmail(email) {
    const query = `
    SELECT id, email, password_hash, role, full_name, phone, created_at
    FROM public.users
    WHERE email = $1
    LIMIT 1
  `;

    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
}

async function findUserById(id) {
    const query = `
    SELECT id, email, role, full_name, phone, created_at
    FROM public.users
    WHERE id = $1
    LIMIT 1
  `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
}

async function upsertUser({ email, passwordHash, role }) {
    const query = `
    INSERT INTO public.users (email, password_hash, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (email)
    DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role
    RETURNING id, email, role, created_at
  `;

    const values = [email, passwordHash, role];
    const result = await pool.query(query, values);
    return result.rows[0];
}

async function createUser({ email, passwordHash, role, fullName, phone }) {
    const query = `
    INSERT INTO public.users (email, password_hash, role, full_name, phone)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, email, role, full_name, phone, created_at
  `;

    const values = [email, passwordHash, role || "user", fullName || null, phone || null];
    const result = await pool.query(query, values);
    return result.rows[0];
}

async function setResetToken(email, token, expiresAt) {
    const query = `
    UPDATE public.users
    SET reset_token = $2, reset_token_expires = $3
    WHERE email = $1
    RETURNING id, email
  `;

    const result = await pool.query(query, [email, token, expiresAt]);
    return result.rows[0] || null;
}

async function findUserByResetToken(token) {
    const query = `
    SELECT id, email, reset_token, reset_token_expires
    FROM public.users
    WHERE reset_token = $1
    LIMIT 1
  `;

    const result = await pool.query(query, [token]);
    return result.rows[0] || null;
}

async function updatePassword(userId, passwordHash) {
    const query = `
    UPDATE public.users
    SET password_hash = $2, reset_token = NULL, reset_token_expires = NULL
    WHERE id = $1
    RETURNING id, email
  `;

    const result = await pool.query(query, [userId, passwordHash]);
    return result.rows[0] || null;
}

module.exports = {
    findUserByEmail,
    findUserById,
    upsertUser,
    createUser,
    setResetToken,
    findUserByResetToken,
    updatePassword,
};