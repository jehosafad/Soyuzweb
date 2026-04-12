const express = require("express");
const { login, register, forgot, reset } = require("../controllers/authController");
const { validateBody } = require("../middlewares/validate");
const { loginLimiter } = require("../middlewares/rateLimit");
const {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require("../schemas/authSchema");

const router = express.Router();

router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.post("/register", loginLimiter, validateBody(registerSchema), register);
router.post("/forgot-password", loginLimiter, validateBody(forgotPasswordSchema), forgot);
router.post("/reset-password", validateBody(resetPasswordSchema), reset);

module.exports = router;