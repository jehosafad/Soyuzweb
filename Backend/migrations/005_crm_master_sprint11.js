exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
    ALTER TABLE public.contact_messages
      ADD COLUMN IF NOT EXISTS admin_status TEXT NOT NULL DEFAULT 'open';

    ALTER TABLE public.contact_messages
      ADD COLUMN IF NOT EXISTS admin_note TEXT;

    CREATE INDEX IF NOT EXISTS contact_messages_admin_status_idx
      ON public.contact_messages (admin_status);
  `);
};

exports.down = () => {
    // NO-OP intencional para evitar pérdidas de datos en entornos activos.
};