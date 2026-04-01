const express = require("express");
const { getMe, getLeads } = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validateQuery } = require("../middlewares/validate");
const { adminLeadsQuerySchema } = require("../schemas/adminSchema");

const router = express.Router();

router.get("/me", requireAuth, requireRole("admin"), getMe);

router.get(
    "/leads",
    requireAuth,
    requireRole("admin"),
    validateQuery(adminLeadsQuerySchema),
    getLeads
);

module.exports = router;