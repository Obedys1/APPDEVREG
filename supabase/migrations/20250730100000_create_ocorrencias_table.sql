/*
          # Criação da Tabela de Ocorrências e Listas de Enumeração
          Este script cria a nova tabela `ocorrencias` para armazenar os registros de ocorrências, juntamente com os tipos enumerados (ENUM) necessários para os campos de lista, como setor, motivo e impactos.

          ## Query Description: Este script é estrutural e seguro. Ele adiciona uma nova tabela e tipos de dados sem afetar os dados existentes nas tabelas `devolucoes` ou `produtos_devolvidos`. Nenhuma informação será perdida.
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - **Tabelas Criadas:**
            - `ocorrencias`: Armazena os dados de cada registro de ocorrência.
          - **Tipos ENUM Criados:**
            - `setor_responsavel_enum`: Lista de setores responsáveis.
            - `motivo_ocorrencia_enum`: Lista de motivos de ocorrência.
            - `impacto_ocorrencia_enum`: Lista de possíveis impactos.
          - **Colunas na tabela `ocorrencias`:**
            - `id`, `created_at`, `usuario_id`: Padrão.
            - `data`, `cliente`, `motorista`, `vendedor`, `rede`, `cidade`, `uf`, `reincidencia`: Campos de informação geral.
            - `setor_responsavel`, `motivo_ocorrencia`, `resumo_ocorrencia`, `tratativa`, `impactos`: Campos específicos da ocorrência.
          
          ## Security Implications:
          - RLS Status: Habilitado por padrão na nova tabela `ocorrencias`.
          - Policy Changes: Novas políticas de RLS serão criadas para a tabela `ocorrencias`, permitindo que usuários autenticados insiram e visualizem seus próprios registros.
          - Auth Requirements: Requer um usuário autenticado para interagir com a tabela.
          
          ## Performance Impact:
          - Indexes: Índices são criados automaticamente para a chave primária (`id`) e a chave estrangeira (`usuario_id`).
          - Triggers: Nenhum trigger novo é adicionado neste script.
          - Estimated Impact: Mínimo. A criação da tabela não afeta o desempenho das operações existentes.
          */

-- 1. Criar os tipos ENUM para as listas
CREATE TYPE public.setor_responsavel_enum AS ENUM (
    'Comercial',
    'Qualidade',
    'Transporte',
    'Compras',
    'Estoque',
    'Expedição',
    'Separação',
    'Faturamento',
    'Cliente',
    'Outro'
);

CREATE TYPE public.motivo_ocorrencia_enum AS ENUM (
    'Diferença de preço',
    'Divergência de quantidade',
    'Sem pedido',
    'Erro de digitação',
    'Produto sem cadastro',
    'Sem agendamento',
    'Desacordo com o pedido',
    'Erro de código',
    'Atraso na entrega',
    'Falha no transporte',
    'Falha de roteirização',
    'Erro de conferência',
    'Falha no descarregamento',
    'Erro de separação',
    'Falha no carregamento',
    'Demora recebimento do cliente',
    'Indevida',
    'Sinistro',
    'Loja sem promotor',
    'Falha no repasse',
    'Baixa qualidade',
    'Compra não conforme',
    'Outro'
);

CREATE TYPE public.impacto_ocorrencia_enum AS ENUM (
    'Cancelamento',
    'Refaturamento',
    'Devolução parcial',
    'Devolução total',
    'Atraso nas entregas',
    'Insatisfação do cliente',
    'Falta na entrega',
    'Entrega devolvida em total',
    'Outro'
);

-- 2. Criar a tabela de ocorrências
CREATE TABLE public.ocorrencias (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    usuario_id uuid NULL DEFAULT auth.uid(),
    data date NOT NULL,
    cliente character varying NOT NULL,
    motorista character varying NOT NULL,
    vendedor character varying NULL,
    rede character varying NULL,
    cidade character varying NULL,
    uf character varying(2) NULL,
    reincidencia character varying NOT NULL,
    setor_responsavel public.setor_responsavel_enum NOT NULL,
    setor_responsavel_outro text NULL,
    motivo_ocorrencia public.motivo_ocorrencia_enum NOT NULL,
    motivo_ocorrencia_outro text NULL,
    resumo_ocorrencia text NULL,
    tratativa text NULL,
    impactos public.impacto_ocorrencia_enum NOT NULL,
    impactos_outro text NULL,
    CONSTRAINT ocorrencias_pkey PRIMARY KEY (id),
    CONSTRAINT ocorrencias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- 3. Habilitar RLS na nova tabela
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de RLS para a tabela de ocorrências
CREATE POLICY "Usuários autenticados podem criar ocorrências"
ON public.ocorrencias
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem ver suas próprias ocorrências"
ON public.ocorrencias
FOR SELECT
TO authenticated
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar suas próprias ocorrências"
ON public.ocorrencias
FOR UPDATE
TO authenticated
USING (auth.uid() = usuario_id)
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar suas próprias ocorrências"
ON public.ocorrencias
FOR DELETE
TO authenticated
USING (auth.uid() = usuario_id);
