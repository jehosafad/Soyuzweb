const { findAdminLeads } = require("../repositories/contactMessageRepository");

function toAdminLead(row) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        subject: row.subject,
        message: row.message,
        ip: row.ip,
        userAgent: row.user_agent,
        createdAt: row.created_at,
    };
}

function normalizeListParams(raw = {}) {
    const parsedPage = Number.parseInt(raw.page, 10);
    const parsedLimit = Number.parseInt(raw.limit, 10);

    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 100)
            : 10;

    return {
        page,
        limit,
        email: raw.email || undefined,
        search: raw.search || undefined,
        dateFrom: raw.dateFrom || undefined,
        dateTo: raw.dateTo || undefined,
        sortBy: raw.sortBy === "created_at" ? "created_at" : "created_at",
        sortOrder: raw.sortOrder === "asc" ? "asc" : "desc",
    };
}

async function listAdminLeads(rawParams) {
    const params = normalizeListParams(rawParams);
    const result = await findAdminLeads(params);

    return {
        meta: {
            page: params.page,
            limit: params.limit,
            total: result.total,
            totalPages: result.total === 0 ? 0 : Math.ceil(result.total / params.limit),
        },
        data: result.rows.map(toAdminLead),
    };
}

module.exports = { listAdminLeads };