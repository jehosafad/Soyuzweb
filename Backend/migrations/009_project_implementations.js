exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
    ALTER TABLE public.projects
      ADD COLUMN IF NOT EXISTS implementations TEXT[] DEFAULT '{}';
  `);
};

exports.down = () => {};
