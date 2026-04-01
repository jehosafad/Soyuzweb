const { verifyAccessToken } = require("../utils/authToken");

function extractBearerToken(authorizationHeader) {
    if (!authorizationHeader || typeof authorizationHeader !== "string") {
        return null;
    }

    const [scheme, token] = authorizationHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        return null;
    }

    return token;
}

function requireAuth(req, res, next) {
    try {
        const token = extractBearerToken(req.headers.authorization);

        if (!token) {
            return res.status(401).json({
                ok: false,
                error: "UNAUTHORIZED",
                message: "Token requerido.",
                requestId: req.id || null,
            });
        }

        const payload = verifyAccessToken(token);
        req.auth = payload;

        return next();
    } catch {
        return res.status(401).json({
            ok: false,
            error: "UNAUTHORIZED",
            message: "Token inválido o expirado.",
            requestId: req.id || null,
        });
    }
}

function requireRole(role) {
    return (req, res, next) => {
        if (!req.auth || req.auth.role !== role) {
            return res.status(403).json({
                ok: false,
                error: "FORBIDDEN",
                message: "No autorizado para este recurso.",
                requestId: req.id || null,
            });
        }

        return next();
    };
}

module.exports = {
    requireAuth,
    requireRole,
};