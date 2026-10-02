-- Campos do perfil do atleta. Rodar no SQL Editor do Supabase antes de usar a nova tela.
-- Cobre todas as colunas gravadas pelo payload de handleSaveAthlete; as que já existem são ignoradas.
alter table public.athletes
  add column if not exists last_name text,
  add column if not exists secondary_position text,
  add column if not exists club_logo text,
  add column if not exists status text,
  add column if not exists rating text,
  add column if not exists image text,
  add column if not exists naturalidade text,
  add column if not exists nacionalidade text,
  add column if not exists has_dual_nationality boolean,
  add column if not exists second_nationality text,
  add column if not exists birth_date text,
  add column if not exists age integer,
  add column if not exists preferred_foot text,
  add column if not exists weight numeric,
  add column if not exists height numeric,
  add column if not exists whatsapp_athlete text,
  add column if not exists whatsapp_guardian text,
  add column if not exists whatsapp_agent text,
  add column if not exists has_agent boolean,
  add column if not exists agent_company text,
  add column if not exists agent_name text,
  add column if not exists contract_type text,
  add column if not exists contract_level text,
  add column if not exists contract_club text,
  add column if not exists contract_start date,
  add column if not exists contract_end date,
  add column if not exists contract_link text,
  add column if not exists notes text,
  add column if not exists has_dvd boolean,
  add column if not exists dvd_link text,
  add column if not exists source text,
  add column if not exists stats jsonb;

-- Faz a API do Supabase enxergar as colunas novas na hora
notify pgrst, 'reload schema';
