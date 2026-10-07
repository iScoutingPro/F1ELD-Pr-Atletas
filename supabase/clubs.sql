-- Clubes cadastrados na aba Clubes (nome e escudo). Rodar no SQL Editor do Supabase.
-- Pode ser rodado de novo sem risco: não apaga nem altera o que já foi gravado.
-- Sem isto, a aba Clubes mostra só os clubes que já vêm no app e salvar um clube mostra o aviso "Clubes não configurados".
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

-- Clube que já vem no app e foi apagado na aba Clubes: a linha fica só para escondê-lo
alter table public.clubs
  add column if not exists hidden boolean not null default false;

alter table public.clubs enable row level security;

-- Libera a tabela para a API; quem decide o que cada um pode fazer são as regras abaixo
grant select, insert, update, delete on public.clubs to authenticated;

-- Todo usuário logado lê; só o papel admin cria, edita e apaga
drop policy if exists "clubs_select_authenticated" on public.clubs;
create policy "clubs_select_authenticated" on public.clubs
  for select to authenticated using (true);

drop policy if exists "clubs_insert_admin" on public.clubs;
create policy "clubs_insert_admin" on public.clubs
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "clubs_update_admin" on public.clubs;
create policy "clubs_update_admin" on public.clubs
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "clubs_delete_admin" on public.clubs;
create policy "clubs_delete_admin" on public.clubs
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Escudos: bucket público (o escudo abre pelo endereço, sem login), até 2 MB por arquivo, só imagem
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-logos', 'club-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Só o papel admin envia, troca e apaga escudos
drop policy if exists "club_logos_select_authenticated" on storage.objects;
create policy "club_logos_select_authenticated" on storage.objects
  for select to authenticated
  using (bucket_id = 'club-logos');

drop policy if exists "club_logos_insert_admin" on storage.objects;
create policy "club_logos_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'club-logos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "club_logos_update_admin" on storage.objects;
create policy "club_logos_update_admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'club-logos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'club-logos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "club_logos_delete_admin" on storage.objects;
create policy "club_logos_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'club-logos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Faz a API do Supabase enxergar a tabela nova na hora
notify pgrst, 'reload schema';
