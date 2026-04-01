jest.mock("../../src/repositories/contactMessageRepository", () => ({
    insertContactMessage: jest.fn(),
    hasDuplicateInWindow: jest.fn(),
    countByEmailInWindow: jest.fn(),
}));

const {
    insertContactMessage,
    hasDuplicateInWindow,
    countByEmailInWindow,
} = require("../../src/repositories/contactMessageRepository");

const { createContactMessage } = require("../../src/services/contactMessageService");

describe("contactMessageService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("honeypot corta antes de tocar DB", async () => {
        const result = await createContactMessage({
            name: "Bot",
            email: "bot@test.com",
            subject: "Spam",
            message: "spam",
            website: "https://spam.example",
            ip: "127.0.0.1",
            userAgent: "jest",
        });

        expect(result.outcome).toBe("honeypot");
        expect(insertContactMessage).not.toHaveBeenCalled();
        expect(hasDuplicateInWindow).not.toHaveBeenCalled();
        expect(countByEmailInWindow).not.toHaveBeenCalled();
    });

    test("bloquea exceso de URLs", async () => {
        await expect(
            createContactMessage({
                name: "Juan",
                email: "juan@test.com",
                subject: "Hola",
                message: "http://a.com http://b.com http://c.com",
                website: "",
                ip: "127.0.0.1",
                userAgent: "jest",
            })
        ).rejects.toMatchObject({
            message: "SPAM_DETECTED",
            statusCode: 400,
        });
    });

    test("deduplica si ya existe dentro de ventana", async () => {
        countByEmailInWindow.mockResolvedValue(0);
        hasDuplicateInWindow.mockResolvedValue(true);

        const result = await createContactMessage({
            name: "Juan",
            email: "juan@test.com",
            subject: "Hola",
            message: "Mensaje normal",
            website: "",
            ip: "127.0.0.1",
            userAgent: "jest",
        });

        expect(result.outcome).toBe("deduped");
        expect(insertContactMessage).not.toHaveBeenCalled();
    });

    test("guarda si pasa validaciones", async () => {
        countByEmailInWindow.mockResolvedValue(0);
        hasDuplicateInWindow.mockResolvedValue(false);
        insertContactMessage.mockResolvedValue({
            id: 123,
            createdAt: "2026-03-17T10:00:00Z",
        });

        const result = await createContactMessage({
            name: "Juan",
            email: "juan@test.com",
            subject: "Hola",
            message: "Mensaje normal",
            website: "",
            ip: "127.0.0.1",
            userAgent: "jest",
        });

        expect(result.outcome).toBe("stored");
        expect(result.data.id).toBe(123);
        expect(insertContactMessage).toHaveBeenCalledTimes(1);
    });
});