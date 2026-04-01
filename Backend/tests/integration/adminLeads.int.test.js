const request = require("supertest");
const app = require("../../src/app");
const env = require("../../src/config/env");
const {
    resetTestDb,
    prepareAdmin,
    insertLead,
} = require("../helpers/testDb");

async function loginAsAdmin() {
    const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
            email: env.ADMIN_EMAIL,
            password: env.ADMIN_PASSWORD,
        });

    return loginResponse.body.data.accessToken;
}

describe("GET /api/admin/leads", () => {
    beforeEach(async () => {
        await resetTestDb();
        await prepareAdmin();

        await insertLead({
            name: "Test Uno",
            email: "test@test.com",
            subject: "Hola",
            message: "Mensaje de prueba web",
            createdAt: "2026-03-02T10:00:00Z",
        });

        await insertLead({
            name: "Test Dos",
            email: "otro@test.com",
            subject: "Cotización",
            message: "Necesito servicio premium",
            createdAt: "2026-03-05T12:00:00Z",
        });

        await insertLead({
            name: "Test Tres",
            email: "test@test.com",
            subject: "Seguimiento",
            message: "Seguimiento del servicio web",
            createdAt: "2026-03-06T09:00:00Z",
        });
    });

    test("lista leads con filtros combinados", async () => {
        const token = await loginAsAdmin();

        const response = await request(app)
            .get("/api/admin/leads?page=1&limit=5&email=test@test.com&dateFrom=2026-03-01&dateTo=2026-03-06&sortBy=created_at&sortOrder=desc")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(5);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0].email).toBe("test@test.com");
    });

    test("permite search", async () => {
        const token = await loginAsAdmin();

        const response = await request(app)
            .get("/api/admin/leads?search=servicio")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("rechaza sin token", async () => {
        const response = await request(app)
            .get("/api/admin/leads");

        expect(response.statusCode).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    test("rechaza query inválida", async () => {
        const token = await loginAsAdmin();

        const response = await request(app)
            .get("/api/admin/leads?dateFrom=2026-99-99")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(400);
        expect(response.body.ok).toBe(false);
    });
});