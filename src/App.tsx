import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, FileText, CalendarDays, BriefcaseBusiness, UserRound, BadgeCheck, Newspaper, Trophy, LogOut, AlertTriangle, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Imports from Libs & Types
import { supabase, hasSupabaseConfig } from './lib/supabase';
import { MOCK_ATHLETES } from './data';
import { Athlete, View } from './types';

// Imports from Components
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { AthleteInfo } from './components/AthleteInfo';

// Imports from Views
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { ScoutView } from './views/ScoutView';
import { NegociadosView } from './views/NegociadosView';
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

const AUTH_SESSION_KEY = 'fieldpro_authenticated_v1';
const RLS_VIOLATION_CODE = '42501';
const MISSING_COLUMN_CODE = 'PGRST204';

type Notice = { title: string; message: string };

const notAllowedMessage = (action: string): Notice => ({
  title: 'Ação não permitida',
  message: `Seu usuário não tem permissão para ${action} atletas. Nenhuma alteração foi salva.`,
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

const mapAthleteRow = (a: any): Athlete => ({
  ...a,
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
});

export default function App() {
  const [view, setView] = useState<View>('login');
  const [athletes, setAthletes] = useState<Athlete[]>(MOCK_ATHLETES);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [isAddingAthlete, setIsAddingAthlete] = useState(false);
  const [isViewingAthleteProfile, setIsViewingAthleteProfile] = useState(false);
  const [isEditingAthlete, setIsEditingAthlete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const isAdmin = session?.user?.app_metadata?.role === 'admin';
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [profileDetailView, setProfileDetailView] = useState<'documents' | 'calendar' | 'business' | 'profile' | 'status' | null>(null);
  const athleteImageInputRef = useRef<HTMLInputElement | null>(null);
  const clubLogoInputRef = useRef<HTMLInputElement | null>(null);

  const clearAppAuth = () => {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    setSession(null);
    setSelectedAthlete(null);
    setIsAddingAthlete(false);
    setActivities([]);
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

      if (session && hasExplicitLogin()) {
        setView('dashboard');
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

    fetchAthletes();
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

    if (!hasSupabaseConfig || !supabase) {
      const nextAthlete: Athlete = {
        id: `local-${Date.now()}`,
        name: athleteData.name || 'Novo',
        lastName: athleteData.lastName || 'Atleta',
        position: athleteData.position || 'Meia',
        secondaryPosition: athleteData.secondaryPosition,
        category: athleteData.category || 'Sub-20',
        club: athleteData.club || 'Livre no Mercado',
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
        stats: athleteData.stats || { tactical: 70, physical: 70, technical: 70 },
      };

      setAthletes(prev => {
        const existing = selectedAthlete ? prev.filter(item => item.id !== selectedAthlete.id) : prev;
        return [nextAthlete, ...existing];
      });
      setSelectedAthlete(null);
      setIsAddingAthlete(false);
      setView('athletes');
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
      club: athleteData.club || 'Livre no Mercado',
      club_logo: athleteData.clubLogo,
      status: (athleteData.club && athleteData.club !== 'Livre no Mercado' && athleteData.club !== 'None') ? 'In Club' : 'Livre no Mercado',
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
          title: 'NOVO ATLETA AGENCIADO',
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
      setView('athletes');
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
      setView('athletes');
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
    setView('athletes');

    if (isUuid) {
      const { data } = await supabase.from('athletes').select('*');
      if (data) {
        setAthletes(data.map(mapAthleteRow));
      }
    }
    
    setLoading(false);
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
      case 'dashboard': return <DashboardView athletes={athletes} onAthletesClick={() => setView('athletes')} onNavigate={(view) => setView(view)} onOpenAthleteProfile={openAthleteProfile} activities={activities} />;
      case 'athletes': return <AthletesListView athletes={athletes} onSelectAthlete={openAthleteProfile} onAddAthlete={isAdmin ? openAddAthlete : undefined} />;
      case 'scout': return <ScoutView athletes={athletes} onSelectAthlete={openAthleteProfile} />;
      case 'negociados': return <NegociadosView athletes={athletes} onSelectAthlete={openAthleteProfile} />;
      case 'agenciados-negociados': return <AgenciadosNegociadosView athletes={athletes} onSelectAthlete={openAthleteProfile} />;
      case 'atletas-totais': return <AtletasTotaisView athletes={athletes} onSelectAthlete={openAthleteProfile} />;
      case 'sessions': return <SessionsView athletes={athletes} onSelectAthlete={openAthleteProfile} />;
      case 'settings': return <SettingsView onLogout={confirmLogout} />;
      case 'security': return <SecurityView onComplete={handlePasswordUpdate} />;
      case 'success': return <SuccessView onBack={() => setView('login')} />;
      case 'calendar': return <CalendarView />;
      default: return <DashboardView athletes={athletes} />;
    }
  };

  const showShell = !['login', 'recovery', 'verification', 'security', 'success'].includes(view);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {showShell && (
        <TopAppBar 
          title="" 
          onBack={view === 'security' ? () => setView('settings') : undefined} 
          onLogoClick={view !== 'dashboard' ? () => setView('dashboard') : undefined}
          onLogout={confirmLogout}
        />
      )}
      
      <main className="relative">
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }}>
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {showShell && <BottomNavBar activeView={view} setView={setView} athleteCount={athletes.length} />}
      
      {(selectedAthlete && isViewingAthleteProfile) ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/65 px-4 py-8 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-[#17191c] shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="relative px-6 pb-8 pt-10 sm:px-10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center justify-center gap-5">
                  <button
                    type="button"
                    onClick={() => athleteImageInputRef.current?.click()}
                    className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-surface-high shadow-[0_16px_40px_rgba(0,0,0,0.55)] ring-2 ring-primary/70 ring-offset-4 ring-offset-[#17191c] transition hover:scale-[1.02]"
                    aria-label="Trocar foto do atleta"
                  >
                    <img src={selectedAthlete.image} alt={selectedAthlete.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Editar</span>
                    </div>
                  </button>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-3xl font-black uppercase italic leading-none text-white">
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

                <div className="flex shrink-0 flex-col items-stretch gap-3 self-center">
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
                  <div className="flex items-center justify-between gap-1.5 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur">
                    {[{ key: 'documents', icon: FileText, label: 'Documentos' }, { key: 'calendar', icon: CalendarDays, label: 'Agenda' }, { key: 'business', icon: BriefcaseBusiness, label: 'Negócios' }, { key: 'profile', icon: UserRound, label: 'Perfil' }, { key: 'status', icon: BadgeCheck, label: 'Status' }].map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setProfileDetailView(key as 'documents' | 'calendar' | 'business' | 'profile' | 'status')}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-white/75 transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-background hover:shadow-[0_8px_20px_rgba(255,255,255,0.2)]"
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
              <AthleteInfo athlete={selectedAthlete} />
            </div>
          </div>
        </div>
      ) : null}

      {isAdmin && ((selectedAthlete && isEditingAthlete) || isAddingAthlete) ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/65 px-4 py-8 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-[#17191c] shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
            <button
              type="button"
              onClick={closeAthleteModal}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-surface-high text-base font-black text-white transition hover:border-primary/40 hover:bg-primary/10"
              aria-label="Fechar"
            >
              ×
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
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-accent to-transparent" />
              <div className="px-8 pb-8 pt-9 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10">
                  <LogOut className="h-7 w-7 text-accent" />
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
                    className="flex-1 rounded-2xl bg-accent py-4 text-[11px] font-black uppercase tracking-[0.2em] text-background shadow-xl transition hover:scale-[1.02]"
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

      {view === 'dashboard' && (
        <button onClick={() => setView('security')} className="fixed bottom-24 right-6 p-4 bg-surface-high border border-white/10 rounded-2xl shadow-2xl z-40">
          <ShieldCheck className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
