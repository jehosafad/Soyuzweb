function buildValidationError(req, details) {
    return {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Entrada inválida.",
        details,
        requestId: req.id || null,
    };
}

function validateBody(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json(
                buildValidationError(req, parsed.error.flatten().fieldErrors)
            );
        }

        req.body = parsed.data;
        return next();
    };
}

function validateQuery(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.query);

        if (!parsed.success) {
            return res.status(400).json(
                buildValidationError(req, parsed.error.flatten().fieldErrors)
            );
        }

        req.query = parsed.data;
        return next();
    };
}

module.exports = { validateBody, validateQuery };