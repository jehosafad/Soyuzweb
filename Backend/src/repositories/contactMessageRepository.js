const { pool } = require("../config/db");

async function hasDuplicateInWindow({ email, subject, message, windowSec }) {
    const query = `
    SELECT 1
    FROM public.contact_messages
    WHERE email = $1
      AND subject = $2
      AND message = $3
      AND created_at >= NOW() - ($4 * INTERVAL '1 second')
    LIMIT 1
  `;
    const result = await pool.query(query, [email, subject, message, windowSec]);
    return result.rowCount > 0;
}

async function countByEmailInWindow({ email, windowSec }) {
    const query = `
    SELECT COUNT(*)::int AS count
    FROM public.contact_messages
    WHERE email = $1
      AND created_at >= NOW() - ($2 * INTERVAL '1 second')
  `;
    const result = await pool.query(query, [email, windowSec]);
    return result.rows[0]?.count ?? 0;
}

async function insertContactMessage({ name, email, subject, message, ip, userAgent }) {
    const query = `
    INSERT INTO public.contact_messages (name, email, subject, message, ip, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, created_at
  `;
    const values = [name, email, subject, message, ip, userAgent];
    const result = await pool.query(query, values);
    return { id: result.rows[0].id, createdAt: result.rows[0].created_at };
}

function buildAdminLeadsWhere({ email, search, dateFrom, dateTo }) {
    const clauses = [];
    const values = [];

    if (email) {
        values.push(email);
        clauses.push(`email = $${values.length}`);
    }

    if (search) {
        values.push(`%${search}%`);
        const searchParam = `$${values.length}`;
        clauses.push(`
      (
        name ILIKE ${searchParam}
        OR subject ILIKE ${searchParam}
        OR message ILIKE ${searchParam}
      )
    `);
    }

    if (dateFrom) {
        values.push(dateFrom);
        clauses.push(`created_at >= $${values.length}::date`);
    }

    if (dateTo) {
        values.push(dateTo);
        clauses.push(`created_at < ($${values.length}::date + INTERVAL '1 day')`);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    return { whereSql, values };
}

async function findAdminLeads({
                                  page,
                                  limit,
                                  email,
                                  search,
                                  dateFrom,
                                  dateTo,
                                  sortBy,
                                  sortOrder,
                              }) {
    const { whereSql, values } = buildAdminLeadsWhere({
        email,
        search,
        dateFrom,
        dateTo,
    });

    const safeSortBy = sortBy === "created_at" ? "created_at" : "created_at";
    const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

    const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM public.contact_messages
    ${whereSql}
  `;

    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0]?.total ?? 0;

    const offset = (page - 1) * limit;
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const dataQuery = `
    SELECT
      id,
      name,
      email,
      subject,
      message,
      ip,
      user_agent,
      created_at
    FROM public.contact_messages
    ${whereSql}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT $${limitParam}
    OFFSET $${offsetParam}
  `;

    const dataValues = [...values, limit, offset];
    const dataResult = await pool.query(dataQuery, dataValues);

    return {
        total,
        rows: dataResult.rows,
    };
}

module.exports = {
    insertContactMessage,
    hasDuplicateInWindow,
    countByEmailInWindow,
    findAdminLeads,
};