const { assertDbConnection, pool } = require("../config/db");

async function run() {
    await assertDbConnection();

    const clientEmail = (process.env.TEST_USER_EMAIL || "cliente@soyuz.local").toLowerCase();

    const userResult = await pool.query(
        `
    SELECT id, email, role
    FROM public.users
    WHERE email = $1
    LIMIT 1
    `,
        [clientEmail]
    );

    const user = userResult.rows[0];

    if (!user) {
        throw new Error(`No existe el usuario cliente ${clientEmail}. Crea primero el user de prueba.`);
    }

    if (user.role !== "user") {
        throw new Error(
            `El usuario ${clientEmail} existe, pero su rol actual es "${user.role}" y debe ser "user".`
        );
    }

    await pool.query("BEGIN");

    try {
        await pool.query(`DELETE FROM public.support_requests WHERE user_id = $1`, [user.id]);
        await pool.query(`DELETE FROM public.quotes WHERE user_id = $1`, [user.id]);
        await pool.query(`DELETE FROM public.subscriptions WHERE user_id = $1`, [user.id]);

        const existingProjects = await pool.query(
            `
      SELECT id
      FROM public.projects
      WHERE user_id = $1
      `,
            [user.id]
        );

        const projectIds = existingProjects.rows.map((row) => row.id);

        if (projectIds.length > 0) {
            await pool.query(
                `DELETE FROM public.delivered_files WHERE project_id = ANY($1::bigint[])`,
                [projectIds]
            );
            await pool.query(
                `DELETE FROM public.warranties WHERE project_id = ANY($1::bigint[])`,
                [projectIds]
            );
            await pool.query(
                `DELETE FROM public.project_status_history WHERE project_id = ANY($1::bigint[])`,
                [projectIds]
            );
            await pool.query(
                `DELETE FROM public.projects WHERE id = ANY($1::bigint[])`,
                [projectIds]
            );
        }

        const projectResult = await pool.query(
            `
      INSERT INTO public.projects (
        user_id,
        name,
        service_type,
        status,
        description,
        delivery_eta
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '10 days')
      RETURNING id, name, status
      `,
            [
                user.id,
                "Portal corporativo Soyuz Client Demo",
                "web_platform",
                "in_development",
                "Proyecto demo para validar Sprint 10 del portal del cliente.",
            ]
        );

        const project = projectResult.rows[0];

        await pool.query(
            `
      INSERT INTO public.project_status_history (project_id, status, note, changed_at)
      VALUES
        ($1, 'analysis', 'Requerimientos revisados y validados.', NOW() - INTERVAL '2 days'),
        ($1, 'in_development', 'Frontend base del portal en construcción.', NOW() - INTERVAL '1 day')
      `,
            [project.id]
        );

        await pool.query(
            `
      INSERT INTO public.delivered_files (
        project_id,
        original_name,
        download_label,
        storage_key,
        mime_type,
        size_bytes
      )
      VALUES
        ($1, 'brief-soyuz-demo.pdf', 'Brief inicial', 'dev/brief-soyuz-demo.pdf', 'application/pdf', 245760),
        ($1, 'access-checklist.txt', 'Checklist de accesos', 'dev/access-checklist.txt', 'text/plain', 4096)
      `,
            [project.id]
        );

        await pool.query(
            `
      INSERT INTO public.warranties (
        project_id,
        starts_at,
        ends_at,
        status,
        notes
      )
      VALUES (
        $1,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '6 months',
        'active',
        'Garantía base de mantenimiento incluida.'
      )
      `,
            [project.id]
        );

        await pool.query(
            `
      INSERT INTO public.subscriptions (
        user_id,
        plan_name,
        status,
        coverage_percent,
        starts_at,
        ends_at
      )
      VALUES (
        $1,
        'standard',
        'inactive',
        0,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '1 month'
      )
      `,
            [user.id]
        );

        await pool.query(
            `
      INSERT INTO public.quotes (
        user_id,
        project_id,
        title,
        description,
        amount_cents,
        currency,
        status,
        created_at,
        expires_at
      )
      VALUES (
        $1,
        $2,
        'Ajuste visual adicional',
        'Cotización demo para modificaciones fuera de garantía/premium.',
        185000,
        'MXN',
        'pending',
        NOW(),
        NOW() + INTERVAL '15 days'
      )
      `,
            [user.id, project.id]
        );

        await pool.query(
            `
      INSERT INTO public.support_requests (
        user_id,
        project_id,
        summary,
        details,
        status,
        created_at
      )
      VALUES (
        $1,
        $2,
        'Solicitud demo de soporte',
        'Revisión del módulo de navegación y validación del portal cliente.',
        'open',
        NOW()
      )
      `,
            [user.id, project.id]
        );

        await pool.query("COMMIT");

        console.log(`Portal demo listo para: ${user.email}`);
        console.log(`Proyecto demo: ${project.name}`);
    } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
    }
}

run()
    .catch((err) => {
        console.error("No se pudo sembrar el portal demo:", err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });