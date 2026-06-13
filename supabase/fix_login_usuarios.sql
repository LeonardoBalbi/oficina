-- Execute no Supabase > SQL Editor para corrigir o login inicial.

create extension if not exists "uuid-ossp";

create table if not exists public.app_usuarios (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  usuario text not null unique,
  senha_hash text not null,
  perfil text not null default 'mecanico' check (perfil in ('admin','mecanico')),
  mecanico_id uuid,
  permissoes jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.mecanicos') is not null then
    alter table public.app_usuarios
      add constraint app_usuarios_mecanico_id_fkey
      foreign key (mecanico_id)
      references public.mecanicos(id)
      on delete set null;
  end if;
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_app_usuarios_usuario on public.app_usuarios(usuario);

insert into public.app_usuarios (nome, usuario, senha_hash, perfil, permissoes)
values
(
  'Administrador',
  'admin',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'admin',
  '{"clientes":true,"veiculos":true,"mecanicos":true,"servicos":true,"fornecedores":true,"pecas":true,"ordens":true,"orcamentos":true,"fotos":true,"listas":true,"usuarios":true}'::jsonb
),
(
  'Administrador',
  'admina',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'admin',
  '{"clientes":true,"veiculos":true,"mecanicos":true,"servicos":true,"fornecedores":true,"pecas":true,"ordens":true,"orcamentos":true,"fotos":true,"listas":true,"usuarios":true}'::jsonb
)
on conflict (usuario) do update
set
  senha_hash = excluded.senha_hash,
  perfil = excluded.perfil,
  permissoes = excluded.permissoes,
  ativo = true;
