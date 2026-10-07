# Field Pro Atletas

App web de gestão de atletas de futebol da Attiva Sports (React, Vite e Supabase).

## Como rodar

Pré-requisito: Node.js.

1. `npm install`
2. Copiar `.env.example` para `.env.local` e preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. `npm run dev` e abrir http://localhost:3000

Os arquivos da pasta `supabase/` criam as tabelas e as regras de acesso e são executados manualmente no SQL Editor do Supabase.
