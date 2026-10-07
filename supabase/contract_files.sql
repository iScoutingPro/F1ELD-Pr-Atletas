-- Arquivos de contrato enviados pelo app (botão "Enviar arquivo" do formulário de atleta). Rodar no SQL Editor do Supabase.
-- Pode ser rodado de novo sem risco: não apaga nem altera o que já foi gravado.
-- Sem isto, salvar um atleta com arquivo mostra o aviso "Arquivos de contrato não configurados".

-- Coluna com o caminho do arquivo dentro do bucket
alter table public.athletes
  add column if not exists contract_file text;

-- Bucket privado: o arquivo só abre por endereço temporário, gerado pelo app para quem está logado.
-- Limite de 20 MB por arquivo; só PDF e imagem
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contracts', 'contracts', false, 20971520, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Todo usuário logado abre e baixa; só o papel admin envia, troca e apaga
drop policy if exists "contracts_select_authenticated" on storage.objects;
create policy "contracts_select_authenticated" on storage.objects
  for select to authenticated
  using (bucket_id = 'contracts');

drop policy if exists "contracts_insert_admin" on storage.objects;
create policy "contracts_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contracts' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "contracts_update_admin" on storage.objects;
create policy "contracts_update_admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'contracts' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'contracts' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "contracts_delete_admin" on storage.objects;
create policy "contracts_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'contracts' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Faz a API do Supabase enxergar a coluna nova na hora
notify pgrst, 'reload schema';
