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

create table if not exists fotos_os (
  id uuid primary key default uuid_generate_v4(),
  ordem_id uuid not null references ordens_servico(id) on delete cascade,
  tipo text not null check (tipo in ('antes','depois')),
  url text not null,
  legenda text,
  created_at timestamptz not null default now()
);

alter table ordens_servico
  add column if not exists mecanico_id uuid references mecanicos(id) on delete set null;

create index if not exists idx_veiculos_cliente on veiculos(cliente_id);
create index if not exists idx_ordens_cliente on ordens_servico(cliente_id);
create index if not exists idx_ordens_veiculo on ordens_servico(veiculo_id);
create index if not exists idx_ordens_mecanico on ordens_servico(mecanico_id);
create index if not exists idx_ordens_status on ordens_servico(status);
create index if not exists idx_pecas_fornecedor on pecas(fornecedor_id);
create index if not exists idx_orcamentos_cliente on orcamentos(cliente_id);
create index if not exists idx_fotos_os_ordem on fotos_os(ordem_id);

insert into servicos (nome, descricao, valor) values
('Troca de óleo', 'Troca de óleo do motor', 180.00),
('Alinhamento', 'Alinhamento de direção', 90.00),
('Balanceamento', 'Balanceamento das rodas', 80.00),
('Diagnóstico eletrônico', 'Scanner automotivo', 120.00)
on conflict do nothing;
