-- Rode este arquivo no Supabase > SQL Editor para ativar os módulos novos.
-- Ele é idempotente: pode rodar mais de uma vez sem recriar dados.

create extension if not exists "uuid-ossp";

create table if not exists public.mecanicos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  telefone text,
  especialidade text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.fornecedores (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  telefone text,
  email text,
  documento text,
  created_at timestamptz not null default now()
);

create table if not exists public.pecas (
  id uuid primary key default uuid_generate_v4(),
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  nome text not null,
  codigo text,
  quantidade int not null default 0,
  estoque_minimo int not null default 0,
  custo numeric(10,2) not null default 0,
  preco_venda numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orcamentos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  veiculo_id uuid references public.veiculos(id) on delete restrict,
  descricao text not null,
  valor_total numeric(10,2) not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho','enviado','aprovado','recusado')),
  validade date,
  created_at timestamptz not null default now()
);

alter table public.ordens_servico
  add column if not exists mecanico_id uuid references public.mecanicos(id) on delete set null;

create table if not exists public.fotos_os (
  id uuid primary key default uuid_generate_v4(),
  ordem_id uuid not null references public.ordens_servico(id) on delete cascade,
  tipo text not null check (tipo in ('antes','depois')),
  url text not null,
  legenda text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ordens_mecanico on public.ordens_servico(mecanico_id);
create index if not exists idx_pecas_fornecedor on public.pecas(fornecedor_id);
create index if not exists idx_orcamentos_cliente on public.orcamentos(cliente_id);
create index if not exists idx_fotos_os_ordem on public.fotos_os(ordem_id);
