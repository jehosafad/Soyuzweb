const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signAccessToken(user) {
    return jwt.sign(
        {
            sub: String(user.id),
            role: user.role,
            email: user.email,
            type: "access",
        },
        env.JWT_SECRET,
        {
            expiresIn: env.JWT_EXPIRES_IN,
            issuer: "soyuz-api",
            audience: "soyuz-admin",
        }
    );
}

function verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_SECRET, {
        issuer: "soyuz-api",
        audience: "soyuz-admin",
    });
}

module.exports = {
    signAccessToken,
    verifyAccessToken,
};