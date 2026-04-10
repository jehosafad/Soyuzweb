const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { corsOptions, helmetOptions, bodyLimit } = require("./config/security");
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

app.use("/api/contact", contactBurstLimiter, contactLimiter, contactRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;