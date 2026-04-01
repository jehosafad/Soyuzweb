const { getAdminMe } = require("../services/authService");
const { listAdminLeads } = require("../services/adminLeadService");

async function getMe(req, res, next) {
    try {
        const user = await getAdminMe(req.auth.sub);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: user,
        });
    } catch (err) {
        return next(err);
    }
}

async function getLeads(req, res, next) {
    try {
        const result = await listAdminLeads(req.query);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            meta: result.meta,
            data: result.data,
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getMe,
    getLeads,
};