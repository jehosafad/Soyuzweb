const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const env = require("../config/env");
const {
    findUserByEmail,
    findUserById,
    upsertUser,
    createUser,
    setResetToken,
    findUserByResetToken,
    updatePassword,
} = require("../repositories/userRepository");
const { signAccessToken } = require("../utils/authToken");

function toPublicUser(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name || null,
        phone: user.phone || null,
        createdAt: user.created_at,
    };
}

async function loginAdmin({ email, password }) {
    const user = await findUserByEmail(email);

    if (!user) {
        const err = new Error("Credenciales inválidas.");
        err.statusCode = 401;
        throw err;
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
        const err = new Error("Credenciales inválidas.");
        err.statusCode = 401;
        throw err;
    }

    const accessToken = signAccessToken(user);

    return {
        accessToken,
        tokenType: "Bearer",
        expiresIn: env.JWT_EXPIRES_IN,
        user: toPublicUser(user),
    };
}

async function registerUser({ email, password, fullName, phone }) {
    const existing = await findUserByEmail(email);

    if (existing) {
        const err = new Error("Ya existe una cuenta con ese correo electrónico.");
        err.statusCode = 409;
        throw err;
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

    const user = await createUser({
        email: email.toLowerCase(),
        passwordHash,
        role: "user",
        fullName,
        phone: phone || null,
    });

    const accessToken = signAccessToken(user);

    return {
        accessToken,
        tokenType: "Bearer",
        expiresIn: env.JWT_EXPIRES_IN,
        user: toPublicUser(user),
    };
}

async function forgotPassword({ email }) {
    const user = await findUserByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
        return { sent: true };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await setResetToken(email, token, expiresAt);

    // Send email (non-blocking, graceful degradation)
    try {
        const { sendPasswordResetEmail } = require("./emailService");
        await sendPasswordResetEmail({
            to: email,
            resetToken: token,
        });
    } catch {
        // Silent fail — email may not be configured
    }

    return { sent: true };
}

async function resetPassword({ token, password }) {
    const user = await findUserByResetToken(token);

    if (!user) {
        const err = new Error("El enlace de recuperación es inválido o ya fue usado.");
        err.statusCode = 400;
        throw err;
    }

    if (user.reset_token_expires && new Date(user.reset_token_expires) < new Date()) {
        const err = new Error("El enlace de recuperación ha expirado. Solicita uno nuevo.");
        err.statusCode = 400;
        throw err;
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
    await updatePassword(user.id, passwordHash);

    return { reset: true };
}

async function getAdminMe(userId) {
    const user = await findUserById(userId);

    if (!user) {
        const err = new Error("Usuario no encontrado.");
        err.statusCode = 401;
        throw err;
    }

    return toPublicUser(user);
}

async function seedAdminFromEnv() {
    const passwordHash = await bcrypt.hash(
        env.ADMIN_PASSWORD,
        env.BCRYPT_SALT_ROUNDS
    );

    return upsertUser({
        email: env.ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: env.ADMIN_ROLE,
    });
}

module.exports = {
    loginAdmin,
    registerUser,
    forgotPassword,
    resetPassword,
    getAdminMe,
    seedAdminFromEnv,
};