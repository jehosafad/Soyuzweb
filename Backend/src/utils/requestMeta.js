function getClientIp(req) {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0].trim();
    return req.socket?.remoteAddress || null;
}

function getUserAgent(req) {
    const ua = req.headers["user-agent"];
    return typeof ua === "string" ? ua : null;
}

module.exports = { getClientIp, getUserAgent };