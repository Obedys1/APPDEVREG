-- =================================================================
--  SCRIPT DE CONFIGURAÇÃO INICIAL DO BANCO DE DADOS - GDM DEVOLUÇÕES
-- =================================================================
-- Este script cria as tabelas para devoluções e produtos,
-- habilita a segurança em nível de linha (RLS) e define as
-- políticas para garantir que os usuários só possam acessar
-- seus próprios dados. Também configura o bucket de armazenamento
-- para os anexos e suas respectivas políticas de segurança.
-- =================================================================

-- ========= TABELA DE DEVOLUÇÕES =========
-- Armazena o registro principal de cada devolução.
CREATE TABLE public.devolucoes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "date" timestamp with time zone NOT NULL,
    cliente text NOT NULL,
    motorista text NOT NULL,
    observacao text,
    status text NOT NULL DEFAULT 'pendente'::text,
    anexos_urls jsonb
);
COMMENT ON TABLE public.devolucoes IS 'Tabela principal para registros de devoluções.';

-- Habilita RLS (Row Level Security)
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança para a tabela 'devolucoes'
-- Os usuários só podem ver, criar, alterar e deletar seus próprios registros.
CREATE POLICY "Usuários podem ver suas próprias devoluções"
ON public.devolucoes FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem criar suas próprias devoluções"
ON public.devolucoes FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar suas próprias devoluções"
ON public.devolucoes FOR UPDATE
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar suas próprias devoluções"
ON public.devolucoes FOR DELETE
USING (auth.uid() = usuario_id);


-- ========= TABELA DE PRODUTOS DEVOLVIDOS =========
-- Armazena os produtos individuais associados a uma devolução.
CREATE TABLE public.produtos_devolvidos (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    devolution_id uuid NOT NULL REFERENCES public.devolucoes(id) ON DELETE CASCADE,
    codigo text,
    produto text NOT NULL,
    quantidade numeric NOT NULL,
    tipo text NOT NULL,
    motivo text NOT NULL,
    estado text,
    reincidencia text NOT NULL
);
COMMENT ON TABLE public.produtos_devolvidos IS 'Produtos específicos de cada devolução.';

-- Habilita RLS (Row Level Security)
ALTER TABLE public.produtos_devolvidos ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança para a tabela 'produtos_devolvidos'
-- Verifica se o usuário é o dono da devolução pai.
CREATE POLICY "Usuários podem gerenciar produtos de suas devoluções"
ON public.produtos_devolvidos FOR ALL
USING (
  (SELECT auth.uid()) = (SELECT usuario_id FROM public.devolucoes WHERE id = devolution_id)
);


-- ========= CONFIGURAÇÃO DO STORAGE (ARMAZENAMENTO) =========
-- Cria o bucket para armazenar as imagens de evidência.
INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos_devolucoes', 'anexos_devolucoes', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Segurança para o bucket 'anexos_devolucoes'
-- Garante que os usuários só possam acessar/enviar arquivos em sua própria pasta (identificada pelo seu user_id).
CREATE POLICY "Usuários podem ver seus próprios anexos"
ON storage.objects FOR SELECT
USING (bucket_id = 'anexos_devolucoes' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Usuários podem enviar anexos para sua pasta"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'anexos_devolucoes' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Usuários podem atualizar seus próprios anexos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'anexos_devolucoes' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Usuários podem deletar seus próprios anexos"
ON storage.objects FOR DELETE
USING (bucket_id = 'anexos_devolucoes' AND auth.uid() = (storage.foldername(name))[1]::uuid);
