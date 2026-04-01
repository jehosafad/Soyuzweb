const env = require("../config/env");
const {
    insertContactMessage,
    hasDuplicateInWindow,
    countByEmailInWindow,
} = require("../repositories/contactMessageRepository");

function countUrls(text) {
    const matches = String(text || "").match(/https?:\/\/|www\./gi);
    return matches ? matches.length : 0;
}

async function createContactMessage({ name, email, subject, message, website, ip, userAgent }) {
    // 1) Honeypot: si viene lleno, NO guardamos
    const honeypot = typeof website === "string" ? website.trim() : "";
    if (honeypot.length > 0) {
        return { outcome: "honeypot", data: { accepted: true } };
    }

    const clean = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        ip,
        userAgent,
    };

    // 2) Bloqueo simple por exceso de URLs
    if (countUrls(clean.message) > env.CONTACT_MAX_URLS) {
        const err = new Error("SPAM_DETECTED");
        err.statusCode = 400;
        throw err;
    }

    // 3) Rate limit por email (en DB)
    const count = await countByEmailInWindow({
        email: clean.email,
        windowSec: env.CONTACT_EMAIL_WINDOW_SEC,
    });

    if (count >= env.CONTACT_MAX_PER_EMAIL_WINDOW) {
        const err = new Error("RATE_LIMIT");
        err.statusCode = 429;
        throw err;
    }

    // 4) Dedupe por ventana
    const dup = await hasDuplicateInWindow({
        email: clean.email,
        subject: clean.subject,
        message: clean.message,
        windowSec: env.CONTACT_DEDUPE_WINDOW_SEC,
    });

    if (dup) {
        return { outcome: "deduped", data: { accepted: true, deduped: true } };
    }

    // 5) Insert real
    const saved = await insertContactMessage(clean);
    return { outcome: "stored", data: saved };
}

module.exports = { createContactMessage };