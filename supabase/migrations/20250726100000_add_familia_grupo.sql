/*
# [Schema Update] Adicionar campos de família e grupo aos produtos devolvidos
Este script adiciona as colunas `familia` e `grupo` à tabela `produtos_devolvidos` para permitir o armazenamento de informações de categorização de produtos.

## Query Description:
- **ALTER TABLE public.produtos_devolvidos:** Modifica a estrutura da tabela existente.
- **ADD COLUMN familia TEXT NOT NULL:** Adiciona a coluna `familia`, que é obrigatória para cada produto registrado, garantindo a integridade dos dados.
- **ADD COLUMN grupo TEXT:** Adiciona a coluna opcional `grupo`.

Esta operação é estrutural e não afeta os dados existentes.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Tabela afetada: `public.produtos_devolvidos`
- Colunas adicionadas: `familia` (TEXT, NOT NULL), `grupo` (TEXT)
*/

ALTER TABLE public.produtos_devolvidos
ADD COLUMN familia TEXT,
ADD COLUMN grupo TEXT;

-- Adicionando um valor padrão temporário para registros existentes para então aplicar o NOT NULL
UPDATE public.produtos_devolvidos SET familia = 'N/A' WHERE familia IS NULL;

-- Agora, aplicando a restrição NOT NULL
ALTER TABLE public.produtos_devolvidos ALTER COLUMN familia SET NOT NULL;
