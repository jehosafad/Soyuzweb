exports.shorthands = undefined;

exports.up = (pgm) => {
    // ── 1. USERS: campos para registro público y recuperación de contraseña ──
    pgm.sql(`
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);

    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS reset_token TEXT;

    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS users_reset_token_idx
      ON public.users (reset_token)
      WHERE reset_token IS NOT NULL;

    CREATE INDEX IF NOT EXISTS users_phone_idx
      ON public.users (phone)
      WHERE phone IS NOT NULL;
  `);

    // ── 2. QUOTES: migrar de centavos a dólares, campos bot cotización ────────
    pgm.sql(`
    ALTER TABLE public.quotes
      ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(12,2) DEFAULT 0;

    ALTER TABLE public.quotes
      ADD COLUMN IF NOT EXISTS complexity VARCHAR(32);

    ALTER TABLE public.quotes
      ADD COLUMN IF NOT EXISTS service_category VARCHAR(64);

    ALTER TABLE public.quotes
      ADD COLUMN IF NOT EXISTS suggested_price_usd NUMERIC(12,2);

    -- Migrar datos existentes de centavos MXN a USD (estimado 1 MXN = 0.058 USD)
    UPDATE public.quotes
    SET amount_usd = ROUND(amount_cents / 100.0 * 0.058, 2)
    WHERE amount_usd = 0 AND amount_cents > 0;

    ALTER TABLE public.quotes
      ALTER COLUMN currency SET DEFAULT 'USD';
  `);

    // ── 3. PAGOS PAYPAL ──────────────────────────────────────────────────────
    pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.payments') IS NULL THEN
        CREATE TABLE public.payments (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          quote_id BIGINT REFERENCES public.quotes(id) ON DELETE SET NULL,
          subscription_id BIGINT REFERENCES public.subscriptions(id) ON DELETE SET NULL,
          paypal_order_id VARCHAR(64),
          paypal_capture_id VARCHAR(64),
          amount_usd NUMERIC(12,2) NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'pending',
          description TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX payments_user_id_created_at_idx
          ON public.payments (user_id, created_at DESC);

        CREATE INDEX payments_paypal_order_id_idx
          ON public.payments (paypal_order_id)
          WHERE paypal_order_id IS NOT NULL;

        CREATE INDEX payments_status_idx
          ON public.payments (status);
      END IF;
    END $$;
  `);

    // ── 4. PORTAFOLIO MULTIMEDIA ─────────────────────────────────────────────
    pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.portfolio_media') IS NULL THEN
        CREATE TABLE public.portfolio_media (
          id BIGSERIAL PRIMARY KEY,
          project_id BIGINT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          media_type VARCHAR(16) NOT NULL CHECK (media_type IN ('image', 'video')),
          storage_key TEXT NOT NULL,
          original_name VARCHAR(255),
          caption TEXT,
          sort_order INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX portfolio_media_project_id_sort_idx
          ON public.portfolio_media (project_id, sort_order ASC);
      END IF;
    END $$;
  `);

    // ── 5. PROJECTS: agregar descripción larga para portafolio ────────────────
    pgm.sql(`
    ALTER TABLE public.projects
      ADD COLUMN IF NOT EXISTS portfolio_description TEXT;

    ALTER TABLE public.projects
      ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
  `);
};

exports.down = () => {
    // NO-OP intencional para evitar pérdidas de datos en entornos activos.
};
