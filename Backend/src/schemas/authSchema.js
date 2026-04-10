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

const registerSchema = z.object({
    fullName: z
        .string()
        .trim()
        .min(2, "El nombre debe tener al menos 2 caracteres.")
        .max(120, "El nombre es demasiado largo."),
    email: z
        .string()
        .trim()
        .min(1, "Email requerido.")
        .email("Email inválido.")
        .transform((value) => value.toLowerCase()),
    phone: z
        .string()
        .trim()
        .max(20, "Teléfono demasiado largo.")
        .optional()
        .default(""),
    password: z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z
        .string()
        .min(1, "Confirma tu contraseña."),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, "Email requerido.")
        .email("Email inválido.")
        .transform((value) => value.toLowerCase()),
});

const resetPasswordSchema = z.object({
    token: z
        .string()
        .trim()
        .min(1, "Token requerido."),
    password: z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z
        .string()
        .min(1, "Confirma tu contraseña."),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
});

module.exports = {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
};