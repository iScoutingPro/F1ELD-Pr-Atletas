import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { ArrowLeft, Download, FileText, CalendarDays, BarChart3, Presentation, ScrollText, Newspaper, Trophy, LogOut, AlertTriangle, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Imports from Libs & Types
import { supabase, hasSupabaseConfig } from './lib/supabase';
import { Athlete, ContractGoal, Game, ScoutEntry, ScoutEntryInput, TacticalMeeting, View } from './types';
import { activeLoanClub, contractFileName, contractGoalProgress, formatNumber } from './contract';
import { BUILTIN_CLUBS, Club, clubKey, clubLogoMap, mergeClubs } from './clubs';
import type { ClubInput } from './views/ClubsView';

// Imports from Components
import { SideNavBar } from './components/SideNavBar';
import { AthleteInfo } from './components/AthleteInfo';

// Imports from Views
import { LoginView } from './views/LoginView';
import { DashboardView, activityKey } from './views/DashboardView';
import { AtletasTotaisView } from './views/AtletasTotaisView';
import { RecoveryView, VerificationView } from './views/AuthSubViews';
import { SecurityView, SuccessView } from './views/SecuritySubViews';

// Telas e ícones do perfil que não aparecem ao entrar são baixados só quando abertos, para o app abrir mais rápido no celular
const lazyNamed = <K extends string, M extends Record<K, React.ComponentType<any>>>(load: () => Promise<M>, name: K) =>
  lazy(() => load().then(module => ({ default: module[name] })));

const AthleteGames = lazyNamed(() => import('./components/AthleteGames'), 'AthleteGames');
const AthleteScout = lazyNamed(() => import('./components/AthleteScout'), 'AthleteScout');
const AthleteContract = lazyNamed(() => import('./components/AthleteContract'), 'AthleteContract');
const AthleteTactical = lazyNamed(() => import('./components/AthleteTactical'), 'AthleteTactical');
const AthletePdf = lazyNamed(() => import('./components/AthletePdf'), 'AthletePdf');
const SettingsView = lazyNamed(() => import('./views/SettingsView'), 'SettingsView');
const EditProfileView = lazyNamed(() => import('./views/EditProfileView'), 'EditProfileView');
const CalendarView = lazyNamed(() => import('./views/CalendarView'), 'CalendarView');
const ScoutEntryView = lazyNamed(() => import('./views/ScoutEntryView'), 'ScoutEntryView');
const ClubsView = lazyNamed(() => import('./views/ClubsView'), 'ClubsView');

// Enquanto a parte da tela é baixada
const LoadingPanel = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-primary" aria-label="Carregando" />
  </div>
);

const AUTH_SESSION_KEY = 'fieldpro_authenticated_v1';
const RLS_VIOLATION_CODE = '42501';
const MISSING_COLUMN_CODE = 'PGRST204';

type Notice = { title: string; message: string };

const notAllowedMessage = (action: string, target = 'atletas'): Notice => ({
  title: 'Ação não permitida',
  message: `Seu usuário não tem permissão para ${action} ${target}. Nenhuma alteração foi salva.`,
});

// Tabela games ausente (supabase/games.sql ainda não foi executado)
const MISSING_TABLE_CODES = ['PGRST205', '42P01', MISSING_COLUMN_CODE];
const gameErrorNotice = (title: string, error: { code?: string; message: string }): Notice => {
  // O mesmo código 42501 vem quando falta o grant da tabela (não é falta de permissão do usuário)
  const missingGrant = /permission denied for table/i.test(error.message);
  if (error.code === RLS_VIOLATION_CODE && !missingGrant) {
    return notAllowedMessage('alterar', 'jogos');
  }
  if (missingGrant || (error.code && MISSING_TABLE_CODES.includes(error.code))) {
    return {
      title: 'Calendário não configurado',
      message: 'O banco de dados ainda não está preparado para os jogos. Execute o arquivo supabase/games.sql no SQL Editor do Supabase e tente de novo.',
    };
  }
  return { title, message: error.message };
};

const mapGameRow = (g: any): Game => ({
  id: g.id,
  date: g.game_date,
  time: g.game_time || undefined,
  home: g.home,
  away: g.away,
  venue: g.venue || undefined,
  category: g.category || undefined,
  competition: g.competition || undefined,
  round: g.round || undefined,
  athleteIds: g.athlete_ids || [],
  athleteMinutes: g.athlete_minutes || {},
  athleteScouts: g.athlete_scouts || {},
});

// Tabela scout_entries ausente ou sem grant (supabase/scout_entries.sql ainda não foi executado)
const scoutErrorNotice = (title: string, error: { code?: string; message: string }): Notice => {
  const missingGrant = /permission denied for table/i.test(error.message);
  if (error.code === RLS_VIOLATION_CODE && !missingGrant) {
    return notAllowedMessage('alterar', 'scout');
  }
  if (missingGrant || (error.code && MISSING_TABLE_CODES.includes(error.code))) {
    return {
      title: 'Scout não configurado',
      message: 'O banco de dados ainda não está preparado para o scout. Execute o arquivo supabase/scout_entries.sql no SQL Editor do Supabase e tente de novo.',
    };
  }
  return { title, message: error.message };
};

// Clubes cadastrados na aba Clubes: tabela clubs e bucket público dos escudos (supabase/clubs.sql)
const CLUB_LOGO_BUCKET = 'club-logos';
const mapClubRow = (c: any): Club => ({ id: c.id, name: c.name, logo: c.logo_url || '', hidden: !!c.hidden });
// Caminho do escudo dentro do bucket, tirado do endereço público gravado
const clubLogoPath = (url?: string) => (url || '').split(`/${CLUB_LOGO_BUCKET}/`)[1] || '';
const clubErrorNotice = (title: string, error: { code?: string; message: string }): Notice => {
  console.error(title, error);
  const missingGrant = /permission denied for table/i.test(error.message);
  if (/row-level security|unauthorized|not authorized/i.test(error.message) || (error.code === RLS_VIOLATION_CODE && !missingGrant)) {
    return notAllowedMessage('alterar', 'clubes');
  }
  if (missingGrant || /bucket not found/i.test(error.message) || (error.code && MISSING_TABLE_CODES.includes(error.code))) {
    return {
      title: 'Clubes não configurados',
      message: 'O banco de dados ainda não está preparado para os clubes. Execute o arquivo supabase/clubs.sql no SQL Editor do Supabase e tente de novo.',
    };
  }
  return { title, message: error.message };
};

const mapScoutRow = (s: any): ScoutEntry => ({
  id: s.id,
  athleteId: s.athlete_id,
  gameId: s.game_id || undefined,
  year: s.season || '',
  analyst: s.analyst || '',
  team: s.team || '',
  matchDate: s.match_date || '',
  competition: s.competition || '',
  round: s.round || '',
  match: s.match || '',
  stats: s.stats || {},
  createdAt: s.created_at || undefined,
});

const scoutPayload = (entry: ScoutEntryInput) => ({
  athlete_id: entry.athleteId,
  season: entry.year || null,
  analyst: entry.analyst || null,
  team: entry.team || null,
  match_date: entry.matchDate || null,
  competition: entry.competition || null,
  round: entry.round || null,
  match: entry.match || null,
  stats: entry.stats,
  // Só vai quando a linha veio de um jogo do Calendário, para lançamento à mão continuar salvando sem a coluna game_id
  ...(entry.gameId ? { game_id: entry.gameId } : {}),
});

// Traduz o erro do Supabase para um aviso legível na interface
// Arquivos de contrato: bucket privado do Supabase Storage (supabase/contract_files.sql)
const CONTRACT_BUCKET = 'contracts';
const contractFileNotice = (title: string, error: { message: string; statusCode?: string | number }): Notice => {
  console.error(title, error);
  if (/bucket not found/i.test(error.message)) {
    return { title: 'Arquivos de contrato não configurados', message: 'O envio de arquivos ainda não foi configurado no Supabase. Nenhum arquivo foi enviado.' };
  }
  if (/row-level security|unauthorized|not authorized/i.test(error.message)) {
    return notAllowedMessage('enviar ou abrir', 'arquivos de contrato');
  }
  return { title, message: error.message };
};

const errorNotice = (title: string, error: { code?: string; message: string }): Notice => {
  if (error.code === MISSING_COLUMN_CODE) {
    return {
      title: 'Informações não inseridas',
      message: 'Não foi possível salvar os dados do atleta. Nenhuma informação foi inserida.',
    };
  }
  return { title, message: error.message };
};

// Atleta sem clube aparece como "Sem Clube" (registros antigos gravaram "Livre no Mercado" ou "None")
const NO_CLUB = 'Sem Clube';
const clubName = (club?: string | null) => {
  const name = (club || '').trim();
  return !name || name === 'Livre no Mercado' || name === 'None' ? NO_CLUB : name;
};

const mapAthleteRow = (a: any): Athlete => ({
  ...a,
  club: clubName(a.club),
  lastName: a.last_name,
  secondaryPosition: a.secondary_position,
  clubLogo: a.club_logo,
  birthDate: a.birth_date,
  preferredFoot: a.preferred_foot,
  hasDualNationality: a.has_dual_nationality ?? false,
  secondNationality: a.second_nationality,
  hasDvd: a.has_dvd,
  dvdLink: a.dvd_link,
  whatsappAthlete: a.whatsapp_athlete,
  whatsappGuardian: a.whatsapp_guardian,
  whatsappAgent: a.whatsapp_agent,
  hasAgent: a.has_agent ?? !!a.whatsapp_agent,
  agentCompany: a.agent_company,
  agentName: a.agent_name,
  contractType: a.contract_type,
  contractLevel: a.contract_level,
  contractClub: a.contract_club,
  contractStart: a.contract_start,
  contractEnd: a.contract_end,
  contractLink: a.contract_link,
  contractFile: a.contract_file || undefined,
  onLoan: a.on_loan ?? false,
  loanClub: a.loan_club,
  loanStart: a.loan_start,
  loanEnd: a.loan_end,
  contractGoals: a.contract_goals || [],
  tacticalMeetings: (Array.isArray(a.tactical_meetings) ? a.tactical_meetings : []).map((m: TacticalMeeting) => ({ ...m, materials: m.materials || [] })),
  source: a.source || 'Captado',
  listType: a.list_type || 'agenciados',
});

// "2026-10-12" vira "12/10/2026"; com horário, "12/10/2026 às 15:00"
const formatDay = (date?: string, time?: string) => {
  const [year, month, day] = (date || '').slice(0, 10).split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}${time ? ` às ${time.slice(0, 5)}` : ''}`;
};

const UUID_PATTERN =/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cópia das notificações lidas e limpas neste navegador, usada só enquanto supabase/notification_reads.sql não foi rodado
const READ_NOTIFICATIONS_KEY = 'fieldpro_read_notifications_v1';
const CLEARED_NOTIFICATIONS_KEY = 'fieldpro_cleared_notifications_v1';

const loadIds = (key: string): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const saveIds = (key: string, ids: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Sem acesso ao armazenamento: vale só até recarregar a página
  }
};

export default function App() {
  const [view, setView] = useState<View>('login');
  // Atletas como vêm do banco; a lista usada pelas telas é `athletes`, logo abaixo, já com os escudos do cadastro de clubes
  const [rawAthletes, setAthletes] = useState<Athlete[]>([]);
  // Clubes cadastrados na aba Clubes (os principais do Brasil já vêm no app, em src/clubs.ts)
  const [clubs, setClubs] = useState<Club[]>([]);
  const allClubs = useMemo(() => mergeClubs(clubs), [clubs]);
  const registryLogos = useMemo(() => clubLogoMap(allClubs), [allClubs]);
  // Escudos enviados nos cadastros de atleta antes de existir a aba Clubes: valem para o clube que não tem escudo lá
  const athleteLogos = useMemo(() => {
    const logos = new Map<string, string>();
    rawAthletes.forEach((athlete) => {
      const key = clubKey(athlete.club);
      if (key && athlete.clubLogo && !logos.has(key)) logos.set(key, athlete.clubLogo);
    });
    return logos;
  }, [rawAthletes]);
  // Escudo de um clube pelo nome: primeiro o do cadastro de clubes, depois o de algum atleta daquele clube
  const resolveClubLogo = (club?: string | null) => {
    const key = clubKey(club || '');
    return key ? registryLogos.get(key) || athleteLogos.get(key) : undefined;
  };
  // Só para atleta vindo do banco (mapAthleteRow): aplicar de novo trocaria o escudo próprio pelo do cadastro
  const enrichAthlete = (athlete: Athlete): Athlete => ({
    ...athlete,
    ownClubLogo: athlete.clubLogo,
    clubLogo: resolveClubLogo(athlete.club) || athlete.clubLogo,
    loanClubLogo: resolveClubLogo(athlete.loanClub),
  });
  const athletes = useMemo(() => rawAthletes.map(enrichAthlete), [rawAthletes, registryLogos, athleteLogos]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [isAddingAthlete, setIsAddingAthlete] = useState(false);
  // Lista escolhida na pergunta do "Adicionar atleta", guardada na abertura do cadastro
  const [addingListType, setAddingListType] = useState<'agenciados' | 'negociados'>('agenciados');
  const [isViewingAthleteProfile, setIsViewingAthleteProfile] = useState(false);
  const [isEditingAthlete, setIsEditingAthlete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [scoutEntries, setScoutEntries] = useState<ScoutEntry[]>([]);
  const isAdmin = session?.user?.app_metadata?.role === 'admin';
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // Arquivo do contrato aberto dentro do app (endereços temporários do Storage)
  const [contractViewer, setContractViewer] = useState<{ name: string; url: string; downloadUrl: string } | null>(null);
  // O sino do menu lateral abre e fecha a central de notificações do painel e mostra quantas não foram lidas
  const [showNotifications, setShowNotifications] = useState(false);
  // Lidas e limpas: por pessoa na tabela notification_reads; sem ela (SQL ainda não rodado), só neste navegador
  const [readIds, setReadIds] = useState<string[]>(() => loadIds(READ_NOTIFICATIONS_KEY));
  const [clearedIds, setClearedIds] = useState<string[]>(() => loadIds(CLEARED_NOTIFICATIONS_KEY));
  const readsInDb = useRef(false);
  const unreadNotifications = activities
    .map(activityKey)
    .filter(id => !clearedIds.includes(id) && !readIds.includes(id)).length;
  const toggleNotifications = () => {
    const open = view !== 'dashboard' || !showNotifications;
    setShowNotifications(open);
    if (open) {
      setView('dashboard');
      window.scrollTo({ top: 0 });
    }
  };
  const [profileDetailView, setProfileDetailView] = useState<'calendar' | 'stats' | 'tactical' | 'contract' | 'pdf' | null>(null);
  const athleteImageInputRef = useRef<HTMLInputElement | null>(null);
  const clubLogoInputRef = useRef<HTMLInputElement | null>(null);

  const clearAppAuth = () => {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    setSession(null);
    setSelectedAthlete(null);
    setIsAddingAthlete(false);
    setActivities([]);
    setGames([]);
    setScoutEntries([]);
    setView('login');
  };

  const hasExplicitLogin = () => window.localStorage.getItem(AUTH_SESSION_KEY) === 'true';

  const safeSupabaseCall = async <T,>(callback: () => Promise<T>, fallback: T): Promise<T> => {
    if (!hasSupabaseConfig || !supabase) {
      return fallback;
    }

    try {
      return await callback();
    } catch (err) {
      console.error('Erro ao acessar Supabase:', err);
      return fallback;
    }
  };

  const handlePasswordResetRequest = async (email: string) => {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');
    }

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      throw new Error('Informe o e-mail cadastrado.');
    }

    const redirectTo = `${window.location.origin}/`;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (error) {
      throw new Error(error.message || 'Não foi possível enviar o e-mail de recuperação.');
    }

    setView('verification');
  };

  const handlePasswordUpdate = async (newPassword: string) => {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message || 'Não foi possível alterar a senha.');
    }

    setView('success');
  };

  const confirmLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const handleLogout = async () => {
    if (!hasSupabaseConfig || !supabase) {
      clearAppAuth();
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao encerrar sessão:', error);
    }

    clearAppAuth();
  };

  const getRecoveryParams = () => {
    const query = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);

    return {
      type: query.get('type') ?? hashParams.get('type'),
      accessToken: query.get('access_token') ?? hashParams.get('access_token'),
      refreshToken: query.get('refresh_token') ?? hashParams.get('refresh_token'),
      code: query.get('code') ?? hashParams.get('code'),
      token: query.get('token') ?? hashParams.get('token'),
    };
  };

  const recoveryUrlHasParams = () => {
    const href = window.location.href;
    return /(type=recovery|access_token=|refresh_token=|code=|token=)/i.test(href);
  };

  const isRecoveryLink = () => {
    const href = window.location.href;
    return recoveryUrlHasParams() || /\/reset-password|\/recovery/i.test(href);
  };

  const handleRecoveryTokenFromUrl = async () => {
    if (!hasSupabaseConfig || !supabase) {
      return false;
    }

    const href = window.location.href;
    const combinedSearch = `${window.location.search}${window.location.hash}`;
    const params = new URLSearchParams(combinedSearch.startsWith('?') || combinedSearch.startsWith('#') ? combinedSearch.replace(/^#/, '?') : combinedSearch);

    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');
    const token = params.get('token');

    if (!type && !accessToken && !refreshToken && !code && !token && !/(access_token|refresh_token|code=|token=|type=recovery)/i.test(href)) {
      return false;
    }

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Erro ao trocar code de recuperação:', error);
        return false;
      }

      if (data.session) {
        setSession(data.session);
        window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
        setView('security');
        return true;
      }
    }

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('Erro ao validar link de recuperação:', error);
        return false;
      }

      if (data.session) {
        setSession(data.session);
        window.history.replaceState({}, document.title, window.location.pathname);
        setView('security');
        return true;
      }
    }

    if (token) {
      const { data, error } = await supabase.auth.verifyOtp({
        token,
        type: 'recovery',
      });

      if (error) {
        console.error('Erro ao verificar token de recuperação:', error);
        return false;
      }

      if (data.session) {
        setSession(data.session);
        window.history.replaceState({}, document.title, window.location.pathname);
        setView('security');
        return true;
      }
    }

    if (type === 'recovery' || /(access_token|refresh_token|code=|token=|type=recovery)/i.test(href)) {
      setView('security');
      return true;
    }

    return false;
  };

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      clearAppAuth();
      return;
    }

    const initializeAuth = async () => {
      if (isRecoveryLink()) {
        const recoveryHandled = await handleRecoveryTokenFromUrl();
        if (recoveryHandled) {
          return;
        }

        setView('security');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      const authenticatedByUser = hasExplicitLogin();
      if (session && authenticatedByUser) {
        setView('dashboard');
        return;
      }

      clearAppAuth();
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (isRecoveryLink()) {
        setView('security');
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        setView('security');
        return;
      }

      if (event === 'SIGNED_OUT') {
        clearAppAuth();
        return;
      }

      // O Supabase repete o evento de sessão ao voltar para a aba e ao renovar o token:
      // só sai da tela de login, sem tirar o usuário da tela em que ele está
      if (session && hasExplicitLogin()) {
        setView(prev => (prev === 'login' ? 'dashboard' : prev));
        return;
      }

      if (session) {
        setView('login');
        return;
      }

      clearAppAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase || !session) {
      return;
    }

    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from('recent_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data && !error) {
        setActivities(data);
      }
    };

    // Sem a tabela notification_reads, lidas e limpas continuam só neste navegador (sem aviso na tela)
    const fetchNotificationReads = async () => {
      const { data, error } = await supabase
        .from('notification_reads')
        .select('activity_id, read_at, cleared_at')
        .eq('user_id', session.user.id);
      if (error) {
        console.error('Erro ao carregar notificações lidas:', error);
        readsInDb.current = false;
        return;
      }
      readsInDb.current = true;
      setReadIds((data ?? []).filter(row => row.read_at).map(row => String(row.activity_id)));
      setClearedIds((data ?? []).filter(row => row.cleared_at).map(row => String(row.activity_id)));
    };
    fetchNotificationReads().catch(err => console.error('Erro ao carregar notificações lidas:', err));

    // Cada carga devolve false quando falhou (sem internet, por exemplo); tabela ainda não criada não conta como falha
    const loadFailed = (label: string, error: { code?: string; message: string }) => {
      console.error(`Erro ao carregar ${label}:`, error);
      return !MISSING_TABLE_CODES.includes(error.code ?? '');
    };

    const fetchAthletes = async () => {
      fetchActivities();
      const { data, error } = await supabase.from('athletes').select('*');
      if (error) {
        console.error('Erro ao carregar atletas:', error);
        return false;
      }
      setAthletes((data ?? []).map(mapAthleteRow));
      return true;
    };

    const fetchGames = async () => {
      const { data, error } = await supabase.from('games').select('*');
      if (error) return !loadFailed('jogos', error);
      setGames((data ?? []).map(mapGameRow));
      return true;
    };

    const fetchScoutEntries = async () => {
      const { data, error } = await supabase.from('scout_entries').select('*');
      if (error) return !loadFailed('scout', error);
      setScoutEntries((data ?? []).map(mapScoutRow));
      return true;
    };

    const fetchClubs = async () => {
      const { data, error } = await supabase.from('clubs').select('*');
      if (error) return !loadFailed('clubes', error);
      setClubs((data ?? []).map(mapClubRow));
      return true;
    };

    const safely = (load: () => Promise<boolean>) =>
      load().catch(err => {
        console.error('Erro ao carregar dados:', err);
        return false;
      });

    // Sem a lista de exemplo: se algo não carregar, o usuário é avisado em vez de ver dados incompletos sem saber
    Promise.all([safely(fetchAthletes), safely(fetchGames), safely(fetchScoutEntries), safely(fetchClubs)]).then(results => {
      if (results.includes(false)) {
        setNotice({
          title: 'Dados não carregados',
          message: 'Não foi possível carregar todas as informações do app. Confira a conexão com a internet e recarregue a página.',
        });
      }
    });
  }, [session]);

  // Grava uma ou mais linhas na central de notificações. Sem a coluna details (recent_activities.sql ainda não rodado de novo), grava sem o detalhe
  const recordActivity = async (activity: any | any[]) => {
    const rows = (Array.isArray(activity) ? activity : [activity]).filter(Boolean);
    if (rows.length === 0 || !hasSupabaseConfig || !supabase) return;
    try {
      let { error } = await supabase.from('recent_activities').insert(rows);
      if (error?.code === MISSING_COLUMN_CODE) {
        ({ error } = await supabase.from('recent_activities').insert(rows.map(({ details, ...row }) => row)));
      }
      if (error) throw error;


      const { data } = await supabase
        .from('recent_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setActivities(data);
    } catch (err) {
      console.error('Erro ao gravar atividade:', err);
    }
  };

  // Colunas de atividade que apontam para um atleta (clicar na notificação abre o perfil dele)
  const athleteActivity = (athlete: Athlete) => ({
    subtitle: `${athlete.name} ${athlete.lastName || ''}`.trim().toUpperCase(),
    club: athlete.club || null,
    club_logo: athlete.clubLogo || null,
    athlete_id: UUID_PATTERN.test(athlete.id) ? athlete.id : null,
  });

  // Metas do contrato que passam a estar batidas com uma gravação (meta manual ou soma do scout)
  const goalActivities = (before: Athlete, after: Athlete, entriesBefore: ScoutEntry[], entriesAfter: ScoutEntry[]) => {
    const doneBefore = new Set(contractGoalProgress(before, entriesBefore).filter(p => p.status === 'done').map(p => p.goal.id));
    return contractGoalProgress(after, entriesAfter)
      .filter(p => p.status === 'done' && !doneBefore.has(p.goal.id))
      .map(p => ({
        type: 'META',
        title: 'META BATIDA',
        details: `${p.goal.title}: ${formatNumber(p.value, p.isPercent)} de ${formatNumber(p.goal.target, p.isPercent)}`,
        ...athleteActivity(after),
      }));
  };

  // Marca notificações como lidas ou limpas para quem está logado; vale em todos os aparelhos da pessoa
  const saveNotificationState = async (ids: string[], column: 'read_at' | 'cleared_at') => {
    const storageKey = column === 'read_at' ? READ_NOTIFICATIONS_KEY : CLEARED_NOTIFICATIONS_KEY;
    (column === 'read_at' ? setReadIds : setClearedIds)(prev => {
      const next = Array.from(new Set([...prev, ...ids])).slice(-200);
      if (!readsInDb.current) saveIds(storageKey, next);
      return next;
    });

    if (!readsInDb.current || !supabase || !session) return;
    const now = new Date().toISOString();
    const rows = ids
      .filter(id => UUID_PATTERN.test(id))
      .map(activity_id => ({ user_id: session.user.id, activity_id, [column]: now }));
    if (rows.length === 0) return;
    const { error } = await supabase.from('notification_reads').upsert(rows, { onConflict: 'user_id,activity_id' });
    if (error) console.error('Erro ao gravar notificação lida:', error);
  };

  // Depois de salvar ou apagar, volta para a Carteira de Atletas
  const returnToList = () => setView('atletas-totais');

  const navigateTo = (next: View) => setView(next);

  // contractUpload: arquivo de contrato escolhido no formulário, enviado ao Storage antes de gravar o atleta
  const handleSaveAthlete = async (athleteData: Partial<Athlete>, contractUpload?: File) => {
    if (!isAdmin) {
      setNotice(notAllowedMessage(selectedAthlete ? 'editar' : 'cadastrar'));
      return;
    }

    const missingFields = [
      !`${athleteData.name || ''} ${athleteData.lastName || ''}`.trim() && 'Nome Completo',
      !athleteData.birthDate && 'Data de Nascimento',
      !athleteData.category && 'Categoria',
      !athleteData.position && 'Posição Principal',
    ].filter(Boolean);
    if (missingFields.length > 0) {
      setNotice({
        title: 'Campos obrigatórios não preenchidos',
        message: `Preencha para salvar o atleta: ${missingFields.join(', ')}.`,
      });
      return;
    }

    // Cada atleta pertence a uma só lista: na edição mantém a dele, no cadastro entra na aba aberta
    const listType = selectedAthlete?.listType ?? addingListType;

    if (!hasSupabaseConfig || !supabase) {
      const nextAthlete: Athlete = {
        id: `local-${Date.now()}`,
        name: athleteData.name || 'Novo',
        lastName: athleteData.lastName || 'Atleta',
        position: athleteData.position || 'Meia',
        secondaryPosition: athleteData.secondaryPosition,
        category: athleteData.category || 'Sub-20',
        club: clubName(athleteData.club),
        clubLogo: athleteData.clubLogo,
        status: 'Livre no Mercado',
        rating: athleteData.rating || 'A',
        image: athleteData.image || 'https://picsum.photos/seed/new_athlete/300/300',
        naturalidade: athleteData.naturalidade,
        nacionalidade: athleteData.nacionalidade,
        hasDualNationality: athleteData.hasDualNationality,
        secondNationality: athleteData.secondNationality,
        birthDate: athleteData.birthDate,
        age: athleteData.age,
        preferredFoot: athleteData.preferredFoot,
        weight: athleteData.weight,
        height: athleteData.height,
        whatsappAthlete: athleteData.whatsappAthlete,
        whatsappGuardian: athleteData.whatsappGuardian,
        whatsappAgent: athleteData.whatsappAgent,
        hasAgent: athleteData.hasAgent,
        agentCompany: athleteData.agentCompany,
        agentName: athleteData.agentName,
        contractType: athleteData.contractType,
        contractLevel: athleteData.contractLevel,
        contractClub: athleteData.contractClub,
        contractStart: athleteData.contractStart,
        contractEnd: athleteData.contractEnd,
        contractLink: athleteData.contractLink,
        onLoan: athleteData.onLoan,
        loanClub: athleteData.loanClub,
        loanStart: athleteData.loanStart,
        loanEnd: athleteData.loanEnd,
        contractGoals: selectedAthlete?.contractGoals,
        tacticalMeetings: selectedAthlete?.tacticalMeetings,
        notes: athleteData.notes,
        hasDvd: athleteData.hasDvd,
        dvdLink: athleteData.dvdLink,
        source: athleteData.source || 'Captado',
        listType,
        stats: athleteData.stats || { tactical: 70, physical: 70, technical: 70 },
      };

      setAthletes(prev => {
        const existing = selectedAthlete ? prev.filter(item => item.id !== selectedAthlete.id) : prev;
        return [nextAthlete, ...existing];
      });
      setSelectedAthlete(null);
      setIsAddingAthlete(false);
      returnToList();
      return;
    }

    setLoading(true);
    console.log('Salvando dados do atleta:', athleteData);
    
    const payload = {
      name: athleteData.name || '',
      last_name: athleteData.lastName || '',
      position: athleteData.position || 'Meia',
      secondary_position: athleteData.secondaryPosition,
      category: athleteData.category || 'Sub-20',
      club: clubName(athleteData.club),
      club_logo: athleteData.clubLogo,
      status: clubName(athleteData.club) !== NO_CLUB ? 'In Club' : 'Livre no Mercado',
      rating: athleteData.rating || 'A',
      image: athleteData.image || 'https://picsum.photos/seed/new_athlete/300/300',
      naturalidade: athleteData.naturalidade,
      nacionalidade: athleteData.nacionalidade,
      has_dual_nationality: athleteData.hasDualNationality ?? false,
      second_nationality: athleteData.secondNationality || null,
      birth_date: athleteData.birthDate || null,
      age: athleteData.age ?? null,
      preferred_foot: athleteData.preferredFoot || null,
      weight: athleteData.weight ?? null,
      height: athleteData.height ?? null,
      whatsapp_athlete: athleteData.whatsappAthlete || null,
      whatsapp_guardian: athleteData.whatsappGuardian || null,
      whatsapp_agent: athleteData.whatsappAgent || null,
      has_agent: athleteData.hasAgent ?? false,
      agent_company: athleteData.agentCompany || null,
      agent_name: athleteData.agentName || null,
      contract_type: athleteData.contractType || null,
      contract_level: athleteData.contractLevel || null,
      contract_club: athleteData.contractClub || null,
      contract_start: athleteData.contractStart || null,
      contract_end: athleteData.contractEnd || null,
      contract_link: athleteData.contractLink || null,
      // Arquivo do contrato: a coluna só vai quando há arquivo a gravar ou a apagar (mesma razão do empréstimo, abaixo)
      ...(athleteData.contractFile || selectedAthlete?.contractFile ? { contract_file: athleteData.contractFile || null } : {}),
      // Empréstimo: as colunas só vão quando há empréstimo a gravar ou a apagar, para os outros atletas
      // continuarem salvando antes de o arquivo SQL ser rodado de novo
      ...(athleteData.onLoan || selectedAthlete?.onLoan || selectedAthlete?.loanClub ? {
        on_loan: athleteData.onLoan ?? false,
        loan_club: athleteData.loanClub || null,
        loan_start: athleteData.loanStart || null,
        loan_end: athleteData.loanEnd || null,
      } : {}),
      notes: athleteData.notes,
      has_dvd: athleteData.hasDvd,
      dvd_link: athleteData.dvdLink,
      source: athleteData.source || 'Captado',
      list_type: listType,
      stats: athleteData.stats || { tactical: 70, physical: 70, technical: 70 }
    };

    let error: any = null;

    // Envia o arquivo do contrato primeiro; se o envio falhar, nada é gravado
    let uploadedFile = '';
    // Linha devolvida pelo banco na edição: é com ela que o perfil reabre depois de salvar
    let savedRow: any = null;
    if (contractUpload) {
      const safeName = contractUpload.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '-');
      const path = `${crypto.randomUUID()}/${safeName}`;
      const { error: uploadError } = await supabase.storage.from(CONTRACT_BUCKET).upload(path, contractUpload, { contentType: contractUpload.type || undefined });
      if (uploadError) {
        setNotice(contractFileNotice('Erro ao enviar o contrato', uploadError));
        setLoading(false);
        return;
      }
      uploadedFile = path;
      Object.assign(payload, { contract_file: path });
    }
    
    const isEditingRealAthlete = selectedAthlete && 
      UUID_PATTERN.test(selectedAthlete.id);

    if (isEditingRealAthlete) {
      console.log('Atualizando atleta real com ID:', selectedAthlete.id);
      const { data: updatedData, error: updateError } = await supabase
        .from('athletes')
        .update(payload)
        .eq('id', selectedAthlete.id)
        .select();
      error = updateError;
      savedRow = updatedData?.[0] || null;

      // RLS bloqueia o update sem retornar erro: nenhuma linha é alterada
      if (!error && (!updatedData || updatedData.length === 0)) {
        console.error('Atualização bloqueada: nenhuma linha afetada para o ID', selectedAthlete.id);
        setNotice(notAllowedMessage('editar'));
        setLoading(false);
        return;
      }

      if (!error) {
        const isNewDvd = athleteData.hasDvd && !selectedAthlete.hasDvd;
        recordActivity({
          type: isNewDvd ? 'DVD' : 'ATHLETE_UPDATE',
          title: isNewDvd ? 'DVD ADICIONADO' : 'PERFIL ATUALIZADO',
          subtitle: `${athleteData.name} ${athleteData.lastName}`.toUpperCase(),
          club: payload.club,
          club_logo: resolveClubLogo(payload.club) || payload.club_logo,
          athlete_id: selectedAthlete.id
        });
      }
    } else {
      console.log('Inserindo novo atleta (ou convertendo mock para real)');
      const { data: insertedData, error: insertError } = await supabase
        .from('athletes')
        .insert([payload])
        .select();
      error = insertError;

      if (!error && insertedData?.[0]) {
        recordActivity({
          type: 'CONTRATO',
          title: listType === 'negociados' ? 'NOVO ATLETA NEGOCIADO' : 'NOVO ATLETA AGENCIADO',
          subtitle: `${athleteData.name} ${athleteData.lastName}`.toUpperCase(),
          club: payload.club,
          club_logo: resolveClubLogo(payload.club) || payload.club_logo,
          athlete_id: insertedData[0].id
        });
      }
    }

    if (error) {
      console.error('Erro ao salvar atleta:', error);
      // O atleta não foi gravado: o arquivo enviado agora não fica sobrando no Storage
      if (uploadedFile) supabase.storage.from(CONTRACT_BUCKET).remove([uploadedFile]);
      if (error.code === RLS_VIOLATION_CODE) {
        setNotice(notAllowedMessage(isEditingRealAthlete ? 'editar' : 'cadastrar'));
      } else {
        setNotice(errorNotice('Erro ao salvar atleta', error));
      }
    } else {
      console.log('Atleta salvo com sucesso!');
      // Arquivo antigo trocado ou removido: apaga do Storage (se falhar, só fica sobrando lá)
      const oldFile = selectedAthlete?.contractFile;
      if (oldFile && oldFile !== (uploadedFile || athleteData.contractFile || '')) {
        supabase.storage.from(CONTRACT_BUCKET).remove([oldFile]).then(({ error: removeError }) => {
          if (removeError) console.error('Erro ao apagar o arquivo antigo do contrato:', removeError);
        });
      }
      // Na edição volta ao perfil do atleta, já com os dados novos; no cadastro vai para a Carteira de Atletas
      if (savedRow) {
        openAthleteProfile(enrichAthlete(mapAthleteRow(savedRow)));
      } else {
        setSelectedAthlete(null);
        setIsAddingAthlete(false);
        returnToList();
      }

      const { data, error: fetchError } = await supabase.from('athletes').select('*');
      if (fetchError) {
        console.error('Erro ao atualizar lista local:', fetchError);
      } else if (data) {
        setAthletes(data.map(mapAthleteRow));
      }
    }
    
    setLoading(false);
  };

  // Abre o arquivo do contrato dentro do app: o bucket é privado, então o endereço é temporário (1 hora)
  const openContractFile = async (athlete: Athlete) => {
    if (!athlete.contractFile || !supabase) return;
    const name = contractFileName(athlete.contractFile);
    const storage = supabase.storage.from(CONTRACT_BUCKET);
    const [view, download] = await Promise.all([
      storage.createSignedUrl(athlete.contractFile, 3600),
      storage.createSignedUrl(athlete.contractFile, 3600, { download: name }),
    ]);
    if (view.error || !view.data) {
      setNotice(contractFileNotice('Erro ao abrir o contrato', view.error || { message: 'Arquivo não encontrado.' }));
      return;
    }
    setContractViewer({ name, url: view.data.signedUrl, downloadUrl: download.data?.signedUrl || view.data.signedUrl });
  };

  // Baixa o arquivo do contrato direto, sem abrir a janela de visualização
  const downloadContractFile = async (athlete: Athlete) => {
    if (!athlete.contractFile || !supabase) return;
    const name = contractFileName(athlete.contractFile);
    const { data, error } = await supabase.storage.from(CONTRACT_BUCKET).createSignedUrl(athlete.contractFile, 3600, { download: name });
    if (error || !data) {
      setNotice(contractFileNotice('Erro ao baixar o contrato', error || { message: 'Arquivo não encontrado.' }));
      return;
    }
    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Grava um ou mais clubes da aba Clubes (cadastro, edição ou envio de vários escudos). Devolve true quando todos foram gravados
  const handleSaveClubs = async (inputs: ClubInput[]) => {
    if (!isAdmin) {
      setNotice(notAllowedMessage('alterar', 'clubes'));
      return false;
    }
    if (!hasSupabaseConfig || !supabase) return false;

    let failed = false;
    for (const input of inputs) {
      // Clube apagado antes e cadastrado de novo: reaproveita a linha que o escondia
      const current = input.id
        ? clubs.find((club) => club.id === input.id)
        : clubs.find((club) => club.hidden && clubKey(club.name) === clubKey(input.name));
      let logoUrl: string | undefined;
      let uploadedPath = '';
      if (input.file) {
        const extension = (input.file.name.match(/\.([a-z0-9]+)$/i)?.[1] || 'png').toLowerCase();
        uploadedPath = `${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(CLUB_LOGO_BUCKET).upload(uploadedPath, input.file, { contentType: input.file.type || undefined });
        if (uploadError) {
          setNotice(clubErrorNotice('Erro ao enviar o escudo', uploadError));
          failed = true;
          break;
        }
        logoUrl = supabase.storage.from(CLUB_LOGO_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
      }

      // Sem arquivo novo, o clube que já vem no app leva o escudo que tinha
      const keptLogo = !current && input.logo ? input.logo : undefined;
      const row = { name: input.name, ...(logoUrl || keptLogo ? { logo_url: logoUrl || keptLogo } : {}), ...(current?.hidden ? { hidden: false } : {}) };
      const { data, error } = current
        ? await supabase.from('clubs').update(row).eq('id', current.id).select()
        : await supabase.from('clubs').insert([row]).select();
      // RLS bloqueia o update sem retornar erro: nenhuma linha é alterada
      if (error || !data || data.length === 0) {
        if (uploadedPath) supabase.storage.from(CLUB_LOGO_BUCKET).remove([uploadedPath]);
        setNotice(error ? clubErrorNotice('Erro ao salvar o clube', error) : notAllowedMessage('alterar', 'clubes'));
        failed = true;
        break;
      }
      // Clube que já vem no app e mudou de nome: o nome antigo é escondido, senão voltaria a aparecer ao lado do novo
      const oldName = current && !current.hidden ? current.name : input.replaces;
      const oldKey = clubKey(oldName);
      if (oldName && oldKey !== clubKey(input.name) && BUILTIN_CLUBS.some((item) => clubKey(item.name) === oldKey)
        && !clubs.some((club) => club.hidden && clubKey(club.name) === oldKey)) {
        const { error: hideError } = await supabase.from('clubs').insert([{ name: oldName, logo_url: null, hidden: true }]);
        if (hideError) console.error('Erro ao esconder o nome antigo do clube:', hideError);
      }
      // Escudo trocado: o arquivo antigo sai do Storage (se falhar, só fica sobrando lá)
      const oldPath = logoUrl ? clubLogoPath(current?.logo) : '';
      if (oldPath) supabase.storage.from(CLUB_LOGO_BUCKET).remove([oldPath]);
    }

    // Recarrega mesmo quando parou no meio, para a lista mostrar o que chegou a ser gravado
    const { data: rows } = await supabase.from('clubs').select('*');
    if (rows) setClubs(rows.map(mapClubRow));
    return !failed;
  };

  const handleDeleteClub = async (club: Club) => {
    if (!isAdmin) {
      setNotice(notAllowedMessage('excluir', 'clubes'));
      return false;
    }
    if (!hasSupabaseConfig || !supabase) return false;
    // Clube que já vem no app não tem como sair do código: uma linha no banco passa a escondê-lo. Os demais são apagados de vez
    const isBuiltin = BUILTIN_CLUBS.some((item) => clubKey(item.name) === clubKey(club.name));
    const hiddenRow = { name: club.name, logo_url: null, hidden: true };
    const { data, error } = !isBuiltin
      ? await supabase.from('clubs').delete().eq('id', club.id || '').select()
      : club.id
        ? await supabase.from('clubs').update(hiddenRow).eq('id', club.id).select()
        : await supabase.from('clubs').insert([hiddenRow]).select();
    if (error || !data || data.length === 0) {
      setNotice(error ? clubErrorNotice('Erro ao excluir o clube', error) : notAllowedMessage('excluir', 'clubes'));
      return false;
    }
    const path = clubLogoPath(club.logo);
    if (path) supabase.storage.from(CLUB_LOGO_BUCKET).remove([path]);
    const { data: rows } = await supabase.from('clubs').select('*');
    if (rows) setClubs(rows.map(mapClubRow));
    return true;
  };

  const handleDeleteAthlete = async (id: string) => {
    if (!isAdmin) {
      setNotice(notAllowedMessage('excluir'));
      return;
    }

    if (!hasSupabaseConfig || !supabase) {
      setAthletes(prev => prev.filter(a => a.id !== id));
      setSelectedAthlete(null);
      setIsAddingAthlete(false);
      returnToList();
      return;
    }

    setLoading(true);
    console.log('Apagando atleta com ID:', id);
    
    const isUuid = UUID_PATTERN.test(id);
    
    if (isUuid) {
      const { data: deletedData, error } = await supabase.from('athletes').delete().eq('id', id).select();

      if (error) {
        console.error('Erro ao apagar atleta do banco:', error);
        setNotice(error.code === RLS_VIOLATION_CODE ? notAllowedMessage('excluir') : errorNotice('Erro ao apagar atleta', error));
        setLoading(false);
        return;
      }

      // RLS bloqueia o delete sem retornar erro: nenhuma linha é apagada
      if (!deletedData || deletedData.length === 0) {
        console.error('Exclusão bloqueada: nenhuma linha afetada para o ID', id);
        setNotice(notAllowedMessage('excluir'));
        setLoading(false);
        return;
      }
      console.log('Atleta apagado do banco com sucesso');
      const deletedFile = deletedData[0]?.contract_file;
      if (deletedFile) supabase.storage.from(CONTRACT_BUCKET).remove([deletedFile]);
    } else {
      console.log('ID não é UUID, removendo apenas localmente');
    }
    
    setAthletes(prev => prev.filter(a => a.id !== id));
    setSelectedAthlete(null);
    setIsAddingAthlete(false);
    returnToList();

    if (isUuid) {
      const { data } = await supabase.from('athletes').select('*');
      if (data) {
        setAthletes(data.map(mapAthleteRow));
      }
    }
    
    setLoading(false);
  };

  // Metas do contrato (ícone Contrato do perfil): grava só a coluna contract_goals, fora do formulário do atleta
  const handleSaveContractGoals = async (athlete: Athlete, goals: ContractGoal[]): Promise<boolean> => {
    if (!isAdmin) {
      setNotice(notAllowedMessage('editar'));
      return false;
    }

    const isUuid = UUID_PATTERN.test(athlete.id);
    if (hasSupabaseConfig && supabase && isUuid) {
      const { data, error } = await supabase.from('athletes').update({ contract_goals: goals }).eq('id', athlete.id).select('id');

      if (error) {
        console.error('Erro ao salvar metas do contrato:', error);
        if (error.code === RLS_VIOLATION_CODE) {
          setNotice(notAllowedMessage('editar'));
        } else if (error.code === MISSING_COLUMN_CODE) {
          setNotice({
            title: 'Metas não configuradas',
            message: 'O banco de dados ainda não está preparado para as metas do contrato. Execute o arquivo supabase/athlete_profile_fields.sql no SQL Editor do Supabase e tente de novo.',
          });
        } else {
          setNotice(errorNotice('Erro ao salvar metas', error));
        }
        return false;
      }

      // RLS bloqueia o update sem retornar erro: nenhuma linha é alterada
      if (!data || data.length === 0) {
        setNotice(notAllowedMessage('editar'));
        return false;
      }
    }

    const entries = scoutEntriesOf(athlete);
    recordActivity(goalActivities(athlete, { ...athlete, contractGoals: goals }, entries, entries));

    setAthletes(prev => prev.map(a => (a.id === athlete.id ? { ...a, contractGoals: goals } : a)));
    setSelectedAthlete(prev => (prev && prev.id === athlete.id ? { ...prev, contractGoals: goals } : prev));
    return true;
  };

  // Reuniões do acompanhamento tático (ícone Acompanhamento Tático do perfil): grava só a coluna tactical_meetings, fora do formulário do atleta
  const handleSaveTacticalMeetings = async (athlete: Athlete, meetings: TacticalMeeting[]): Promise<boolean> => {
    if (!isAdmin) {
      setNotice(notAllowedMessage('editar'));
      return false;
    }

    const isUuid = UUID_PATTERN.test(athlete.id);
    if (hasSupabaseConfig && supabase && isUuid) {
      const { data, error } = await supabase.from('athletes').update({ tactical_meetings: meetings }).eq('id', athlete.id).select('id');

      if (error) {
        console.error('Erro ao salvar reuniões do acompanhamento tático:', error);
        if (error.code === RLS_VIOLATION_CODE) {
          setNotice(notAllowedMessage('editar'));
        } else if (error.code === MISSING_COLUMN_CODE) {
          setNotice({
            title: 'Acompanhamento tático não configurado',
            message: 'O banco de dados ainda não está preparado para as reuniões do acompanhamento tático. Execute o arquivo supabase/athlete_profile_fields.sql no SQL Editor do Supabase e tente de novo.',
          });
        } else {
          setNotice(errorNotice('Erro ao salvar reunião', error));
        }
        return false;
      }

      // RLS bloqueia o update sem retornar erro: nenhuma linha é alterada
      if (!data || data.length === 0) {
        setNotice(notAllowedMessage('editar'));
        return false;
      }
    }

    // Só reunião nova vira notificação; editar ou apagar uma reunião não
    const knownMeetings = new Set((athlete.tacticalMeetings || []).map(meeting => meeting.id));
    recordActivity(meetings.filter(meeting => !knownMeetings.has(meeting.id)).map(meeting => ({
      type: 'TACTICAL',
      title: 'NOVA REUNIÃO TÁTICA',
      details: [meeting.title, formatDay(meeting.date, meeting.time)].filter(Boolean).join(' · '),
      ...athleteActivity(athlete),
    })));

    setAthletes(prev => prev.map(a => (a.id === athlete.id ? { ...a, tacticalMeetings: meetings } : a)));
    setSelectedAthlete(prev => (prev && prev.id === athlete.id ? { ...prev, tacticalMeetings: meetings } : prev));
    return true;
  };

  // Devolve true quando o jogo foi gravado, para o formulário do calendário saber se pode fechar
  const handleSaveGame = async (gameData: Omit<Game, 'id'>, id?: string): Promise<boolean> => {
    if (!isAdmin) {
      setNotice(notAllowedMessage(id ? 'editar' : 'cadastrar', 'jogos'));
      return false;
    }

    const missingFields = [
      !gameData.date && 'Data',
      !gameData.home.trim() && 'Mandante',
      !gameData.away.trim() && 'Visitante',
    ].filter(Boolean);
    if (missingFields.length > 0) {
      setNotice({
        title: 'Campos obrigatórios não preenchidos',
        message: `Preencha para salvar o jogo: ${missingFields.join(', ')}.`,
      });
      return false;
    }

    if (!hasSupabaseConfig || !supabase) {
      const nextGame: Game = { athleteScouts: games.find(g => g.id === id)?.athleteScouts, ...gameData, id: id || `local-${Date.now()}` };
      setGames(prev => [nextGame, ...prev.filter(g => g.id !== nextGame.id)]);
      return true;
    }

    // A coluna athlete_minutes só vai no envio quando há minutos a gravar ou a apagar:
    // assim jogo sem minutagem continua salvando mesmo antes de rodar de novo o supabase/games.sql
    const hadMinutes = Object.keys(games.find(g => g.id === id)?.athleteMinutes || {}).length > 0;
    const sendMinutes = hadMinutes || Object.keys(gameData.athleteMinutes).length > 0;

    // O mesmo vale para a rodada: só vai quando foi preenchida ou quando o jogo já tinha uma
    const round = gameData.round?.trim() || '';
    const sendRound = Boolean(round) || Boolean(games.find(g => g.id === id)?.round);

    const payload = {
      ...(sendMinutes ? { athlete_minutes: gameData.athleteMinutes } : {}),
      ...(sendRound ? { round: round || null } : {}),
      game_date: gameData.date,
      game_time: gameData.time || null,
      home: gameData.home.trim(),
      away: gameData.away.trim(),
      venue: gameData.venue?.trim() || null,
      category: gameData.category || null,
      competition: gameData.competition?.trim() || null,
      athlete_ids: gameData.athleteIds,
    };

    const { data, error } = id
      ? await supabase.from('games').update(payload).eq('id', id).select()
      : await supabase.from('games').insert([payload]).select();

    if (error) {
      console.error('Erro ao salvar jogo:', error);
      setNotice(gameErrorNotice('Erro ao salvar jogo', error));
      return false;
    }

    // RLS bloqueia o update sem retornar erro: nenhuma linha é alterada
    if (!data || data.length === 0) {
      setNotice(notAllowedMessage(id ? 'editar' : 'cadastrar', 'jogos'));
      return false;
    }

    const savedGame = mapGameRow(data[0]);
    setGames(prev => [savedGame, ...prev.filter(g => g.id !== savedGame.id)]);

    // Só jogo novo vira notificação; clicar nela leva ao Calendário
    if (!id) {
      recordActivity({
        type: 'GAME',
        title: 'NOVO JOGO NO CALENDÁRIO',
        subtitle: `${payload.home} x ${payload.away}`.toUpperCase(),
        details: [payload.competition, payload.category, formatDay(payload.game_date, payload.game_time || undefined)].filter(Boolean).join(' · '),
        club: null,
        club_logo: null,
        athlete_id: null,
      });
    }
    return true;
  };

  // Grava lançamentos de scout (aba "Scout"): várias linhas novas de uma vez ou, com editingId, a alteração de uma só
  const handleSaveScoutEntries = async (rows: ScoutEntryInput[], editingId?: string): Promise<boolean> => {
    if (!isAdmin) {
      setNotice(notAllowedMessage('lançar', 'scout'));
      return false;
    }

    if (!hasSupabaseConfig || !supabase || editingId?.startsWith('local-')) {
      const saved: ScoutEntry[] = rows.map((row, index) => ({ ...row, id: editingId || `local-${Date.now()}-${index}` }));
      setScoutEntries(prev => [...saved, ...prev.filter(e => e.id !== editingId)]);
      return true;
    }

    const { data, error } = editingId
      ? await supabase.from('scout_entries').update(scoutPayload(rows[0])).eq('id', editingId).select()
      : await supabase.from('scout_entries').insert(rows.map(scoutPayload)).select();

    if (error) {
      console.error('Erro ao salvar scout:', error);
      setNotice(scoutErrorNotice('Erro ao salvar scout', error));
      return false;
    }

    // RLS bloqueia o update sem retornar erro: nenhuma linha é alterada
    if (!data || data.length === 0) {
      setNotice(notAllowedMessage('lançar', 'scout'));
      return false;
    }

    const saved = data.map(mapScoutRow);
    const entriesAfter = [...saved, ...scoutEntries.filter(e => e.id !== editingId)];
    setScoutEntries(prev => [...saved, ...prev.filter(e => e.id !== editingId)]);

    // Uma notificação por lançamento (não uma por atleta) e uma por meta do contrato que o scout fez bater
    const goalRows = athletes
      .filter(a => a.contractGoals?.length)
      .flatMap(a => goalActivities(a, a, scoutEntriesOf(a), scoutEntriesOf(a, entriesAfter)));
    let scoutRow = null;
    if (!editingId) {
      const savedAthletes = Array.from(new Set(saved.map(e => e.athleteId)))
        .map(athleteId => athletes.find(a => a.id === athleteId))
        .filter((a): a is Athlete => Boolean(a));
      const matches = Array.from(new Set(saved.map(e => [e.competition, e.match].filter(Boolean).join(' · ')).filter(Boolean)));
      const details = matches.length > 1 ? `${matches[0]} e mais ${matches.length - 1} partida(s)` : matches[0] || '';
      scoutRow = savedAthletes.length === 1
        ? { type: 'SCOUT', title: 'SCOUT LANÇADO', details, ...athleteActivity(savedAthletes[0]) }
        : { type: 'SCOUT', title: 'SCOUT LANÇADO', subtitle: `${savedAthletes.length} ATLETAS`, details, club: null, club_logo: null, athlete_id: null };
    }
    recordActivity([scoutRow, ...goalRows]);
    return true;
  };

  const handleDeleteScoutEntry = async (id: string): Promise<boolean> => {
    if (!isAdmin) {
      setNotice(notAllowedMessage('excluir', 'scout'));
      return false;
    }

    if (hasSupabaseConfig && supabase && !id.startsWith('local-')) {
      const { data, error } = await supabase.from('scout_entries').delete().eq('id', id).select();

      if (error) {
        console.error('Erro ao apagar scout:', error);
        setNotice(scoutErrorNotice('Erro ao apagar scout', error));
        return false;
      }

      // RLS bloqueia o delete sem retornar erro: nenhuma linha é apagada
      if (!data || data.length === 0) {
        setNotice(notAllowedMessage('excluir', 'scout'));
        return false;
      }
    }

    setScoutEntries(prev => prev.filter(e => e.id !== id));
    return true;
  };

  // Scout do atleta no perfil. Quem está nas duas listas tem dois cadastros (mesmo nome completo e nascimento): valem os lançamentos dos dois
  const scoutEntriesOf = (athlete: Athlete, entries: ScoutEntry[] = scoutEntries) => {
    const samePerson = (a: Athlete) => a.id === athlete.id
      || (Boolean(athlete.birthDate) && a.birthDate === athlete.birthDate && `${a.name} ${a.lastName}`.trim().toLowerCase() === `${athlete.name} ${athlete.lastName}`.trim().toLowerCase());
    const ids = new Set(athletes.filter(samePerson).map(a => a.id));
    return entries.filter(e => ids.has(e.athleteId));
  };

  // O outro cadastro de quem está nas duas listas (mesmo nome completo e nascimento, como em buildEntries)
  const twinOf = (athlete: Athlete) => {
    const keyOf = (a: Athlete) => `${`${a.name} ${a.lastName || ''}`.trim().toLowerCase().replace(/\s+/g, ' ')}|${(a.birthDate || '').slice(0, 10)}`;
    const listOf = (a: Athlete) => a.listType || 'agenciados';
    return athletes.find(a => a.id !== athlete.id && listOf(a) !== listOf(athlete) && keyOf(a) === keyOf(athlete)) || null;
  };

  const handleDeleteGame = async (id: string): Promise<boolean> => {
    if (!isAdmin) {
      setNotice(notAllowedMessage('excluir', 'jogos'));
      return false;
    }

    if (hasSupabaseConfig && supabase && !id.startsWith('local-')) {
      const { data, error } = await supabase.from('games').delete().eq('id', id).select();

      if (error) {
        console.error('Erro ao apagar jogo:', error);
        setNotice(gameErrorNotice('Erro ao apagar jogo', error));
        return false;
      }

      // RLS bloqueia o delete sem retornar erro: nenhuma linha é apagada
      if (!data || data.length === 0) {
        setNotice(notAllowedMessage('excluir', 'jogos'));
        return false;
      }
    }

    setGames(prev => prev.filter(g => g.id !== id));
    return true;
  };

  const openEditAthlete = () => {
    if (!selectedAthlete || !isAdmin) {
      return;
    }

    setIsViewingAthleteProfile(false);
    setIsEditingAthlete(true);
  };

  const openAddAthlete = (list: 'agenciados' | 'negociados') => {
    if (!isAdmin) {
      return;
    }

    setSelectedAthlete(null);
    setAddingListType(list);
    setIsAddingAthlete(true);
  };

  const handleAthleteImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAthlete) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      setSelectedAthlete(prev => prev ? { ...prev, image: imageUrl } : null);
    };
    reader.readAsDataURL(file);
  };

  const closeAthleteModal = () => {
    setIsViewingAthleteProfile(false);
    setIsEditingAthlete(false);
    setIsAddingAthlete(false);
    setProfileDetailView(null);
  };

  const openAthleteProfile = (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setIsViewingAthleteProfile(true);
    setIsEditingAthlete(false);
    setIsAddingAthlete(false);
    setProfileDetailView(null);
  };

  const renderView = () => {
    switch (view) {
      case 'login': return <LoginView onLogin={() => setView('dashboard')} onForgot={() => setView('recovery')} />;
      case 'recovery': return <RecoveryView onSend={handlePasswordResetRequest} onBack={() => setView('login')} />;
      case 'verification': return <VerificationView onBack={() => setView('login')} />;
      case 'dashboard': return <DashboardView athletes={athletes} games={games} scoutEntries={scoutEntries} onNavigate={navigateTo} onOpenAthleteProfile={openAthleteProfile} activities={activities} showNotifications={showNotifications} readIds={readIds} clearedIds={clearedIds} onMarkRead={ids => saveNotificationState(ids, 'read_at')} onClearNotifications={ids => saveNotificationState(ids, 'cleared_at')} />;
      case 'atletas-totais': return <AtletasTotaisView athletes={athletes} onSelectAthlete={openAthleteProfile} onAddAthlete={isAdmin ? openAddAthlete : undefined} />;
      case 'settings': return <SettingsView onLogout={confirmLogout} />;
      case 'security': return <SecurityView onComplete={handlePasswordUpdate} />;
      case 'success': return <SuccessView onBack={() => setView('login')} />;
      case 'calendar': return (
        <CalendarView
          games={games}
          athletes={athletes}
          onSelectAthlete={openAthleteProfile}
          onSaveGame={isAdmin ? handleSaveGame : undefined}
          onDeleteGame={isAdmin ? handleDeleteGame : undefined}
          clubLogoOf={resolveClubLogo}
        />
      );
      // Só admin lança scout; os demais caem no painel (default)
      case 'lancar-scout': if (isAdmin) return <ScoutEntryView entries={scoutEntries} athletes={athletes} games={games} onSave={handleSaveScoutEntries} onDelete={handleDeleteScoutEntry} />;
      // Só admin cadastra clubes; os demais caem no painel (default)
      case 'clubes': if (isAdmin) return <ClubsView clubs={allClubs} onSave={handleSaveClubs} onDelete={handleDeleteClub} />;
      default: return <DashboardView athletes={athletes} games={games} scoutEntries={scoutEntries} />;
    }
  };

  const showShell = !['login', 'recovery', 'verification', 'security', 'success'].includes(view);
  const selectedTwin = selectedAthlete ? twinOf(selectedAthlete) : null;

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {showShell && <SideNavBar activeView={view} setView={(next) => { setShowNotifications(false); navigateTo(next); }}isAdmin={isAdmin} onLogout={confirmLogout} onToggleNotifications={toggleNotifications} notificationsOpen={view === 'dashboard' && showNotifications} unreadNotifications={unreadNotifications} />}

      <main className={`relative ${showShell ? 'pl-16 lg:pl-80' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }}>
            <Suspense fallback={<LoadingPanel />}>{renderView()}</Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {(selectedAthlete && isViewingAthleteProfile) ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/65 px-2 py-4 backdrop-blur-sm sm:px-4 sm:py-8">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#17191c] shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="relative px-4 pb-6 pt-5 sm:px-10 sm:pb-8 sm:pt-10">
              {/* Em tela estreita os botões sobem para cima da foto e do nome; a partir de `md` ficam à direita */}
              <div className="flex flex-col-reverse gap-5 md:flex-row md:items-center md:justify-between md:gap-4">
                <div className="flex min-w-0 items-center gap-4 md:flex-1 md:justify-center md:gap-6">
                  <button
                    type="button"
                    onClick={() => athleteImageInputRef.current?.click()}
                    className="group relative h-20 w-20 md:h-36 md:w-36 shrink-0 overflow-hidden rounded-full bg-surface-high shadow-[0_16px_40px_rgba(0,0,0,0.55)] ring-2 ring-primary/70 ring-offset-4 ring-offset-[#17191c] transition hover:scale-[1.02]"
                    aria-label="Trocar foto do atleta"
                  >
                    <img src={selectedAthlete.image} alt={selectedAthlete.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white md:text-[11px]">Editar</span>
                    </div>
                  </button>

                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-2xl font-black uppercase italic leading-none text-white md:truncate md:text-[2rem]">
                      {selectedAthlete.name} {selectedAthlete.lastName}
                    </h2>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] md:text-[11px] md:[&>span]:px-4 md:[&>span]:py-2">
                      <span className="rounded-full bg-primary px-3 py-1.5 text-background">{selectedAthlete.position}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-on-surface">{selectedAthlete.category}</span>
                      <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-on-surface">
                        {/* Emprestado: mostra o clube onde o atleta está, com o escudo dele */}
                        {(activeLoanClub(selectedAthlete) ? selectedAthlete.loanClubLogo : selectedAthlete.clubLogo) && (
                          <img src={activeLoanClub(selectedAthlete) ? selectedAthlete.loanClubLogo : selectedAthlete.clubLogo} alt="" className="h-3.5 w-3.5 object-contain md:h-[18px] md:w-[18px]" />
                        )}
                        {activeLoanClub(selectedAthlete) || selectedAthlete.club}
                      </span>
                    </div>
                    <p className="mt-3 text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant md:mt-4 md:text-[11px]">
                      Contrato: <span className="text-primary">{selectedAthlete.contractLevel || '—'}</span>
                    </p>
                    {/* Atleta nas duas listas: troca entre o cadastro de Agenciados e o de Negociados sem sair do perfil */}
                    {selectedTwin && (
                      <div className="mt-3 inline-flex rounded-full border border-white/10 bg-black/30 p-1 text-[9px] font-black uppercase tracking-[0.18em] md:text-[11px]">
                        {(['agenciados', 'negociados'] as const).map(list => {
                          const active = (selectedAthlete.listType || 'agenciados') === list;
                          return (
                            <button
                              key={list}
                              type="button"
                              onClick={() => { if (!active) setSelectedAthlete(selectedTwin); }}
                              aria-pressed={active}
                              className={`rounded-full px-3 py-1.5 transition md:px-4 md:py-2 ${active ? 'bg-primary text-background' : 'text-on-surface-variant hover:text-white'}`}
                            >
                              {list === 'agenciados' ? 'Agenciado' : 'Negociado'}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className={`flex shrink-0 gap-3 md:flex-col md:items-stretch md:self-center ${isAdmin ? 'flex-col items-stretch' : 'flex-row-reverse items-center'}`}>
                  <div className="flex items-center justify-end gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={openEditAthlete}
                        className="flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 text-[9px] md:h-12 md:px-6 md:text-[11px] font-black uppercase tracking-[0.2em] text-background shadow-[0_8px_24px_rgba(255,255,255,0.14)] transition hover:scale-[1.03] hover:shadow-[0_10px_30px_rgba(255,255,255,0.22)]"
                      >
                        <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        Editar perfil
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={closeAthleteModal}
                      className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full border border-error/40 bg-error/15 text-error shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:scale-[1.05] hover:bg-error hover:text-white hover:shadow-[0_8px_24px_rgba(239,68,68,0.35)]"
                      aria-label="Fechar"
                      title="Fechar"
                    >
                      <X className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-1.5 md:flex-none md:gap-2 md:p-2 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur">
                    {[{ key: 'calendar', icon: CalendarDays, label: 'Calendário' }, { key: 'stats', icon: BarChart3, label: 'Scout' }, { key: 'tactical', icon: Presentation, label: 'Acompanhamento Tático' }, { key: 'contract', icon: ScrollText, label: 'Contrato' }, { key: 'pdf', icon: FileText, label: 'PDF' }].map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        type="button"
                        // Clicar de novo no ícone aberto volta para as informações do perfil
                        onClick={() => setProfileDetailView(prev => (prev === key ? null : key as 'calendar' | 'stats' | 'tactical' | 'contract' | 'pdf'))}
                        className={`flex h-9 flex-1 md:h-11 md:w-11 md:flex-none items-center justify-center rounded-xl border transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-background hover:shadow-[0_8px_20px_rgba(255,255,255,0.2)] ${profileDetailView === key ? 'border-primary bg-primary text-background' : 'border-white/5 bg-white/[0.04] text-white/75'}`}
                        aria-label={label}
                        title={label}
                      >
                        <Icon className="h-4 w-4 md:h-5 md:w-5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <input
                ref={athleteImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleAthleteImageChange}
                className="hidden"
              />
              {/* Com um dos cinco ícones aberto, o botão leva de volta às informações do atleta */}
              {profileDetailView && (
                <button
                  type="button"
                  onClick={() => setProfileDetailView(null)}
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-[9px] font-black uppercase tracking-[0.2em] text-white transition hover:border-primary hover:bg-primary hover:text-background"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar para as informações
                </button>
              )}
              <Suspense fallback={<LoadingPanel />}>
              {profileDetailView === 'calendar' ? (
                <AthleteGames athlete={selectedAthlete} games={games} />
              ) : profileDetailView === 'stats' ? (
                <AthleteScout entries={scoutEntriesOf(selectedAthlete)} />
              ) : profileDetailView === 'tactical' ? (
                <AthleteTactical
                  athlete={selectedAthlete}
                  isAdmin={isAdmin}
                  onSaveMeetings={(meetings) => handleSaveTacticalMeetings(selectedAthlete, meetings)}
                />
              ) : profileDetailView === 'contract' ? (
                <AthleteContract
                  athlete={selectedAthlete}
                  entries={scoutEntriesOf(selectedAthlete)}
                  isAdmin={isAdmin}
                  onSaveGoals={(goals) => handleSaveContractGoals(selectedAthlete, goals)}
                  onOpenContract={() => openContractFile(selectedAthlete)}
                  onDownloadContract={() => downloadContractFile(selectedAthlete)}
                />
              ) : profileDetailView === 'pdf' ? (
                <AthletePdf athlete={selectedAthlete} entries={scoutEntriesOf(selectedAthlete)} games={games} />
              ) : (
                <AthleteInfo athlete={selectedAthlete} onOpenContract={() => openContractFile(selectedAthlete)} clubLogoOf={resolveClubLogo} />
              )}
              </Suspense>
            </div>
          </div>
        </div>
      ) : null}

      {isAdmin && ((selectedAthlete && isEditingAthlete) || isAddingAthlete) ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/65 px-2 py-4 backdrop-blur-sm sm:px-4 sm:py-8">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-[#17191c] shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
            <button
              type="button"
              onClick={closeAthleteModal}
              className="absolute right-3 top-3 z-30 flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-error/40 bg-error/15 text-error shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-error hover:text-white active:bg-error active:text-white"
              aria-label="Fechar"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white/10 via-white/[0.03] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <Suspense fallback={<LoadingPanel />}>
              <EditProfileView
                athlete={selectedAthlete || undefined} 
                onSave={handleSaveAthlete} 
                onDelete={isAdmin ? handleDeleteAthlete : undefined}
                onBack={closeAthleteModal}
                // Na edição, volta ao perfil do atleta sem salvar (o "X" e o "Cancelar" fecham tudo)
                onBackToProfile={selectedAthlete && isEditingAthlete ? () => { setIsEditingAthlete(false); setIsViewingAthleteProfile(true); } : undefined} 
                athletes={athletes}
                clubs={allClubs}
                listType={selectedAthlete?.listType ?? addingListType}
              />
            </Suspense>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {logoutConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLogoutConfirmOpen(false)}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-6 backdrop-blur-md"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-confirm-title"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-surface-low shadow-[0_30px_80px_rgba(0,0,0,0.8)]"
            >
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
              <div className="px-8 pb-8 pt-9 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                  <LogOut className="h-7 w-7 text-primary" />
                </div>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant">Encerrar sessão</p>
                <h3 id="logout-confirm-title" className="mt-2 text-2xl font-black uppercase italic leading-tight tracking-tight text-white">
                  Deseja encerrar a sua sessão?
                </h3>
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setLogoutConfirmOpen(false)}
                    className="flex-1 rounded-2xl border border-white/10 bg-surface-high py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition hover:border-white/20"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setLogoutConfirmOpen(false);
                      await handleLogout();
                    }}
                    className="flex-1 rounded-2xl bg-primary py-4 text-[11px] font-black uppercase tracking-[0.2em] text-background shadow-xl transition hover:scale-[1.02]"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contractViewer && (
          <motion.div
            key="contract-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setContractViewer(null)}
            className="fixed inset-0 z-[85] flex items-center justify-center bg-black/75 p-2 backdrop-blur-md sm:p-6"
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#17191c] shadow-[0_30px_80px_rgba(0,0,0,0.8)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant">Contrato</p>
                  <p className="truncate text-sm font-bold text-white">{contractViewer.name}</p>
                </div>
                <a
                  href={contractViewer.downloadUrl}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-[9px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.03]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar
                </a>
                <button
                  type="button"
                  onClick={() => setContractViewer(null)}
                  className="flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full border border-error/40 bg-error/15 text-error transition hover:bg-error hover:text-white"
                  aria-label="Fechar"
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/\.(png|jpe?g|webp)$/i.test(contractViewer.name) ? (
                <div className="flex-1 overflow-auto bg-black/40 p-3">
                  <img src={contractViewer.url} alt={contractViewer.name} className="mx-auto max-w-full" />
                </div>
              ) : (
                <iframe src={contractViewer.url} title={contractViewer.name} className="w-full flex-1 bg-white" />
              )}
            </div>
          </motion.div>
        )}
        {notice && (
          <motion.div
            key="notice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setNotice(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6 backdrop-blur-md"
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="notice-title"
              aria-describedby="notice-message"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.key === 'Escape' && setNotice(null)}
              className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-surface-low shadow-[0_30px_80px_rgba(0,0,0,0.8)]"
            >
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
              <div className="px-8 pb-8 pt-9 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                  <AlertTriangle className="h-7 w-7 text-primary" />
                </div>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant">Atenção</p>
                <h3 id="notice-title" className="mt-2 text-2xl font-black uppercase italic leading-tight tracking-tight text-white">
                  {notice.title}
                </h3>
                <p id="notice-message" className="mt-4 break-words text-sm leading-relaxed text-on-surface-variant">
                  {notice.message}
                </p>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setNotice(null)}
                  className="mt-8 w-full rounded-2xl bg-primary py-4 text-[11px] font-black uppercase tracking-[0.2em] text-background shadow-xl transition hover:scale-[1.02]"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
