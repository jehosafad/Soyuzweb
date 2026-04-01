const { z } = require("zod");

const emptyToUndefined = (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
};

function isValidIsoDate(value) {
    if (typeof value !== "string") return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const adminLeadsQuerySchema = z
    .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),

        email: z.preprocess(
            emptyToUndefined,
            z.string()
                .trim()
                .email("Email inválido.")
                .max(254)
                .transform((value) => value.toLowerCase())
                .optional()
        ),

        search: z.preprocess(
            emptyToUndefined,
            z.string().trim().min(1).max(120).optional()
        ),

        dateFrom: z.preprocess(
            emptyToUndefined,
            z.string()
                .refine(isValidIsoDate, "dateFrom inválido. Usa YYYY-MM-DD.")
                .optional()
        ),

        dateTo: z.preprocess(
            emptyToUndefined,
            z.string()
                .refine(isValidIsoDate, "dateTo inválido. Usa YYYY-MM-DD.")
                .optional()
        ),

        sortBy: z.enum(["created_at"]).default("created_at"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
    .superRefine((data, ctx) => {
        if (data.dateFrom && data.dateTo && data.dateTo < data.dateFrom) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["dateTo"],
                message: "dateTo no puede ser menor que dateFrom.",
            });
        }
    });

module.exports = { adminLeadsQuerySchema };