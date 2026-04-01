const { z } = require("zod");

const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, "Email requerido.")
        .email("Email inválido.")
        .transform((value) => value.toLowerCase()),
    password: z
        .string()
        .min(8, "Password inválida."),
});

module.exports = { loginSchema };