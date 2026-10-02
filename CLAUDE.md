# Field Pro Atletas

## O que o app faz

App web de gestão de atletas de futebol para agência/scouting (Attiva Sports). Após o login, o usuário vê um dashboard com atividades recentes e navega por listas de atletas (agenciados, captados/scout, negociados, totais), abre o perfil de cada atleta, cadastra/edita/exclui atletas e consulta um calendário. Inclui fluxo de recuperação e troca de senha por e-mail.

## Stack

- React 19 + TypeScript, empacotado com Vite 6
- Tailwind CSS 4 (plugin `@tailwindcss/vite`), com tema definido em `src/index.css`
- `motion` para animações e `lucide-react` para ícones
- Supabase (`@supabase/supabase-js`) para autenticação e banco de dados
- O projeto nasceu de um template do Google AI Studio: `@google/genai`, `express`, `GEMINI_API_KEY` e o `README.md` são herança desse template e não são usados em `src/`

## Como rodar

1. `npm install`
2. Criar um `.env` na raiz com:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
   O `.env.example` só lista as variáveis do template (Gemini), não as do Supabase.
3. `npm run dev` e abrir http://localhost:3000

Outros scripts:

- `npm run build`: gera `dist/`
- `npm run preview`: serve o build
- `npm run lint`: checagem de tipos (`tsc --noEmit`); não há testes automatizados
- `npm run clean`: usa `rm -rf`, não funciona no PowerShell

## Estrutura de pastas

```
index.html              entrada do Vite
vite.config.ts          plugins React + Tailwind, alias @ para a raiz
public/assets/          imagens estáticas
src/
  main.tsx              bootstrap do React
  App.tsx               estado global, autenticação, CRUD de atletas, navegação e modais de perfil
  types.ts              tipos Athlete, View e NavItem
  data.ts               MOCK_ATHLETES (estado inicial antes de carregar do Supabase)
  index.css             Tailwind + tokens de tema (cores, fonte) e classes utilitárias
  lib/supabase.ts       cliente Supabase e flag hasSupabaseConfig
  components/           TopAppBar, BottomNavBar, Logo
  views/                uma tela por arquivo (LoginView, DashboardView, ScoutView, ...)
```

## Regras do projeto

### Navegação

- Não há roteador. A tela atual é o estado `view` em `App.tsx`, do tipo `View` (`src/types.ts`), e `renderView()` escolhe o componente.
- Para criar uma tela nova: adicionar o id ao tipo `View`, criar o arquivo em `src/views/`, adicionar o `case` em `renderView()` e, se for item de menu, incluir em `BottomNavBar`.
- Telas de autenticação (`login`, `recovery`, `verification`, `security`, `success`) são renderizadas sem `TopAppBar`/`BottomNavBar` (lista `showShell` em `App.tsx`).
- Perfil, edição e cadastro de atleta são modais controlados por estado em `App.tsx`, não são views.

### Dados e Supabase

- Todo acesso a dados passa pelo cliente em `src/lib/supabase.ts`. As chamadas ficam concentradas em `App.tsx` (e o login em `LoginView.tsx`); as views recebem dados e callbacks por props.
- Tabelas: `athletes` e `recent_activities`.
- O banco usa `snake_case` e o tipo `Athlete` usa `camelCase`. O mapeamento é manual em `App.tsx` (`last_name` ↔ `lastName`, `club_logo` ↔ `clubLogo`, `birth_date` ↔ `birthDate`, `preferred_foot` ↔ `preferredFoot`, `has_dvd` ↔ `hasDvd`, `dvd_link` ↔ `dvdLink`). Ao adicionar um campo, atualizar o tipo, o payload de gravação e todos os pontos de leitura.
- Sempre checar `hasSupabaseConfig` antes de usar `supabase` (ele é `null` sem as variáveis de ambiente). Sem configuração o app fica na tela de login.
- Ids de atletas reais são UUID; ids que não são UUID (mocks ou `local-...`) são tratados só em memória e viram `insert` ao salvar.
- Criar ou editar um atleta registra uma linha em `recent_activities` via `recordActivity`, somente depois de confirmada a gravação.
- Quando o RLS bloqueia um `update` ou `delete`, o Supabase não retorna erro, só altera zero linhas. Todo `update`/`delete` deve terminar com `.select()` e tratar retorno vazio como ação não permitida: mostrar a mensagem de `notAllowedMessage` e não atualizar o estado local, não fechar o modal nem registrar atividade. No `insert`, o bloqueio vem como erro de código `42501` e recebe a mesma mensagem.

### Autenticação

- Login via Supabase Auth (e-mail e senha). Além da sessão do Supabase, o app exige a flag `fieldpro_authenticated_v1` no `localStorage`, gravada em `LoginView` e removida em `clearAppAuth`.
- Links de recuperação de senha são detectados pela URL e levam à view `security`.
- O papel do usuário vem de `session.user.app_metadata.role` (`isAdmin` em `App.tsx`). Só `admin` cria, edita e apaga atletas; usuários comuns só leem. Quem impõe isso é o RLS do banco: a interface apenas esconde os botões de adicionar, editar e excluir de quem não é administrador. Não usar senha fixa no código nem `window.prompt` para liberar acesso.
- O papel vem do JWT: se o `role` de alguém for alterado no Supabase, a pessoa precisa sair e entrar de novo para a interface refletir a mudança.

### Estilo e idioma

- Estilo só com classes Tailwind. Usar os tokens de tema de `src/index.css` (`bg-background`, `bg-surface-low`, `bg-surface-high`, `text-on-surface`, `text-on-surface-variant`, `text-primary`) em vez de cores soltas. Tema escuro único, fonte Inter.
- Textos de interface, mensagens de erro e logs em português (pt-BR).
- Componentes funcionais com hooks e exports nomeados nas views e components.
