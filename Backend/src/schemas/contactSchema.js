const { z } = require("zod");

const contactSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    subject: z.string().trim().min(2).max(160),
    message: z.string().trim().min(10).max(5000),

    // honeypot
    website: z.string().trim().max(200).optional(),
});

module.exports = { contactSchema };