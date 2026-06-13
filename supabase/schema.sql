-- Cole este SQL no Supabase > SQL Editor > Run

create extension if not exists "uuid-ossp";

create table if not exists clientes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  telefone text not null,
  email text,
  endereco text,
  created_at timestamptz not null default now()
);

create table if not exists veiculos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  placa text not null unique,
  marca text not null,
  modelo text not null,
  ano int,
  cor text,
  created_at timestamptz not null default now()
);

create table if not exists marcas_veiculos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists modelos_veiculos (
  id uuid primary key default uuid_generate_v4(),
  marca_id uuid not null references marcas_veiculos(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  unique (marca_id, nome)
);

create table if not exists servicos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text,
  valor numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists mecanicos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  telefone text,
  especialidade text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists fornecedores (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  telefone text,
  email text,
  documento text,
  created_at timestamptz not null default now()
);

create table if not exists pecas (
  id uuid primary key default uuid_generate_v4(),
  fornecedor_id uuid references fornecedores(id) on delete set null,
  nome text not null,
  codigo text,
  quantidade int not null default 0,
  estoque_minimo int not null default 0,
  custo numeric(10,2) not null default 0,
  preco_venda numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists orcamentos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  veiculo_id uuid references veiculos(id) on delete restrict,
  descricao text not null,
  valor_total numeric(10,2) not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho','enviado','aprovado','recusado')),
  validade date,
  created_at timestamptz not null default now()
);

create table if not exists ordens_servico (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  veiculo_id uuid not null references veiculos(id) on delete restrict,
  mecanico_id uuid references mecanicos(id) on delete set null,
  descricao_problema text not null,
  status text not null default 'aberta' check (status in ('aberta','andamento','finalizada','cancelada')),
  valor_estimado numeric(10,2) not null default 0,
  data_entrada date not null default current_date,
  data_saida date,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists ordem_servicos_itens (
  id uuid primary key default uuid_generate_v4(),
  ordem_id uuid not null references ordens_servico(id) on delete cascade,
  servico_id uuid references servicos(id) on delete set null,
  nome text not null,
  valor numeric(10,2) not null default 0,
  quantidade int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists fotos_os (
  id uuid primary key default uuid_generate_v4(),
  ordem_id uuid not null references ordens_servico(id) on delete cascade,
  tipo text not null check (tipo in ('antes','depois')),
  url text not null,
  legenda text,
  created_at timestamptz not null default now()
);

create table if not exists app_usuarios (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  usuario text not null unique,
  senha_hash text not null,
  perfil text not null default 'mecanico' check (perfil in ('admin','mecanico')),
  mecanico_id uuid references mecanicos(id) on delete set null,
  permissoes jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table app_usuarios
    add constraint app_usuarios_mecanico_id_fkey
    foreign key (mecanico_id)
    references mecanicos(id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;

alter table ordens_servico
  add column if not exists mecanico_id uuid references mecanicos(id) on delete set null;

create index if not exists idx_veiculos_cliente on veiculos(cliente_id);
create index if not exists idx_modelos_veiculos_marca on modelos_veiculos(marca_id);
create index if not exists idx_ordens_cliente on ordens_servico(cliente_id);
create index if not exists idx_ordens_veiculo on ordens_servico(veiculo_id);
create index if not exists idx_ordens_mecanico on ordens_servico(mecanico_id);
create index if not exists idx_ordem_servicos_itens_ordem on ordem_servicos_itens(ordem_id);
create index if not exists idx_ordens_status on ordens_servico(status);
create index if not exists idx_pecas_fornecedor on pecas(fornecedor_id);
create index if not exists idx_orcamentos_cliente on orcamentos(cliente_id);
create index if not exists idx_fotos_os_ordem on fotos_os(ordem_id);
create index if not exists idx_app_usuarios_usuario on app_usuarios(usuario);

insert into app_usuarios (nome, usuario, senha_hash, perfil, permissoes)
values (
  'Administrador',
  'admin',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'admin',
  '{"clientes":true,"veiculos":true,"mecanicos":true,"servicos":true,"fornecedores":true,"pecas":true,"ordens":true,"orcamentos":true,"fotos":true,"listas":true,"usuarios":true}'::jsonb
)
on conflict (usuario) do nothing;

insert into app_usuarios (nome, usuario, senha_hash, perfil, permissoes)
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

insert into marcas_veiculos (nome)
select distinct trim(marca)
from veiculos
where nullif(trim(marca), '') is not null
on conflict (nome) do nothing;

insert into modelos_veiculos (marca_id, nome)
select distinct mv.id, trim(v.modelo)
from veiculos v
join marcas_veiculos mv on mv.nome = trim(v.marca)
where nullif(trim(v.modelo), '') is not null
on conflict (marca_id, nome) do nothing;

insert into servicos (nome, descricao, valor) values
('Troca de óleo', 'Troca de óleo do motor', 180.00),
('Alinhamento', 'Alinhamento de direção', 90.00),
('Balanceamento', 'Balanceamento das rodas', 80.00),
('Diagnóstico eletrônico', 'Scanner automotivo', 120.00)
on conflict do nothing;
