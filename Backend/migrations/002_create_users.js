exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'citext') THEN
        CREATE EXTENSION citext;
      END IF;
    END $$;
  `);

    pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.users') IS NULL THEN
        CREATE TABLE public.users (
          id BIGSERIAL PRIMARY KEY,
          email CITEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role VARCHAR(32) NOT NULL DEFAULT 'admin',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      END IF;
    END $$;
  `);

    pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname='public'
          AND tablename='users'
          AND indexname='users_created_at_idx'
      ) THEN
        CREATE INDEX users_created_at_idx
          ON public.users (created_at DESC);
      END IF;
    END $$;
  `);
};

exports.down = () => {
    // NO-OP intencional para evitar borrados accidentales.
};