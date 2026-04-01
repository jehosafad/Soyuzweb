const { pool } = require("../config/db");

async function findUserByEmail(email) {
    const query = `
    SELECT id, email, password_hash, role, created_at
    FROM public.users
    WHERE email = $1
    LIMIT 1
  `;

    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
}

async function findUserById(id) {
    const query = `
    SELECT id, email, role, created_at
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

module.exports = {
    findUserByEmail,
    findUserById,
    upsertUser,
};