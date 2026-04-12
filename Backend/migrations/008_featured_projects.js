exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
    ALTER TABLE public.projects
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS projects_is_featured_idx
      ON public.projects (is_featured)
      WHERE is_featured = true;
  `);
};

exports.down = () => {};
