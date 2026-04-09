exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
    ALTER TABLE public.projects
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS projects_is_public_status_idx
      ON public.projects (is_public, status)
      WHERE is_public = true;
  `);
};

exports.down = () => {
    // NO-OP intencional para evitar pérdidas de datos en entornos activos.
};