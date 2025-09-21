/*
          # [Add Client Detail Fields]
          This script adds new columns to the `devolucoes` table to store detailed client information.

          ## Query Description:
          - Adds `vendedor`, `rede`, `cidade`, and `uf` columns to the `public.devolucoes` table.
          - These fields will be automatically populated when a client is selected in the app.
          - This operation is non-destructive and safe to run on the existing table.

          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true (by dropping the columns)
          */

ALTER TABLE public.devolucoes
ADD COLUMN IF NOT EXISTS vendedor TEXT,
ADD COLUMN IF NOT EXISTS rede TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS uf TEXT;

COMMENT ON COLUMN public.devolucoes.vendedor IS 'Salesperson associated with the client.';
COMMENT ON COLUMN public.devolucoes.rede IS 'Client network or chain.';
COMMENT ON COLUMN public.devolucoes.cidade IS 'City of the client.';
COMMENT ON COLUMN public.devolucoes.uf IS 'State of the client.';
