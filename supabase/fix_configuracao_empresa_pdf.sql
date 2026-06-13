-- Execute no Supabase > SQL Editor > Run
-- Ativa os dados da empresa usados no cabeçalho do PDF da OS e do Orçamento.

create table if not exists public.configuracao_empresa (
  id int primary key default 1 check (id = 1),
  nome_empresa text,
  cnpj text,
  endereco text,
  telefone text,
  whatsapp text,
  email text,
  site text,
  redes_sociais text,
  updated_at timestamptz not null default now()
);

insert into public.configuracao_empresa (id, nome_empresa)
values (1, 'Garage Auto Service')
on conflict (id) do nothing;

notify pgrst, 'reload schema';
