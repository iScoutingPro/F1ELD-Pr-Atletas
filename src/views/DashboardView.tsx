import React from 'react';
import { motion } from 'motion/react';
import { Users, TrendingUp, ShieldCheck, FileText, Trophy, Clock3, Star, CalendarDays, MapPin, ChevronRight, Bell, ArrowUpRight, CheckCheck } from 'lucide-react';
import { Athlete, View } from '../types';
import { Logo } from '../components/Logo';

interface DashboardViewProps {
  athletes: Athlete[];
  onAthletesClick?: () => void;
  onNavigate?: (view: View) => void;
  onOpenAthleteProfile?: (athlete: Athlete) => void;
  activities?: any[];
}

const getTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Agora';
  if (diffInMinutes < 60) return `Há ${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Há ${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `Há ${diffInDays}d`;
};

export const DashboardView = ({ athletes, onAthletesClick, onNavigate, onOpenAthleteProfile, activities = [] }: DashboardViewProps) => {
  const totalAthletes = athletes.length;
  const inClubCount = athletes.filter(a => a.status === 'In Club').length;
  const inClubPercentage = totalAthletes > 0 ? Math.round((inClubCount / totalAthletes) * 100) : 0;
  
  const indicadosCount = athletes.filter(a => a.source === 'Indicado').length;
  const freeCount = totalAthletes - inClubCount;

  const chartData = [
    { label: 'JAN', value: 62 },
    { label: 'FEV', value: 68 },
    { label: 'MAR', value: 75 },
    { label: 'ABR', value: 82 },
    { label: 'MAI', value: 88 },
    { label: 'JUN', value: 94 },
  ];

  const notifications = [
    {
      id: 'material-tatico-davi-pinn',
      type: 'material',
      title: 'Material Tático adicionado',
      athleteName: 'Davi Pinn',
      description: 'Novo material foi adicionado ao perfil do atleta.',
      time: 'há 5 min',
      accent: 'text-primary',
      isRead: false,
    },
    {
      id: 'dvd-ricardo-silva',
      type: 'dvd',
      title: 'DVD atualizado',
      athleteName: 'Ricardo Silva',
      description: 'Atualização de vídeo e análise técnica cadastrada.',
      time: 'há 18 min',
      accent: 'text-green-400',
      isRead: true,
    },
    {
      id: 'avaliacao-gabriel-santos',
      type: 'review',
      title: 'Avaliação finalizada',
      athleteName: 'Gabriel Santos',
      description: 'Relatório de desempenho foi concluído e enviado.',
      time: 'há 1h',
      accent: 'text-yellow-300',
      isRead: false,
    },
    {
      id: 'novo-contato-lucas-oliveira',
      type: 'contact',
      title: 'Novo contato registrado',
      athleteName: 'Lucas Oliveira',
      description: 'Representante entrou em contato e marcou revisão.',
      time: 'há 2h',
      accent: 'text-violet-300',
      isRead: true,
    },
  ];

  const [notificationsState, setNotificationsState] = React.useState(notifications);

  const handleMarkAllAsRead = () => {
    setNotificationsState((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
  };

  const handleOpenNotification = (athleteName: string, notificationId: string) => {
    setNotificationsState((prev) => prev.map((notification) =>
      notification.id === notificationId ? { ...notification, isRead: true } : notification
    ));

    const athlete = resolveAthlete(athleteName);
    if (!athlete) {
      onNavigate?.('athletes');
      return;
    }
    if (onOpenAthleteProfile) {
      onOpenAthleteProfile(athlete);
      return;
    }
    onNavigate?.('athletes');
  };

  const unreadCount = notificationsState.filter((notification) => !notification.isRead).length;

  const upcomingGames: Array<{
    date: string;
    day: string;
    month: string;
    time: string;
    home: string;
    away: string;
    venue: string;
    athleteName: string;
    category: string;
  }> = [
    { date: '2026-09-30', day: '30', month: 'Set', time: '17:45', home: 'Lions FC', away: 'F1eld Pró FC', venue: 'Complexo Esportivo', athleteName: 'Gabriel Nunes', category: 'Sub-17' },
    { date: '2026-10-02', day: '02', month: 'Out', time: '20:30', home: 'F1eld Pró FC', away: 'Belo Horizonte FC', venue: 'Estádio do Vale', athleteName: 'Lucas Mendes', category: 'Sub-20' },
    { date: '2026-10-07', day: '07', month: 'Out', time: '19:00', home: 'Riviera SC', away: 'F1eld Pró FC', venue: 'Arena Central', athleteName: 'Davi Rocha', category: 'Sub-15' },
  ];

  const categoryBreakdown = [
    { label: 'Sub-10', count: 1 },
    { label: 'Sub-11', count: 1 },
    { label: 'Sub-12', count: 1 },
    { label: 'Sub-13', count: 1 },
    { label: 'Sub-14', count: 1 },
    { label: 'Sub-15', count: 1 },
    { label: 'Sub-17', count: 1 },
    { label: 'Sub-20', count: 1 },
  ];

  const featuredAthletes = [...athletes]
    .map((athlete) => ({
      ...athlete,
      minutes: Math.round(2100 + athlete.stats.tactical * 8 + athlete.stats.physical * 6 + athlete.stats.technical * 7),
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);

  const statCards = [
    { label: 'Atletas Agenciados', val: totalAthletes.toString(), icon: Users, clickable: true, useLogo: true, targetView: 'athletes' as View },
    { label: 'Atletas Negociados', val: inClubPercentage.toString(), icon: TrendingUp, clickable: true, useBrand: true, targetView: 'negociados' as View },
    { label: 'Atletas Totais', val: indicadosCount.toString(), icon: Users, clickable: true, usePeople: true, targetView: 'atletas-totais' as View }
  ];

  const resolveAthlete = (athleteName: string) => {
    const normalized = athleteName.trim().toLowerCase();
    return athletes.find((athlete) => {
      const fullName = `${athlete.name} ${athlete.lastName}`.trim().toLowerCase();
      return fullName === normalized || athlete.name.toLowerCase() === normalized || athlete.lastName.toLowerCase() === normalized;
    }) || athletes[0] || null;
  };

  return (
    <div className="pt-24 pb-32 px-6 max-w-7xl mx-auto">
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <div 
            key={i} 
            onClick={() => {
              if (onNavigate) {
                onNavigate(stat.targetView);
                return;
              }
              if (onAthletesClick) {
                onAthletesClick();
              }
            }}
            className={`bg-surface-low p-5 rounded-2xl border border-white/5 relative overflow-hidden group transition-all cursor-pointer hover:bg-surface-high hover:border-primary/30`}
          >
            <div className="absolute -right-4 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
              {stat.useBrand ? (
                <div className="flex items-center justify-center pr-6 translate-y-1.5">
                  <img
                    src="/assets/cosmopolitano.png"
                    alt="Cosmopolitano"
                    className="h-12 max-w-[140px] object-contain brightness-0 invert opacity-95"
                    onError={(event) => {
                      const target = event.currentTarget as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = 'inline';
                    }}
                  />
                  <span className="hidden text-[7px] font-black uppercase tracking-[0.2em] text-white whitespace-nowrap">
                    Cosmopolitano
                  </span>
                </div>
              ) : stat.useLogo ? (
                <div className="translate-y-1.5">
                  <Logo variant="minimal" className="w-24 h-12" />
                </div>
              ) : stat.usePeople ? (
                <div className="absolute right-2 top-2 opacity-40">
                  <Users className="w-16 h-16 text-white/80" />
                </div>
              ) : (
                stat.icon && <stat.icon className="w-16 h-16" />
              )}
            </div>
            <div className="relative z-10">
              <div className="text-3xl font-black tracking-tighter text-white italic leading-none mb-1">{stat.val}</div>
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant">{stat.label}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-5">
        <div className="space-y-5">
          <div className="bg-surface-low p-5 rounded-[1.75rem] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Destaque</p>
                <h3 className="text-[1.7rem] font-black text-white italic uppercase mt-1 leading-none">Top 5</h3>
              </div>
              <div className="p-2 rounded-xl bg-surface-high">
                <Trophy className="w-4 h-4 text-primary" />
              </div>
            </div>

            <div className="space-y-3">
              {featuredAthletes.map((athlete, index) => (
                <div key={athlete.id} className="rounded-2xl border border-white/5 bg-surface-high p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={athlete.image} alt={athlete.name} className="w-11 h-11 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[8px] font-black text-black">{index + 1}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-white uppercase italic truncate">{athlete.name} {athlete.lastName}</p>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">{athlete.rating}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[8px] font-bold uppercase tracking-widest text-on-surface-variant">
                        <span>{athlete.position}</span>
                        <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" /> {athlete.minutes.toLocaleString('pt-BR')} min</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-lowest">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (athlete.minutes / 3200) * 100)}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/55"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-low p-5 rounded-[1.75rem] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[1.7rem] font-black text-white italic uppercase leading-none">Atleta por categoria</h3>
              </div>
              <div className="p-2 rounded-xl bg-surface-high">
                <Star className="w-4 h-4 text-primary" />
              </div>
            </div>

            <div className="space-y-4">
              {categoryBreakdown.map((item) => {
                const percentage = Math.max(12, (item.count / Math.max(totalAthletes, 1)) * 100);
                return (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                      <span>{item.label}</span>
                      <span>{item.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-highest">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-white/10 bg-surface-low p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Atualizações</p>
              <h3 className="mt-2 text-[1.5rem] font-black uppercase italic leading-none text-white">Notificações</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                {unreadCount}
              </div>
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-high border border-white/10 hover:border-primary/30 transition"
                aria-label="Marcar notificações como lidas"
              >
                <CheckCheck className="h-4 w-4 text-primary" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {notificationsState.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleOpenNotification(notification.athleteName, notification.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  notification.isRead
                    ? 'border-white/10 bg-[#1d1f23] hover:border-primary/35 hover:bg-[#212427]'
                    : 'border-primary/25 bg-primary/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] hover:border-primary/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${notification.accent.replace('text-primary', 'bg-primary').replace('text-green-400', 'bg-green-400').replace('text-yellow-300', 'bg-yellow-300').replace('text-violet-300', 'bg-violet-300')}`} />
                      <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-white">{notification.title}</p>
                    </div>
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">
                      {notification.athleteName}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/70">{notification.description}</p>
                  </div>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" />
                </div>
                <div className="mt-3 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
                  <span>{notification.time}</span>
                  <span className={notification.isRead ? 'text-on-surface-variant' : 'text-primary'}>
                    {notification.isRead ? 'Lida' : 'Nova'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-5">
        <div className="bg-surface-low p-5 rounded-[1.75rem] border border-white/5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Performance</p>
              <h3 className="text-[1.7rem] font-black text-white italic uppercase leading-none">Minutagem Atletas F1eld/Cosmopolitano</h3>
            </div>
            <div className="flex items-center gap-2 bg-surface-high px-3 py-2 rounded-xl">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">+18.4%</span>
            </div>
          </div>

          <div className="flex h-48 items-end gap-3 px-2">
            {chartData.map((item, index) => (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
                <div className="flex h-36 w-full items-end justify-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${item.value}%` }}
                    transition={{ duration: 0.7, delay: index * 0.08 }}
                    className="w-full rounded-t-2xl bg-gradient-to-t from-primary via-primary/80 to-primary/40 shadow-[0_0_24px_rgba(0,255,0,0.18)]"
                  />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="rounded-[1.75rem] border border-white/10 bg-surface-low p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Próximos jogos</p>
              <h3 className="mt-1 text-[1.4rem] font-black uppercase italic leading-none text-white">Agenda</h3>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.('calendar')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-high px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary transition hover:border-primary/40 hover:bg-primary/10"
            >
              Ver calendário
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingGames.map((game) => (
              <button
                key={game.date}
                type="button"
                onClick={() => onNavigate?.('calendar')}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#1d1f23] p-3 text-left transition hover:border-primary/40 hover:bg-[#212427]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl border border-white/10 bg-surface-high text-center">
                    <span className="text-lg font-black leading-none text-white">{game.day}</span>
                    <span className="text-[7px] font-black uppercase tracking-[0.18em] text-on-surface-variant">{game.month}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-primary">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{game.time}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm font-black uppercase italic text-white">
                      <span>{game.home}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-on-surface-variant">VS</span>
                      <span>{game.away}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.16em] text-on-surface-variant">
                      <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[7px] text-primary">{game.category}</span>
                      <MapPin className="h-3 w-3 text-primary" />
                      <span>{game.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="min-w-[110px] max-w-[140px] text-right">
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Atleta</p>
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white">{game.athleteName}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
