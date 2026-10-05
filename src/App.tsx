import React, { useState, useEffect, useRef } from 'react';
import { FileText, CalendarDays, BarChart3, Presentation, ScrollText, Newspaper, Trophy, LogOut, AlertTriangle, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Imports from Libs & Types
import { supabase, hasSupabaseConfig } from './lib/supabase';
import { MOCK_ATHLETES } from './data';
import { Athlete, Game, View } from './types';

// Imports from Components
import { SideNavBar } from './components/SideNavBar';
import { AthleteInfo } from './components/AthleteInfo';
import { AthleteGames } from './components/AthleteGames';
import { AthleteScout } from './components/AthleteScout';

// Imports from Views
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { ScoutView } from './views/ScoutView';
import { AgenciadosNegociadosView } from './views/AgenciadosNegociadosView';
import { AtletasTotaisView } from './views/AtletasTotaisView';
import { AthletesListView } from './views/AthletesListView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { EditProfileView } from './views/EditProfileView';
import { RecoveryView, VerificationView } from './views/AuthSubViews';
import { SecurityView, SuccessView } from './views/SecuritySubViews';
import { SessionsView } from './views/SessionsView';
import { CalendarView } from './views/CalendarView';
import { ScoutEntryView } from './views/ScoutEntryView';

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
  athleteIds: g.athlete_ids || [],
  athleteMinutes: g.athlete_minutes || {},
  athleteScouts: g.athlete_scouts || {},
});

// Traduz o erro do Supabase para um aviso legível na interface
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
  source: a.source || 'Captado',
  listType: a.list_type || 'agenciados',
});

export default function App() {
  const [view, setView] = useState<View>('login');
  const [athletes, setAthletes] = useState<Athlete[]>(MOCK_ATHLETES);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [isAddingAthlete, setIsAddingAthlete] = useState(false);
  // Lista da aba em que o "+" foi clicado, guardada na abertura do cadastro
  const [addingListType, setAddingListType] = useState<'agenciados' | 'negociados'>('agenciados');
  const [isViewingAthleteProfile, setIsViewingAthleteProfile] = useState(false);
  const [isEditingAthlete, setIsEditingAthlete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const isAdmin = session?.user?.app_metadata?.role === 'admin';
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // O sino do menu lateral abre e fecha a central de notificações do painel; o painel informa quantas não foram lidas
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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

    const fetchAthletes = async () => {
      const { data, error } = await supabase.from('athletes').select('*');
      if (data && !error) {
        setAthletes(data.map(mapAthleteRow));
      }
      fetchActivities();
    };

    const fetchGames = async () => {
      const { data, error } = await supabase.from('games').select('*');
      if (error) {
        console.error('Erro ao carregar jogos:', error);
      } else if (data) {
        setGames(data.map(mapGameRow));
      }
    };

    fetchAthletes();
    fetchGames();
  }, [session]);

  const recordActivity = async (activity: any) => {
    try {
      const { error } = await supabase
        .from('recent_activities')
        .insert([activity]);
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

  // Depois de salvar ou apagar, quem está em Atletas Negociados continua nessa aba
  const returnToList = () => setView(prev => (prev === 'negociados' ? prev : 'athletes'));

  const handleSaveAthlete = async (athleteData: Partial<Athlete>) => {
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
      notes: athleteData.notes,
      has_dvd: athleteData.hasDvd,
      dvd_link: athleteData.dvdLink,
      source: athleteData.source || 'Captado',
      list_type: listType,
      stats: athleteData.stats || { tactical: 70, physical: 70, technical: 70 }
    };

    let error: any = null;
    
    const isEditingRealAthlete = selectedAthlete && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedAthlete.id);

    if (isEditingRealAthlete) {
      console.log('Atualizando atleta real com ID:', selectedAthlete.id);
      const { data: updatedData, error: updateError } = await supabase
        .from('athletes')
        .update(payload)
        .eq('id', selectedAthlete.id)
        .select();
      error = updateError;

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
          club_logo: payload.club_logo,
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
          club_logo: payload.club_logo,
          athlete_id: insertedData[0].id
        });
      }
    }

    if (error) {
      console.error('Erro ao salvar atleta:', error);
      if (error.code === RLS_VIOLATION_CODE) {
        setNotice(notAllowedMessage(isEditingRealAthlete ? 'editar' : 'cadastrar'));
      } else {
        setNotice(errorNotice('Erro ao salvar atleta', error));
      }
    } else {
      console.log('Atleta salvo com sucesso!');
      setSelectedAthlete(null);
      setIsAddingAthlete(false);
      
      const { data, error: fetchError } = await supabase.from('athletes').select('*');
      if (fetchError) {
        console.error('Erro ao atualizar lista local:', fetchError);
      } else if (data) {
        setAthletes(data.map(mapAthleteRow));
      }
      returnToList();
    }
    
    setLoading(false);
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
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
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

    const payload = {
      ...(sendMinutes ? { athlete_minutes: gameData.athleteMinutes } : {}),
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
    return true;
  };

  // Grava o scout do jogo (aba "Scout"); substitui o scout inteiro daquele jogo
  const handleSaveScouts = async (gameId: string, scouts: Record<string, Record<string, number>>): Promise<boolean> => {
    if (!isAdmin) {
      setNotice(notAllowedMessage('lançar', 'scout'));
      return false;
    }

    if (!hasSupabaseConfig || !supabase || gameId.startsWith('local-')) {
      setGames(prev => prev.map(g => (g.id === gameId ? { ...g, athleteScouts: scouts } : g)));
      return true;
    }

    const { data, error } = await supabase.from('games').update({ athlete_scouts: scouts }).eq('id', gameId).select();

    if (error) {
      console.error('Erro ao salvar scout:', error);
      setNotice(error.code === MISSING_COLUMN_CODE
        ? {
            title: 'Scout não configurado',
            message: 'O banco de dados ainda não está preparado para o scout. Execute o arquivo supabase/games.sql no SQL Editor do Supabase e tente de novo.',
          }
        : gameErrorNotice('Erro ao salvar scout', error));
      return false;
    }

    // RLS bloqueia o update sem retornar erro: nenhuma linha é alterada
    if (!data || data.length === 0) {
      setNotice(notAllowedMessage('lançar', 'scout'));
      return false;
    }

    const savedGame = mapGameRow(data[0]);
    setGames(prev => prev.map(g => (g.id === savedGame.id ? savedGame : g)));
    return true;
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

  const openAddAthlete = () => {
    if (!isAdmin) {
      return;
    }

    setSelectedAthlete(null);
    setAddingListType(view === 'negociados' ? 'negociados' : 'agenciados');
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
      case 'dashboard': return <DashboardView athletes={athletes} games={games} onAthletesClick={() => setView('athletes')} onNavigate={(view) => setView(view)} onOpenAthleteProfile={openAthleteProfile} activities={activities} showNotifications={showNotifications} onUnreadChange={setUnreadNotifications} />;
      case 'athletes': return <AthletesListView athletes={athletes.filter(a => a.listType !== 'negociados')}onSelectAthlete={openAthleteProfile} onAddAthlete={isAdmin ? openAddAthlete : undefined} />;
      case 'scout': return <ScoutView athletes={athletes} onSelectAthlete={openAthleteProfile} />;
      case 'negociados': return (
        <AthletesListView
          athletes={athletes.filter(a => a.listType === 'negociados')}
          onSelectAthlete={openAthleteProfile}
          onAddAthlete={isAdmin ? openAddAthlete : undefined}
          title="Atletas Negociados"
        />
      );
      case 'agenciados-negociados': return <AgenciadosNegociadosView athletes={athletes} onSelectAthlete={openAthleteProfile} />;
      case 'atletas-totais': return <AtletasTotaisView athletes={athletes} onSelectAthlete={openAthleteProfile} />;
      case 'sessions': return <SessionsView athletes={athletes} onSelectAthlete={openAthleteProfile} />;
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
        />
      );
      // Só admin lança scout; os demais caem no painel (default)
      case 'lancar-scout': if (isAdmin) return <ScoutEntryView games={games} athletes={athletes} onSaveScouts={handleSaveScouts} />;
      default: return <DashboardView athletes={athletes} games={games} />;
    }
  };

  const showShell = !['login', 'recovery', 'verification', 'security', 'success'].includes(view);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {showShell && <SideNavBar activeView={view} setView={(next) => { setShowNotifications(false); setView(next); }}isAdmin={isAdmin} onLogout={confirmLogout} onToggleNotifications={toggleNotifications} notificationsOpen={view === 'dashboard' && showNotifications} unreadNotifications={unreadNotifications} />}

      <main className={`relative ${showShell ? 'pl-16 lg:pl-80' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }}>
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {(selectedAthlete && isViewingAthleteProfile) ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/65 px-2 py-4 backdrop-blur-sm sm:px-4 sm:py-8">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-[#17191c] shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="relative px-4 pb-6 pt-5 sm:px-10 sm:pb-8 sm:pt-10">
              {/* Em tela estreita os botões sobem para cima da foto e do nome; a partir de `md` ficam à direita */}
              <div className="flex flex-col-reverse gap-5 md:flex-row md:items-center md:justify-between md:gap-4">
                <div className="flex min-w-0 items-center gap-4 md:flex-1 md:justify-center md:gap-5">
                  <button
                    type="button"
                    onClick={() => athleteImageInputRef.current?.click()}
                    className="group relative h-20 w-20 md:h-28 md:w-28 shrink-0 overflow-hidden rounded-full bg-surface-high shadow-[0_16px_40px_rgba(0,0,0,0.55)] ring-2 ring-primary/70 ring-offset-4 ring-offset-[#17191c] transition hover:scale-[1.02]"
                    aria-label="Trocar foto do atleta"
                  >
                    <img src={selectedAthlete.image} alt={selectedAthlete.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Editar</span>
                    </div>
                  </button>

                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-2xl font-black uppercase italic leading-none text-white md:truncate md:text-3xl">
                      {selectedAthlete.name} {selectedAthlete.lastName}
                    </h2>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em]">
                      <span className="rounded-full bg-primary px-3 py-1.5 text-background">{selectedAthlete.position}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-on-surface">{selectedAthlete.category}</span>
                      <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-on-surface">
                        {selectedAthlete.clubLogo && (
                          <img src={selectedAthlete.clubLogo} alt="" className="h-3.5 w-3.5 object-contain" />
                        )}
                        {selectedAthlete.club}
                      </span>
                    </div>
                    <p className="mt-3 text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant">
                      Contrato: <span className="text-primary">{selectedAthlete.contractLevel || '—'}</span>
                    </p>
                  </div>
                </div>

                <div className={`flex shrink-0 gap-3 md:flex-col md:items-stretch md:self-center ${isAdmin ? 'flex-col items-stretch' : 'flex-row-reverse items-center'}`}>
                  <div className="flex items-center justify-end gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={openEditAthlete}
                        className="flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 text-[9px] font-black uppercase tracking-[0.2em] text-background shadow-[0_8px_24px_rgba(255,255,255,0.14)] transition hover:scale-[1.03] hover:shadow-[0_10px_30px_rgba(255,255,255,0.22)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar perfil
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={closeAthleteModal}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-error/40 bg-error/15 text-error shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:scale-[1.05] hover:bg-error hover:text-white hover:shadow-[0_8px_24px_rgba(239,68,68,0.35)]"
                      aria-label="Fechar"
                      title="Fechar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-1.5 md:flex-none rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur">
                    {[{ key: 'calendar', icon: CalendarDays, label: 'Calendário' }, { key: 'stats', icon: BarChart3, label: 'Scout' }, { key: 'tactical', icon: Presentation, label: 'Acompanhamento Tático' }, { key: 'contract', icon: ScrollText, label: 'Contrato' }, { key: 'pdf', icon: FileText, label: 'PDF' }].map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        type="button"
                        // Clicar de novo no ícone aberto (Calendário ou Scout) volta para as informações do perfil
                        onClick={() => setProfileDetailView(prev => ((key === 'calendar' || key === 'stats') && prev === key ? null : key as 'calendar' | 'stats' | 'tactical' | 'contract' | 'pdf'))}
                        className={`flex h-9 flex-1 md:w-9 md:flex-none items-center justify-center rounded-xl border transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-background hover:shadow-[0_8px_20px_rgba(255,255,255,0.2)] ${(key === 'calendar' || key === 'stats') && profileDetailView === key ? 'border-primary bg-primary text-background' : 'border-white/5 bg-white/[0.04] text-white/75'}`}
                        aria-label={label}
                        title={label}
                      >
                        <Icon className="h-4 w-4" />
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
              {profileDetailView === 'calendar' ? (
                <AthleteGames athlete={selectedAthlete} games={games} />
              ) : profileDetailView === 'stats' ? (
                <AthleteScout athlete={selectedAthlete} games={games} />
              ) : (
                <AthleteInfo athlete={selectedAthlete} />
              )}
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
            <div>
              <EditProfileView 
                athlete={selectedAthlete || undefined} 
                onSave={handleSaveAthlete} 
                onDelete={isAdmin ? handleDeleteAthlete : undefined}
                onBack={closeAthleteModal} 
                athletes={athletes} 
              />
            </div>
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
        {notice && (
          <motion.div
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
