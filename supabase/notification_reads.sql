-- Notificações lidas e limpas, por pessoa (central de notificações do painel). Rodar no SQL Editor do Supabase.
-- Pode ser rodado de novo sem risco: não apaga nem altera o que já foi gravado.
-- Sem esta tabela, o app guarda lidas e limpas só no navegador de cada aparelho.
create table if not exists public.notification_reads (
  user_id uuid not null default auth.uid(),
  activity_id uuid not null references public.recent_activities (id) on delete cascade,
  read_at timestamptz,
  cleared_at timestamptz,
  primary key (user_id, activity_id)
);

alter table public.notification_reads enable row level security;

-- Libera a tabela para a API; quem decide o que cada um pode fazer são as regras abaixo
grant select, insert, update on public.notification_reads to authenticated;

-- Cada pessoa só lê e grava as próprias linhas
drop policy if exists "notification_reads_select_own" on public.notification_reads;
create policy "notification_reads_select_own" on public.notification_reads
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notification_reads_insert_own" on public.notification_reads;
create policy "notification_reads_insert_own" on public.notification_reads
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "notification_reads_update_own" on public.notification_reads;
create policy "notification_reads_update_own" on public.notification_reads
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Faz a API do Supabase enxergar as mudanças na hora
notify pgrst, 'reload schema';
