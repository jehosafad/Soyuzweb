const express = require("express");
const { login } = require("../controllers/authController");
const { validateBody } = require("../middlewares/validate");
const { loginSchema } = require("../schemas/authSchema");

const router = express.Router();

router.post("/login", validateBody(loginSchema), login);

module.exports = router;