exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.projects') IS NULL THEN
        CREATE TABLE public.projects (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          name VARCHAR(160) NOT NULL,
          service_type VARCHAR(64) NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'pending',
          description TEXT,
          delivery_eta DATE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      END IF;
    END $$;
  `);

    pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.project_status_history') IS NULL THEN
        CREATE TABLE public.project_status_history (
          id BIGSERIAL PRIMARY KEY,
          project_id BIGINT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          status VARCHAR(32) NOT NULL,
          note TEXT,
          changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      END IF;
    END $$;
  `);

    pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.delivered_files') IS NULL THEN
        CREATE TABLE public.delivered_files (
          id BIGSERIAL PRIMARY KEY,
          project_id BIGINT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          original_name VARCHAR(255) NOT NULL,
          download_label VARCHAR(255) NOT NULL,
          storage_key TEXT NOT NULL,
          mime_type VARCHAR(120),
          size_bytes BIGINT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      END IF;
    END $$;
  `);

    pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.warranties') IS NULL THEN
        CREATE TABLE public.warranties (
          id BIGSERIAL PRIMARY KEY,
          project_id BIGINT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          starts_at DATE NOT NULL,
          ends_at DATE NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'active',
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      END IF;
    END $$;
  `);

    pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.subscriptions') IS NULL THEN
        CREATE TABLE public.subscriptions (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          plan_name VARCHAR(32) NOT NULL DEFAULT 'standard',
          status VARCHAR(32) NOT NULL DEFAULT 'inactive',
          coverage_percent INTEGER NOT NULL DEFAULT 0,
          starts_at DATE,
          ends_at DATE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      END IF;
    END $$;
  `);

    pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.quotes') IS NULL THEN
        CREATE TABLE public.quotes (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          project_id BIGINT REFERENCES public.projects(id) ON DELETE SET NULL,
          title VARCHAR(180) NOT NULL,
          description TEXT,
          amount_cents BIGINT NOT NULL,
          currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
          status VARCHAR(32) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ
        );
      END IF;
    END $$;
  `);

    pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.support_requests') IS NULL THEN
        CREATE TABLE public.support_requests (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          project_id BIGINT REFERENCES public.projects(id) ON DELETE SET NULL,
          summary VARCHAR(180) NOT NULL,
          details TEXT,
          status VARCHAR(32) NOT NULL DEFAULT 'open',
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
        WHERE schemaname = 'public'
          AND tablename = 'projects'
          AND indexname = 'projects_user_id_created_at_idx'
      ) THEN
        CREATE INDEX projects_user_id_created_at_idx
          ON public.projects (user_id, created_at DESC);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'project_status_history'
          AND indexname = 'project_status_history_project_id_changed_at_idx'
      ) THEN
        CREATE INDEX project_status_history_project_id_changed_at_idx
          ON public.project_status_history (project_id, changed_at DESC);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'delivered_files'
          AND indexname = 'delivered_files_project_id_created_at_idx'
      ) THEN
        CREATE INDEX delivered_files_project_id_created_at_idx
          ON public.delivered_files (project_id, created_at DESC);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'warranties'
          AND indexname = 'warranties_project_id_idx'
      ) THEN
        CREATE INDEX warranties_project_id_idx
          ON public.warranties (project_id);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'subscriptions'
          AND indexname = 'subscriptions_user_id_created_at_idx'
      ) THEN
        CREATE INDEX subscriptions_user_id_created_at_idx
          ON public.subscriptions (user_id, created_at DESC);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'quotes'
          AND indexname = 'quotes_user_id_created_at_idx'
      ) THEN
        CREATE INDEX quotes_user_id_created_at_idx
          ON public.quotes (user_id, created_at DESC);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'support_requests'
          AND indexname = 'support_requests_user_id_created_at_idx'
      ) THEN
        CREATE INDEX support_requests_user_id_created_at_idx
          ON public.support_requests (user_id, created_at DESC);
      END IF;
    END $$;
  `);
};

exports.down = () => {
    // NO-OP intencional para evitar borrados accidentales.
};