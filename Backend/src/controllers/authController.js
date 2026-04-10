const {
    loginAdmin,
    registerUser,
    forgotPassword,
    resetPassword,
} = require("../services/authService");

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

async function register(req, res, next) {
    try {
        const result = await registerUser(req.body);

        return res.status(201).json({
            ok: true,
            requestId: req.id || null,
            data: result,
            message: "Cuenta creada correctamente.",
        });
    } catch (err) {
        return next(err);
    }
}

async function forgot(req, res, next) {
    try {
        await forgotPassword(req.body);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            message: "Si el correo existe, recibirás un enlace de recuperación.",
        });
    } catch (err) {
        return next(err);
    }
}

async function reset(req, res, next) {
    try {
        await resetPassword(req.body);

        return res.status(200).json({
            ok: true,
            requestId: req.id || null,
            message: "Contraseña actualizada correctamente.",
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = { login, register, forgot, reset };