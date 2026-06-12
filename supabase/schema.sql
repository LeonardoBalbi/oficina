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

create table if not exists ordens_servico (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  veiculo_id uuid not null references veiculos(id) on delete restrict,
  descricao_problema text not null,
  status text not null default 'aberta' check (status in ('aberta','andamento','finalizada','cancelada')),
  valor_estimado numeric(10,2) not null default 0,
  data_entrada date not null default current_date,
  data_saida date,
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_veiculos_cliente on veiculos(cliente_id);
create index if not exists idx_ordens_cliente on ordens_servico(cliente_id);
create index if not exists idx_ordens_veiculo on ordens_servico(veiculo_id);
create index if not exists idx_ordens_status on ordens_servico(status);

insert into servicos (nome, descricao, valor) values
('Troca de óleo', 'Troca de óleo do motor', 180.00),
('Alinhamento', 'Alinhamento de direção', 90.00),
('Balanceamento', 'Balanceamento das rodas', 80.00),
('Diagnóstico eletrônico', 'Scanner automotivo', 120.00)
on conflict do nothing;
