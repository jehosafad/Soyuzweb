// controllers/contactController.js (fuera de src)

const { createContactMessage } = require("../src/services/contactMessageService");
const { getClientIp, getUserAgent } = require("../src/utils/requestMeta");

async function createContactMessageHandler(req, res, next) {
    try {
        const { name, email, subject, message, website } = req.body;

        const ip = getClientIp(req);
        const userAgent = getUserAgent(req);

        const result = await createContactMessage({
            name,
            email,
            subject,
            message,
            website,
            ip,
            userAgent,
        });

        const status = result.outcome === "stored" ? 201 : 202;

        return res.status(status).json({
            ok: true,
            requestId: req.id || null,
            ...result,
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = { createContactMessage: createContactMessageHandler };
// controllers/contactController.js (fuera de src)
// Este archivo solo re-exporta el controller real de src para evitar duplicados.
module.exports = require("../src/controllers/contactController");