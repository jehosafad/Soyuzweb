const { assertDbConnection, pool } = require("../config/db");
const { seedAdminFromEnv } = require("../services/authService");

async function run() {
    await assertDbConnection();
    const user = await seedAdminFromEnv();

    console.log(`Admin listo: ${user.email} (${user.role})`);
}

run()
    .catch((err) => {
        console.error("No se pudo preparar el admin:", err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });