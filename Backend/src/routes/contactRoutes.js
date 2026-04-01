const express = require("express");
const { createContactMessage } = require("../controllers/contactController");
const { validateBody } = require("../middlewares/validate");
const { contactSchema } = require("../schemas/contactSchema");

const router = express.Router();

router.post("/", validateBody(contactSchema), createContactMessage);

module.exports = router;