-- Jogos do calendário. Rodar no SQL Editor do Supabase antes de usar o botão "Adicionar jogo".
-- Pode ser rodado de novo sem risco: não apaga nem altera jogos já cadastrados.
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  game_date date not null,
  game_time text,
  home text not null,
  away text not null,
  venue text,
  category text,
  competition text,
  -- ids dos atletas (tabela athletes) vinculados ao jogo
  athlete_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Minutos jogados por atleta no jogo, no formato {"id do atleta": minutos}; alimenta a minutagem do painel inicial
alter table public.games add column if not exists athlete_minutes jsonb not null default '{}'::jsonb;

-- Scout por atleta no jogo, no formato {"id do atleta": {"goals": 1, "assists": 2}}; lançado na aba "Scout" e exibido no ícone Scout do perfil
alter table public.games add column if not exists athlete_scouts jsonb not null default '{}'::jsonb;

-- Rodada ou fase do jogo (texto livre, ex.: "3", "Semi-Final"); vai preenchida para a planilha do scout
alter table public.games add column if not exists round text;

alter table public.games enable row level security;

-- Libera a tabela para a API (tabela nova não vem liberada); quem decide o que cada um pode fazer são as regras abaixo
grant select, insert, update, delete on public.games to authenticated;

-- Todo usuário logado lê; só o papel admin cria, edita e apaga
drop policy if exists "games_select_authenticated" on public.games;
create policy "games_select_authenticated" on public.games
  for select to authenticated using (true);

drop policy if exists "games_insert_admin" on public.games;
create policy "games_insert_admin" on public.games
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "games_update_admin" on public.games;
create policy "games_update_admin" on public.games
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "games_delete_admin" on public.games;
create policy "games_delete_admin" on public.games
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Faz a API do Supabase enxergar a tabela nova na hora
notify pgrst, 'reload schema';
