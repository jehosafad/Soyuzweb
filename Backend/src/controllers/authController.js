const { loginAdmin } = require("../services/authService");

async function login(req, res, next) {
    try {
        const result = await loginAdmin(req.body);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            data: result,
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = { login };