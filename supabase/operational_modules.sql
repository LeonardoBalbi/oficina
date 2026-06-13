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

create table if not exists public.marcas_veiculos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.modelos_veiculos (
  id uuid primary key default uuid_generate_v4(),
  marca_id uuid not null references public.marcas_veiculos(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  unique (marca_id, nome)
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

create table if not exists public.ordem_servicos_itens (
  id uuid primary key default uuid_generate_v4(),
  ordem_id uuid not null references public.ordens_servico(id) on delete cascade,
  servico_id uuid references public.servicos(id) on delete set null,
  nome text not null,
  valor numeric(10,2) not null default 0,
  quantidade int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.fotos_os (
  id uuid primary key default uuid_generate_v4(),
  ordem_id uuid not null references public.ordens_servico(id) on delete cascade,
  tipo text not null check (tipo in ('antes','depois')),
  url text not null,
  legenda text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_usuarios (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  usuario text not null unique,
  senha_hash text not null,
  perfil text not null default 'mecanico' check (perfil in ('admin','mecanico')),
  mecanico_id uuid references public.mecanicos(id) on delete set null,
  permissoes jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.app_usuarios
    add constraint app_usuarios_mecanico_id_fkey
    foreign key (mecanico_id)
    references public.mecanicos(id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;

insert into public.app_usuarios (nome, usuario, senha_hash, perfil, permissoes)
values (
  'Administrador',
  'admin',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'admin',
  '{"clientes":true,"veiculos":true,"mecanicos":true,"servicos":true,"fornecedores":true,"pecas":true,"ordens":true,"orcamentos":true,"fotos":true,"listas":true,"usuarios":true}'::jsonb
)
on conflict (usuario) do nothing;

insert into public.app_usuarios (nome, usuario, senha_hash, perfil, permissoes)
values (
  'Administrador',
  'admina',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'admin',
  '{"clientes":true,"veiculos":true,"mecanicos":true,"servicos":true,"fornecedores":true,"pecas":true,"ordens":true,"orcamentos":true,"fotos":true,"listas":true,"usuarios":true}'::jsonb
)
on conflict (usuario) do nothing;

insert into storage.buckets (id, name, public)
values ('fotos-os', 'fotos-os', true)
on conflict (id) do update set public = true;

insert into public.marcas_veiculos (nome)
select distinct trim(marca)
from public.veiculos
where nullif(trim(marca), '') is not null
on conflict (nome) do nothing;

insert into public.modelos_veiculos (marca_id, nome)
select distinct mv.id, trim(v.modelo)
from public.veiculos v
join public.marcas_veiculos mv on mv.nome = trim(v.marca)
where nullif(trim(v.modelo), '') is not null
on conflict (marca_id, nome) do nothing;

create index if not exists idx_ordens_mecanico on public.ordens_servico(mecanico_id);
create index if not exists idx_ordem_servicos_itens_ordem on public.ordem_servicos_itens(ordem_id);
create index if not exists idx_modelos_veiculos_marca on public.modelos_veiculos(marca_id);
create index if not exists idx_pecas_fornecedor on public.pecas(fornecedor_id);
create index if not exists idx_orcamentos_cliente on public.orcamentos(cliente_id);
create index if not exists idx_fotos_os_ordem on public.fotos_os(ordem_id);
create index if not exists idx_app_usuarios_usuario on public.app_usuarios(usuario);
