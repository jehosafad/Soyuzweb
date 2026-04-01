const request = require("supertest");
const app = require("../../src/app");
const {
    resetTestDb,
    countContactMessages,
} = require("../helpers/testDb");

describe("POST /api/contact", () => {
    beforeEach(async () => {
        await resetTestDb();
    });

    test("guarda un lead válido", async () => {
        const payload = {
            name: "Juan Pérez",
            email: "juan@test.com",
            subject: "Hola",
            message: "Quiero información de servicios.",
            website: "",
        };

        const response = await request(app)
            .post("/api/contact")
            .send(payload);

        expect(response.statusCode).toBe(201);
        expect(response.body.ok).toBe(true);
        expect(response.body.outcome).toBe("stored");
        expect(response.body.data.id).toBeDefined();
        expect(await countContactMessages()).toBe(1);
    });

    test("deduplica el segundo envío igual", async () => {
        const payload = {
            name: "Juan Pérez",
            email: "juan@test.com",
            subject: "Hola",
            message: "Quiero información de servicios.",
            website: "",
        };

        const first = await request(app).post("/api/contact").send(payload);
        const second = await request(app).post("/api/contact").send(payload);

        expect(first.statusCode).toBe(201);
        expect(second.statusCode).toBe(202);
        expect(second.body.ok).toBe(true);
        expect(second.body.outcome).toBe("deduped");
        expect(await countContactMessages()).toBe(1);
    });

    test("honeypot no inserta", async () => {
        const payload = {
            name: "Spam Bot",
            email: "spam@test.com",
            subject: "Spam",
            message: "Mensaje spam.",
            website: "https://spam.example",
        };

        const response = await request(app)
            .post("/api/contact")
            .send(payload);

        expect(response.statusCode).toBe(202);
        expect(response.body.ok).toBe(true);
        expect(response.body.outcome).toBe("honeypot");
        expect(await countContactMessages()).toBe(0);
    });
});