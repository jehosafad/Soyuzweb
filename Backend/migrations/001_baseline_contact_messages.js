/**
 * Baseline seguro (idempotente) para Soyuz.
 *
 * ✅ NO borra ni toca datos existentes.
 * ✅ Si la tabla/extension/índices YA existen, no hace nada.
 * ✅ Si NO existen (nuevo entorno), los crea.
 *
 * Nota: el "down" es NO-OP para evitar borrados accidentales.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
    // 1) citext (solo si falta)
    pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'citext') THEN
        CREATE EXTENSION citext;
      END IF;
    END $$;
  `);

    // 2) tabla (solo si falta)
    pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.contact_messages') IS NULL THEN
        CREATE TABLE public.contact_messages (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          email CITEXT NOT NULL,
          subject VARCHAR(160) NOT NULL,
          message TEXT NOT NULL,
          ip INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      END IF;
    END $$;
  `);

    // 3) índices (solo si no existe alguno equivalente sobre la(s) columna(s))
    pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname='public'
          AND tablename='contact_messages'
          AND indexdef ILIKE '%(created_at%'
      ) THEN
        CREATE INDEX contact_messages_created_at_idx
          ON public.contact_messages (created_at DESC);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname='public'
          AND tablename='contact_messages'
          AND indexdef ILIKE '%(email%'
      ) THEN
        CREATE INDEX contact_messages_email_idx
          ON public.contact_messages (email);
      END IF;
    END $$;
  `);
};

exports.down = () => {
    // NO-OP intencional:
    // Este baseline protege tu tabla existente. Evitamos "DROP TABLE" por seguridad.
};