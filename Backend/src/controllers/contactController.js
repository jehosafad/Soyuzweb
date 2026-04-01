const { createContactMessage } = require("../services/contactMessageService");
const { getClientIp, getUserAgent } = require("../utils/requestMeta");

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