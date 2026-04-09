exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
    ALTER TABLE public.support_requests
      ADD COLUMN IF NOT EXISTS admin_response TEXT;

    ALTER TABLE public.support_requests
      ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

    ALTER TABLE public.support_requests
      ADD COLUMN IF NOT EXISTS responded_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL;

    ALTER TABLE public.quotes
      ADD COLUMN IF NOT EXISTS source_request_id BIGINT REFERENCES public.support_requests(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS support_requests_responded_by_idx
      ON public.support_requests (responded_by);

    CREATE INDEX IF NOT EXISTS quotes_source_request_id_idx
      ON public.quotes (source_request_id);
  `);
};

exports.down = () => {
    // NO-OP intencional para evitar borrados accidentales.
};