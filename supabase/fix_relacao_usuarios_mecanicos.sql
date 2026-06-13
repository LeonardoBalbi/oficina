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

notify pgrst, 'reload schema';
