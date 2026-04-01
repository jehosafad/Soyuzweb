const request = require("supertest");
const app = require("../../src/app");
const env = require("../../src/config/env");
const { resetTestDb, prepareAdmin } = require("../helpers/testDb");

describe("POST /api/auth/login", () => {
    beforeEach(async () => {
        await resetTestDb();
        await prepareAdmin();
    });

    test("login admin exitoso", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: env.ADMIN_EMAIL,
                password: env.ADMIN_PASSWORD,
            });

        console.log("LOGIN_OK_RESPONSE:", response.statusCode, response.body);

        expect(response.statusCode).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.user.email).toBe(env.ADMIN_EMAIL);
        expect(response.body.data.user.role).toBe("admin");
    });

    test("rechaza credenciales inválidas", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: env.ADMIN_EMAIL,
                password: "password-incorrecta",
            });

        console.log("LOGIN_BAD_RESPONSE:", response.statusCode, response.body);

        expect(response.statusCode).toBe(401);
        expect(response.body.ok).toBe(false);
    });
});