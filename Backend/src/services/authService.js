const bcrypt = require("bcryptjs");
const env = require("../config/env");
const {
    findUserByEmail,
    findUserById,
    upsertUser,
} = require("../repositories/userRepository");
const { signAccessToken } = require("../utils/authToken");

function toPublicUser(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
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
    getAdminMe,
    seedAdminFromEnv,
};