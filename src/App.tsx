import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Imports from Libs & Types
import { supabase } from './lib/supabase';
import { MOCK_ATHLETES } from './data';
import { Athlete, View } from './types';

// Imports from Components
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';

// Imports from Views
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { ScoutView } from './views/ScoutView';
import { CaptacaoView } from './views/CaptacaoView';
import { AthletesListView } from './views/AthletesListView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { EditProfileView } from './views/EditProfileView';
import { RecoveryView, VerificationView } from './views/AuthSubViews';
import { SecurityView, SuccessView } from './views/SecuritySubViews';
import { SessionsView } from './views/SessionsView';

export default function App() {
  const [view, setView] = useState<View>('login');
  const [athletes, setAthletes] = useState<Athlete[]>(MOCK_ATHLETES);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [isAddingAthlete, setIsAddingAthlete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setView('dashboard');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setView('dashboard');
      } else {
        setView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
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
        setAthletes(data.map((a: any) => ({
          ...a,
          lastName: a.last_name,
          clubLogo: a.club_logo,
          birthDate: a.birth_date,
          preferredFoot: a.preferred_foot,
          hasDvd: a.has_dvd,
          dvdLink: a.dvd_link,
          source: a.source || 'Captado',
        })));
      }
      if (session) fetchActivities();
    };

    if (session) fetchAthletes();
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
      birth_date: athleteData.birthDate,
      age: athleteData.age,
      preferred_foot: athleteData.preferredFoot,
      notes: athleteData.notes,
      has_dvd: athleteData.hasDvd,
      dvd_link: athleteData.dvdLink,
      source: athleteData.source || 'Captado',
      stats: athleteData.stats || { tactical: 70, physical: 70, technical: 70 }
    };

    let error: any = null;
    
    // Check if we are updating an existing athlete with a valid UUID
    const isEditingRealAthlete = selectedAthlete && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedAthlete.id);

    if (isEditingRealAthlete) {
      console.log('Atualizando atleta real com ID:', selectedAthlete.id);
      const { error: updateError } = await supabase
        .from('athletes')
        .update(payload)
        .eq('id', selectedAthlete.id);
      error = updateError;

      if (!error) {
        // Record activity for update
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
        // Record activity for addition
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
      alert(`Erro ao salvar atleta: ${error.message}`);
    } else {
      console.log('Atleta salvo com sucesso!');
      setSelectedAthlete(null);
      setIsAddingAthlete(false);
      
      const { data, error: fetchError } = await supabase.from('athletes').select('*');
      if (fetchError) {
        console.error('Erro ao atualizar lista local:', fetchError);
      } else if (data) {
        setAthletes(data.map((a: any) => ({
          ...a,
          lastName: a.last_name,
          clubLogo: a.club_logo,
          birthDate: a.birth_date,
          preferredFoot: a.preferred_foot,
          hasDvd: a.has_dvd,
          dvdLink: a.dvd_link,
          source: a.source,
        })));
      }
      setView('athletes');
    }
    
    setLoading(false);
  };

  const handleDeleteAthlete = async (id: string) => {
    setLoading(true);
    console.log('Apagando atleta com ID:', id);
    
    // Check if ID is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (isUuid) {
      const { error } = await supabase.from('athletes').delete().eq('id', id);
      
      if (error) {
        console.error('Erro ao apagar atleta do banco:', error);
        alert(`Erro ao apagar atleta: ${error.message}`);
        setLoading(false);
        return;
      }
      console.log('Atleta apagado do banco com sucesso');
    } else {
      console.log('ID não é UUID, removendo apenas localmente');
    }
    
    // Always update local state for immediate feedback
    setAthletes(prev => prev.filter(a => a.id !== id));
    setSelectedAthlete(null);
    setIsAddingAthlete(false);
    setView('athletes');

    // Optionally re-fetch from DB if it was a UUID to ensure sync
    // Optionally re-fetch from DB if it was a UUID to ensure sync
    if (isUuid) {
      const { data } = await supabase.from('athletes').select('*');
      if (data) {
        setAthletes(data.map((a: any) => ({
          ...a,
          lastName: a.last_name,
          clubLogo: a.club_logo,
          birthDate: a.birth_date,
          preferredFoot: a.preferred_foot,
          hasDvd: a.has_dvd,
          dvdLink: a.dvd_link,
          source: a.source || 'Captado',
        })));
      }
    }
    
    setLoading(false);
  };

  const renderView = () => {
    switch (view) {
      case 'login': return <LoginView onLogin={() => setView('dashboard')} onForgot={() => setView('recovery')} />;
      case 'recovery': return <RecoveryView onSend={() => setView('verification')} onBack={() => setView('login')} />;
      case 'verification': return <VerificationView onBack={() => setView('login')} />;
      case 'dashboard': return <DashboardView athletes={athletes} onAthletesClick={() => setView('athletes')} activities={activities} />;
      case 'athletes': return <AthletesListView athletes={athletes} onSelectAthlete={(a) => { setSelectedAthlete(a); setView('settings'); }} onAddAthlete={() => { setSelectedAthlete(null); setIsAddingAthlete(true); }} />;
      case 'captacao': return <CaptacaoView athletes={athletes} onSelectAthlete={(a) => { setSelectedAthlete(a); setView('settings'); }} />;
      case 'scout': return <ScoutView athletes={athletes} />;
      case 'sessions': return <SessionsView athletes={athletes} />;
      case 'settings': return <SettingsView onLogout={() => supabase.auth.signOut()} />;
      case 'security': return <SecurityView onComplete={() => setView('success')} />;
      case 'success': return <SuccessView onBack={() => setView('athletes')} />;
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
      
      {(selectedAthlete && view === 'settings') || isAddingAthlete ? (
        <div className="fixed inset-0 z-[60] bg-background overflow-y-auto">
          <TopAppBar 
            title={isAddingAthlete ? "ADICIONAR ATLETA" : "EDITAR PERFIL"} 
            onBack={() => { setSelectedAthlete(null); setIsAddingAthlete(false); }} 
            onLogoClick={() => { setSelectedAthlete(null); setIsAddingAthlete(false); setView('dashboard'); }}
          />
          <EditProfileView 
            athlete={selectedAthlete || undefined} 
            onSave={handleSaveAthlete} 
            onDelete={handleDeleteAthlete}
            onBack={() => { setSelectedAthlete(null); setIsAddingAthlete(false); }} 
            athletes={athletes} 
          />
        </div>
      ) : null}

      {view === 'dashboard' && (
        <button onClick={() => setView('security')} className="fixed bottom-24 right-6 p-4 bg-surface-high border border-white/10 rounded-2xl shadow-2xl z-40">
          <ShieldCheck className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
