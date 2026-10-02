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
  countries.ts          lista de países (código ISO de três letras, nome em português, bandeira) e as opções de nacionalidade
  components/           TopAppBar, BottomNavBar, Logo, AthleteInfo (corpo do perfil do atleta), CountrySelect (lista suspensa de países com busca)
  views/                uma tela por arquivo (LoginView, DashboardView, ScoutView, ...)
supabase/
  athlete_profile_fields.sql   todas as colunas da tabela athletes gravadas pelo app (rodar manualmente no Supabase)
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
- O banco usa `snake_case` e o tipo `Athlete` usa `camelCase`. O mapeamento é manual em `App.tsx`: a leitura passa sempre por `mapAthleteRow` e a gravação pelo `payload` de `handleSaveAthlete`. Campos mapeados: `last_name`, `secondary_position`, `club_logo`, `birth_date`, `preferred_foot`, `has_dual_nationality`, `second_nationality`, `has_dvd`, `dvd_link`, `whatsapp_athlete`, `whatsapp_guardian`, `whatsapp_agent`, `has_agent`, `agent_company`, `agent_name`, `contract_type`, `contract_level`, `contract_club`, `contract_start`, `contract_end`, `contract_link` (cada um vira o equivalente em `camelCase`).
- Ao adicionar um campo ao atleta: atualizar o tipo `Athlete`, `mapAthleteRow`, o `payload` (e o ramo sem Supabase) em `handleSaveAthlete`, o formulário em `EditProfileView`, a exibição em `AthleteInfo` e incluir a coluna em `supabase/athlete_profile_fields.sql`. O SQL não roda sozinho: precisa ser executado no SQL Editor do Supabase, senão a gravação falha por coluna inexistente.
- `supabase/athlete_profile_fields.sql` cobre todas as colunas do `payload` (não só as do perfil), usa `add column if not exists` (pode ser rodado de novo sem risco, não altera dados) e termina com `notify pgrst, 'reload schema'` para a API enxergar as colunas na hora. Foi executado no projeto do Supabase em 02/10/2026, já com a coluna `contract_level`; colunas adicionadas depois disso exigem rodar o arquivo de novo (pendentes: `has_dual_nationality` e `second_nationality`).
- Nacionalidade e dupla nacionalidade: em "Informações pessoais" a linha do formulário é Data de Nascimento | Nacionalidade | "Dupla Nacionalidade?" (SIM/NÃO compacto, `hasDualNationality`); com "Sim" aparece o campo "Segunda Nacionalidade" (`secondNationality`). Nacionalidade e segunda nacionalidade são escolhidas no `CountrySelect` (lista suspensa com bandeira, sigla e busca por digitação) e gravadas como código ISO de três letras (ex.: `BRA`); "Segunda Nacionalidade" fica na mesma linha, à direita da pergunta. Opções: nacionalidade só com países da América do Sul, Brasil primeiro (`NATIONALITY_COUNTRIES`); segunda nacionalidade com América do Sul, principais países da Europa e Estados Unidos (`SECOND_NATIONALITY_COUNTRIES`). As listas ficam em `src/countries.ts`; `COUNTRIES` (lista completa) serve só para exibir códigos já gravados (nomes em português via `Intl.DisplayNames`, bandeiras carregadas de `flagcdn.com`). Valores antigos em texto livre (ex.: "Brasileira") continuam sendo exibidos como texto, sem bandeira, até o atleta ser editado. Salvar com "Não" apaga a segunda nacionalidade. No perfil, as linhas "Nacionalidade" e "Dupla Nacionalidade" mostram sigla, nome do país e a bandeira à direita ("Não possui" quando não há dupla nacionalidade).
- O app só tem a chave `anon`, que não altera a estrutura do banco. Mudanças de esquema são feitas pelo usuário no SQL Editor; não pedir senha do banco nem token pelo chat.
- No `payload`, campos opcionais vazios vão como `null` (não string vazia), para não quebrar colunas `date`/`numeric`.

### Perfil do atleta

- O modal de perfil fica em `App.tsx` (cabeçalho com foto, nome, etiquetas de posição, categoria e clube, linha "Contrato" e a coluna de botões à direita) e o corpo é o componente `AthleteInfo`. Ordem das seções: faixa de destaque (idade, altura, peso, pé dominante), "Informações pessoais", "Informações esportivas" (clube atual primeiro), "Informações contratuais", "Contatos" e "Outras informações" (DVD: possui ou não, e o link). O perfil mostra os mesmos campos do formulário `EditProfileView`, incluindo o nome completo em "Informações pessoais"; idade, altura, peso e pé dominante ficam só na faixa de destaque, acima das seções, sem repetir em "Informações pessoais". As observações não aparecem.
- "Cidade/Estado" usa a coluna `naturalidade`. Peso em kg e altura em cm (`weight`, `height`); a idade (`age`) é calculada da data de nascimento ao salvar.
- Contrato: um por atleta, `contractType` é `'Field'` ou `'Clube'` (vazio = sem contrato), com início, término e link do documento. Não há upload de arquivo.
- `contractLevel` (`contract_level`) é `'Profissional'` ou `'Amador'`: escolhido em "Tipo de Contrato" no formulário (independente de `contractType`) e exibido como "Contrato: ..." no cabeçalho do perfil, abaixo das etiquetas. O cabeçalho não tem mais o rótulo "Perfil do atleta".
- À direita do cabeçalho do perfil há uma coluna centralizada na vertical, com duas linhas da mesma largura: em cima "Editar perfil" (só `admin`, branco sólido com ícone de lápis, `flex-1` para preencher a linha) e o botão de fechar (círculo vermelho, token `error`, via `closeAthleteModal`); embaixo o painel com os cinco ícones de detalhe (Documentos, Agenda, Negócios, Perfil, Status, via `setProfileDetailView`). As bordas das duas linhas devem ficar alinhadas; sem `admin`, o fechar fica sozinho à direita. A linha do nome do atleta não tem botões.
- Contatos: WhatsApp do atleta e do responsável em cima; embaixo o empresário. Com `hasAgent` verdadeiro mostra empresa, nome e WhatsApp do empresário; caso contrário, a mensagem "O atleta não tem agenciamento de carreira". Salvar com `hasAgent` falso apaga os dados do empresário.
- Sempre checar `hasSupabaseConfig` antes de usar `supabase` (ele é `null` sem as variáveis de ambiente). Sem configuração o app fica na tela de login.
- Ids de atletas reais são UUID; ids que não são UUID (mocks ou `local-...`) são tratados só em memória e viram `insert` ao salvar.
- Criar ou editar um atleta registra uma linha em `recent_activities` via `recordActivity`, somente depois de confirmada a gravação.
- Quando o RLS bloqueia um `update` ou `delete`, o Supabase não retorna erro, só altera zero linhas. Todo `update`/`delete` deve terminar com `.select()` e tratar retorno vazio como ação não permitida: mostrar o aviso de `notAllowedMessage` (via `setNotice`) e não atualizar o estado local, não fechar o modal nem registrar atividade. No `insert`, o bloqueio vem como erro de código `42501` e recebe a mesma mensagem.

### Avisos e erros

- Não usar `alert()` do navegador. Avisos ao usuário passam pelo estado `notice` de `App.tsx` (`setNotice({ title, message })`), que abre um modal no padrão do "Encerrar sessão", mas em preto e branco (faixa, ícone e botão "Entendi" em `primary`, sem laranja). Fecha pelo botão, clicando fora ou com Esc.
- `notAllowedMessage(acao)` devolve o aviso de permissão negada (título "Ação não permitida") e `errorNotice(titulo, error)` converte um erro do Supabase em aviso.
- Erro de coluna inexistente (código `PGRST204`, quando o SQL de `supabase/` não foi executado) aparece como "Informações não inseridas", sem detalhe técnico na tela; o erro completo vai só para o console.
- A confirmação de exclusão em `EditProfileView` ainda usa `window.confirm`.

### Formulário de cadastro e edição

- O botão "+" da aba Atletas Agenciados (`AthletesListView`, só para `admin`) e o "Editar perfil" abrem o mesmo formulário, `EditProfileView`, num modal de `App.tsx`. Qualquer mudança no formulário vale para o cadastro e para a edição.
- O modal não tem `TopAppBar`: fecha pelo "×" ou pelo "Cancelar", ambos via `closeAthleteModal`, que também zera `isAddingAthlete`.
- As seções seguem a ordem do perfil, cada uma num cartão do componente `FormSection`: "Informações pessoais", "Informações esportivas", "Informações contratuais", "Contatos" e "Outras informações" (só DVD: possui ou não, e o link).
- Origem (`source`) e observações (`notes`) não aparecem no formulário. Ao salvar, `EditProfileView` repassa o valor já gravado; atleta novo entra como `'Captado'`.
- Campos obrigatórios (marcados com "*"): Nome Completo, Data de Nascimento, Categoria e Posição Principal. A checagem fica no início de `handleSaveAthlete`: se faltar algum, abre o aviso "Campos obrigatórios não preenchidos" listando os que faltam e nada é gravado. Categoria e posição começam em "Selecione" (vazio) no cadastro.
- Não há campo de senha no formulário: a permissão vem do papel `admin`.
- Visual: mesmo padrão de cartões do perfil (`panelClass`), mas sem laranja. Botões e opções selecionadas em branco (`bg-primary` com `text-background`), sombreado do topo do modal e aro da foto em branco, foco dos campos em branco. Títulos das seções em `text-base`, negrito e sublinhados. O modal de perfil (cabeçalho em `App.tsx` e `AthleteInfo`) também usa branco (`primary`) como destaque, sem laranja; a única exceção de cor é o botão de fechar do perfil, em vermelho (`error`).

### Autenticação

- Login via Supabase Auth (e-mail e senha). Além da sessão do Supabase, o app exige a flag `fieldpro_authenticated_v1` no `localStorage`, gravada em `LoginView` e removida em `clearAppAuth`.
- Links de recuperação de senha são detectados pela URL e levam à view `security`.
- O papel do usuário vem de `session.user.app_metadata.role` (`isAdmin` em `App.tsx`). Só `admin` cria, edita e apaga atletas; usuários comuns só leem. Quem impõe isso é o RLS do banco: a interface apenas esconde os botões de adicionar, editar e excluir de quem não é administrador. Não usar senha fixa no código nem `window.prompt` para liberar acesso.
- O papel vem do JWT: se o `role` de alguém for alterado no Supabase, a pessoa precisa sair e entrar de novo para a interface refletir a mudança.

### Estilo e idioma

- Estilo só com classes Tailwind. Usar os tokens de tema de `src/index.css` (`bg-background`, `bg-surface-low`, `bg-surface-high`, `text-on-surface`, `text-on-surface-variant`, `text-primary`, `text-accent`) em vez de cores soltas. Tema escuro único, fonte Inter.
- O laranja da marca é o token `accent` (`#f97316`): usado no nome "Attiva Sports" da tela de login e como cor de destaque.
- Os campos de login e senha em `LoginView` têm fundo branco (`bg-primary`) com texto escuro (`text-background`), ícones em `text-outline` e contorno de foco em `ring-accent`. Em fundo branco, não usar `ring-primary` nem texto claro, que ficam invisíveis.
- Textos de interface, mensagens de erro e logs em português (pt-BR).
- Componentes funcionais com hooks e exports nomeados nas views e components.
