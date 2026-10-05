-- Lançamentos de scout (aba "Scout"): uma linha por atleta em cada partida.
-- Rodar no SQL Editor do Supabase antes de usar o botão "Adicionar scout".
-- Pode ser rodado de novo sem risco: não apaga nem altera lançamentos já gravados.
create table if not exists public.scout_entries (
  id uuid primary key default gen_random_uuid(),
  -- id do atleta (tabela athletes)
  athlete_id uuid not null,
  season text,
  analyst text,
  team text,
  -- texto livre, como na planilha (ex.: "03.01 às 13h00")
  match_date text,
  competition text,
  round text,
  match text,
  -- números do scout, no formato {"minutes": 90, "goals": 1}; as chaves estão em src/scout.ts
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Jogo do Calendário (tabela games) de onde o lançamento veio; vazio quando foi lançado à mão
alter table public.scout_entries add column if not exists game_id uuid;

create index if not exists scout_entries_athlete_id_idx on public.scout_entries (athlete_id);

alter table public.scout_entries enable row level security;

-- Libera a tabela para a API (tabela nova não vem liberada); quem decide o que cada um pode fazer são as regras abaixo
grant select, insert, update, delete on public.scout_entries to authenticated;

-- Todo usuário logado lê; só o papel admin cria, edita e apaga
drop policy if exists "scout_entries_select_authenticated" on public.scout_entries;
create policy "scout_entries_select_authenticated" on public.scout_entries
  for select to authenticated using (true);

drop policy if exists "scout_entries_insert_admin" on public.scout_entries;
create policy "scout_entries_insert_admin" on public.scout_entries
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "scout_entries_update_admin" on public.scout_entries;
create policy "scout_entries_update_admin" on public.scout_entries
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "scout_entries_delete_admin" on public.scout_entries;
create policy "scout_entries_delete_admin" on public.scout_entries
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Faz a API do Supabase enxergar a tabela nova na hora
notify pgrst, 'reload schema';
