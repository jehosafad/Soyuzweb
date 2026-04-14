const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const { corsOptions, helmetOptions, bodyLimit } = require("./config/security");
const { UPLOADS_DIR } = require("./config/upload");
const { httpLogger } = require("./middlewares/httpLogger");
const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorHandler");
const {
    apiBurstLimiter,
    apiLimiter,
    contactBurstLimiter,
    contactLimiter,
} = require("./middlewares/rateLimit");
const { health, ready } = require("./controllers/healthController");

const contactRoutes = require("./routes/contactRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const clientRoutes = require("./routes/clientRoutes");
const publicRoutes = require("./routes/publicRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();
const uploadsPublicDir = path.join(__dirname, "../uploads");

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet(helmetOptions));
app.use(httpLogger);

app.use(express.json({ limit: bodyLimit }));

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use("/api", (req, res, next) => {
    if (req.path === "/health" || req.path === "/ready") return next();
    return apiBurstLimiter(req, res, () => apiLimiter(req, res, next));
});

app.get("/api/health", health);
app.get("/api/ready", ready);

// Ping para UptimeRobot — mantiene Render despierto
app.get("/ping", (req, res) => res.status(200).json({ status: "ok", uptime: process.uptime() }));

// ── Servir archivos multimedia subidos (portafolio, entregables) ──────────────
app.use("/uploads", express.static(UPLOADS_DIR, {
    maxAge: "7d",
    immutable: true,
    setHeaders(res, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if ([".mp4", ".webm", ".ogg"].includes(ext)) {
            res.setHeader("Content-Type", `video/${ext.slice(1)}`);
            res.setHeader("Accept-Ranges", "bytes");
        }
    },
}));
app.use("/uploads", express.static(uploadsPublicDir));

app.use("/api/contact", contactBurstLimiter, contactLimiter, contactRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
