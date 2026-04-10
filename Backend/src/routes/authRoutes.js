const express = require("express");
const { login, register, forgot, reset } = require("../controllers/authController");
const { validateBody } = require("../middlewares/validate");
const {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require("../schemas/authSchema");

const router = express.Router();

router.post("/login", validateBody(loginSchema), login);
router.post("/register", validateBody(registerSchema), register);
router.post("/forgot-password", validateBody(forgotPasswordSchema), forgot);
router.post("/reset-password", validateBody(resetPasswordSchema), reset);

module.exports = router;