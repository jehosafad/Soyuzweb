const bcrypt = require("bcryptjs");
const env = require("../config/env");
const { assertDbConnection, pool } = require("../config/db");
const { upsertUser } = require("../repositories/userRepository");

async function run() {
    await assertDbConnection();

    const email = (process.env.TEST_USER_EMAIL || "cliente@soyuz.local").toLowerCase();
    const password = process.env.TEST_USER_PASSWORD || "Cliente12345!";
    const role = "user";

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

    const user = await upsertUser({
        email,
        passwordHash,
        role,
    });

    console.log(`User listo: ${user.email} (${user.role})`);
    console.log(`Password dev: ${password}`);
}

run()
    .catch((err) => {
        console.error("No se pudo preparar el user:", err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });