/*
# [Atualização Completa de Políticas de Acesso e Segurança]
Este script ajusta as políticas de segurança (RLS) para o armazenamento de arquivos e as tabelas de dados,
além de corrigir um aviso de segurança relacionado a funções do banco de dados.

## Sumário das Mudanças:
1.  **Armazenamento de Anexos:** Garante que o bucket 'anexos_devolucoes' seja público e permite que
    qualquer usuário autenticado visualize todas as imagens, corrigindo o erro de visualização no modal.
    Apenas o proprietário de um arquivo pode atualizá-lo ou excluí-lo.
2.  **Compartilhamento de Dados:** Modifica as políticas das tabelas 'devolucoes' e 'produtos_devolvidos'
    para permitir que todos os usuários autenticados vejam todos os registros, criando um banco de dados
    compartilhado. A inserção, atualização e exclusão de registros permanecem restritas ao proprietário.
3.  **Correção de Segurança:** Ajusta a função 'ensure_profile_exists' para definir um 'search_path' explícito,
    mitigando uma vulnerabilidade e resolvendo o aviso de segurança do Supabase.

## Instruções:
Execute este script em seu banco de dados Supabase para aplicar as novas políticas.
Após a execução, o compartilhamento de dados e a visualização de imagens funcionarão conforme o esperado.
*/

-- =================================================================
-- 1. Configurar Bucket de Armazenamento para Acesso Compartilhado
-- =================================================================

/*
# [Configuração do Bucket e RLS para 'anexos_devolucoes']
Garante que o bucket de anexos exista, seja público e tenha as políticas de segurança corretas.

## Descrição da Query:
- Cria o bucket 'anexos_devolucoes' se ele não existir.
- Define o bucket como público, necessário para acessar arquivos por URL.
- Remove políticas RLS existentes para evitar conflitos.
- Cria novas políticas:
  - `select_authenticated`: Permite que qualquer usuário logado visualize qualquer imagem.
  - `insert_authenticated`: Permite que qualquer usuário logado envie novas imagens.
  - `update_owner`: Permite que um usuário atualize apenas suas próprias imagens.
  - `delete_owner`: Permite que um usuário exclua apenas suas próprias imagens.
Isso corrige o erro "imagem não encontrada" e habilita a visualização compartilhada.

## Metadados:
- Categoria do Esquema: "Estrutural"
- Nível de Impacto: "Médio"
- Requer Backup: false
- Reversível: true (restaurando políticas anteriores)
*/

-- Cria o bucket se ele não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos_devolucoes', 'anexos_devolucoes', true)
ON CONFLICT (id) DO NOTHING;

-- Remove políticas existentes para garantir um estado limpo
DROP POLICY IF EXISTS "select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "update_owner" ON storage.objects;
DROP POLICY IF EXISTS "delete_owner" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view all images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own images" ON storage.objects;

-- Permite que qualquer usuário autenticado VEJA qualquer arquivo no bucket
CREATE POLICY "select_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'anexos_devolucoes');

-- Permite que qualquer usuário autenticado FAÇA UPLOAD de arquivos
CREATE POLICY "insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'anexos_devolucoes');

-- Permite que usuários ATUALIZEM seus próprios arquivos
CREATE POLICY "update_owner"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid() = owner)
WITH CHECK (auth.uid() = owner);

-- Permite que usuários EXCLUAM seus próprios arquivos
CREATE POLICY "delete_owner"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid() = owner);


-- =================================================================
-- 2. Atualizar RLS das Tabelas para Visibilidade Compartilhada
-- =================================================================

/*
# [Atualização da Política RLS para 'devolucoes' e 'produtos_devolvidos']
Modifica as políticas RLS para permitir que todos os usuários autenticados visualizem todos os registros.

## Descrição da Query:
- Habilita RLS nas tabelas, se ainda não estiver habilitado.
- Remove políticas existentes para evitar conflitos.
- Cria novas políticas:
  - `select_all_authenticated`: Permite que qualquer usuário logado leia todos os registros.
  - `insert_own`: Permite que usuários insiram novos registros vinculados ao seu próprio ID.
  - `update_own`: Permite que usuários atualizem seus próprios registros.
  - `delete_own`: Permite que usuários excluam seus próprios registros.
Isso atende diretamente ao requisito de que todos os usuários vejam todos os dados.

## Metadados:
- Categoria do Esquema: "Estrutural"
- Nível de Impacto: "Alto"
- Requer Backup: false
- Reversível: true (restaurando políticas anteriores)
*/

-- Habilita RLS se não estiver ativo
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_devolvidos ENABLE ROW LEVEL SECURITY;

-- Remove políticas existentes em 'devolucoes'
DROP POLICY IF EXISTS "select_all_authenticated" ON public.devolucoes;
DROP POLICY IF EXISTS "insert_own" ON public.devolucoes;
DROP POLICY IF EXISTS "update_own" ON public.devolucoes;
DROP POLICY IF EXISTS "delete_own" ON public.devolucoes;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.devolucoes;
DROP POLICY IF EXISTS "Users can insert their own records" ON public.devolucoes;
DROP POLICY IF EXISTS "Users can update their own records" ON public.devolucoes;
DROP POLICY IF EXISTS "Users can delete their own records" ON public.devolucoes;

-- Políticas para a tabela 'devolucoes'
CREATE POLICY "select_all_authenticated" ON public.devolucoes
FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_own" ON public.devolucoes
FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "update_own" ON public.devolucoes
FOR UPDATE TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "delete_own" ON public.devolucoes
FOR DELETE TO authenticated USING (auth.uid() = usuario_id);

-- Remove políticas existentes em 'produtos_devolvidos'
DROP POLICY IF EXISTS "select_all_authenticated" ON public.produtos_devolvidos;
DROP POLICY IF EXISTS "insert_based_on_devolution" ON public.produtos_devolvidos;
DROP POLICY IF EXISTS "update_based_on_devolution" ON public.produtos_devolvidos;
DROP POLICY IF EXISTS "delete_based_on_devolution" ON public.produtos_devolvidos;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.produtos_devolvidos;

-- Políticas para a tabela 'produtos_devolvidos'
CREATE POLICY "select_all_authenticated" ON public.produtos_devolvidos
FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_based_on_devolution" ON public.produtos_devolvidos
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.devolucoes WHERE id = devolution_id AND auth.uid() = usuario_id));

CREATE POLICY "update_based_on_devolution" ON public.produtos_devolvidos
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.devolucoes WHERE id = devolution_id AND auth.uid() = usuario_id));

CREATE POLICY "delete_based_on_devolution" ON public.produtos_devolvidos
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.devolucoes WHERE id = devolution_id AND auth.uid() = usuario_id));


-- =================================================================
-- 3. Corrigir Aviso de Segurança: Caminho de Busca da Função
-- =================================================================

/*
# [Melhoria de Segurança da Função: 'ensure_profile_exists']
Aumenta a segurança da função `ensure_profile_exists` definindo explicitamente seu caminho de busca.

## Descrição da Query:
- Recria a função `ensure_profile_exists`.
- Adiciona `SET search_path = 'public'` à configuração da função. Isso garante que a função procure
  objetos apenas no esquema `public`, prevenindo ataques de sequestro de caminho de busca.
- Resolve diretamente o aviso de segurança "[WARN] Function Search Path Mutable".

## Metadados:
- Categoria do Esquema: "Seguro"
- Nível de Impacto: "Baixo"
- Requer Backup: false
- Reversível: true
*/

CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (auth.uid(), auth.jwt()->>'email')
  ON CONFLICT (id) DO NOTHING;
END;
$$;
