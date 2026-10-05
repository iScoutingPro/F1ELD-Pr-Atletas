-- Atividades recentes (central de notificações do painel inicial). Rodar no SQL Editor do Supabase.
-- Pode ser rodado de novo sem risco: não apaga nem altera atividades já gravadas.
create table if not exists public.recent_activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Colunas gravadas por recordActivity em App.tsx
alter table public.recent_activities add column if not exists type text;
alter table public.recent_activities add column if not exists title text;
alter table public.recent_activities add column if not exists subtitle text;
alter table public.recent_activities add column if not exists club text;
alter table public.recent_activities add column if not exists club_logo text;
alter table public.recent_activities add column if not exists athlete_id uuid;

alter table public.recent_activities enable row level security;

-- Libera a tabela para a API; quem decide o que cada um pode fazer são as regras abaixo
grant select, insert on public.recent_activities to authenticated;

-- Todo usuário logado lê; só o papel admin grava (é ele quem cadastra e edita atletas)
drop policy if exists "recent_activities_select_authenticated" on public.recent_activities;
create policy "recent_activities_select_authenticated" on public.recent_activities
  for select to authenticated using (true);

drop policy if exists "recent_activities_insert_admin" on public.recent_activities;
create policy "recent_activities_insert_admin" on public.recent_activities
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Faz a API do Supabase enxergar as mudanças na hora
notify pgrst, 'reload schema';
