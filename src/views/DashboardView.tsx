import React from 'react';
import { motion } from 'motion/react';
import { Users, TrendingUp, ShieldCheck, FileText, Trophy, Clock3, Star, CalendarDays, MapPin, ChevronRight, Bell, ArrowUpRight, CheckCheck, Trash2 } from 'lucide-react';
import { Athlete, Game, View } from '../types';
import { Logo } from '../components/Logo';
import { buildEntries } from './AtletasTotaisView';

const CATEGORIES = ['Profissional', 'Sub-20', 'Sub-17', 'Sub-15', 'Sub-14', 'Sub-13', 'Sub-12', 'Sub-11', 'Sub-10'];

interface DashboardViewProps {
  athletes: Athlete[];
  games?: Game[];
  onAthletesClick?: () => void;
  onNavigate?: (view: View) => void;
  onOpenAthleteProfile?: (athlete: Athlete) => void;
  activities?: any[];
  // A central de notificações fica fechada até clicar no sino do menu lateral; aberta, o resto do painel some (atributo hidden)
  showNotifications?: boolean;
  onUnreadChange?: (count: number) => void;
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

// Notificações lidas ficam só neste navegador (a tabela recent_activities não guarda leitura)
const READ_NOTIFICATIONS_KEY = 'fieldpro_read_notifications_v1';

// "Limpar notificações" também vale só neste navegador: as linhas continuam no banco e nos outros aparelhos
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

// Tipos gravados por recordActivity em App.tsx
const describeActivity = (activity: any) => {
  switch (activity.type) {
    case 'CONTRATO':
      return {
        description: activity.title === 'NOVO ATLETA NEGOCIADO'
          ? 'Novo atleta cadastrado em Atletas Negociados.'
          : 'Novo atleta cadastrado em Atletas Agenciados.',
        accent: 'text-primary',
      };
    case 'DVD':
      return { description: 'DVD adicionado ao perfil do atleta.', accent: 'text-green-400' };
    case 'ATHLETE_UPDATE':
      return { description: 'Informações do perfil foram atualizadas.', accent: 'text-yellow-300' };
    default:
      return { description: activity.club ? `Clube: ${activity.club}` : '', accent: 'text-violet-300' };
  }
};

export const DashboardView = ({ athletes, games = [], onAthletesClick, onNavigate, onOpenAthleteProfile, activities = [], showNotifications = false, onUnreadChange }: DashboardViewProps) => {
  const totalAthletes = athletes.length;
  // Mesmas contagens das abas: cada lista pelo listType e o total sem repetir quem está nas duas
  const negociadosCount = athletes.filter(a => a.listType === 'negociados').length;
  const agenciadosCount = totalAthletes - negociadosCount;
  const totalPeopleCount = buildEntries(athletes).length;

  // Minutagem real: soma dos minutos lançados em cada jogo do calendário (Game.athleteMinutes).
  // Minutos de atleta já apagado ficam de fora. O gráfico cobre os últimos 6 meses, separado por lista.
  const today = new Date();
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const month = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
    return {
      key: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
      label: month.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
      field: 0,
      cosmopolitano: 0,
    };
  });
  const athletesById = new Map(athletes.map(athlete => [athlete.id, athlete]));
  const minutesByAthlete = new Map<string, number>();
  games.forEach(game => {
    const month = chartData.find(item => item.key === game.date.slice(0, 7));
    Object.entries(game.athleteMinutes || {}).forEach(([athleteId, minutes]) => {
      const athlete = athletesById.get(athleteId);
      if (!athlete || !(minutes > 0)) return;
      minutesByAthlete.set(athleteId, (minutesByAthlete.get(athleteId) || 0) + minutes);
      if (!month) return;
      if (athlete.listType === 'negociados') month.cosmopolitano += minutes;
      else month.field += minutes;
    });
  });
  const chartTotal = chartData.reduce((acc, item) => acc + item.field + item.cosmopolitano, 0);
  const chartMax = Math.max(1, ...chartData.map(item => Math.max(item.field, item.cosmopolitano)));
  const chartSeries = [
    { key: 'field' as const, label: 'F1eld (Agenciados)', barClass: 'bg-primary' },
    { key: 'cosmopolitano' as const, label: 'Cosmopolitano (Negociados)', barClass: 'bg-primary/35' },
  ];

  // A central de notificações mostra as linhas de recent_activities gravadas por recordActivity
  const [readIds, setReadIds] = React.useState<string[]>(() => loadIds(READ_NOTIFICATIONS_KEY));
  const [clearedIds, setClearedIds] = React.useState<string[]>(() => loadIds(CLEARED_NOTIFICATIONS_KEY));

  const notifications = activities.map((activity, index) => {
    const id = String(activity.id ?? activity.created_at ?? index);
    const { description, accent } = describeActivity(activity);
    return {
      id,
      athleteId: activity.athlete_id as string | undefined,
      title: activity.title || 'Atualização',
      athleteName: activity.subtitle || '',
      description,
      time: activity.created_at ? getTimeAgo(activity.created_at) : '',
      accent,
      isRead: readIds.includes(id),
    };
  }).filter(notification => !clearedIds.includes(notification.id));

  const markAsRead = (ids: string[]) => {
    setReadIds(prev => {
      const next = Array.from(new Set([...prev, ...ids])).slice(-200);
      saveIds(READ_NOTIFICATIONS_KEY, next);
      return next;
    });
  };

  // Some com as notificações atuais da lista; as novas continuam chegando
  const handleClearNotifications = () => {
    setClearedIds(prev => {
      const next = Array.from(new Set([...prev, ...notifications.map(notification => notification.id)])).slice(-200);
      saveIds(CLEARED_NOTIFICATIONS_KEY, next);
      return next;
    });
  };

  const handleMarkAllAsRead = () => markAsRead(notifications.map(notification => notification.id));

  const handleOpenNotification = (notification: typeof notifications[number]) => {
    markAsRead([notification.id]);

    const athlete = resolveAthlete(notification.athleteId, notification.athleteName);
    if (athlete && onOpenAthleteProfile) {
      onOpenAthleteProfile(athlete);
      return;
    }
    onNavigate?.('athletes');
  };

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  // O sino do menu lateral (celular) mostra este número
  React.useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  // Próximos jogos: os mesmos da aba Calendário (tabela games), de hoje em diante, por data e horário
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const upcomingGames = games
    .filter(game => game.date >= todayKey)
    .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))
    .slice(0, 5)
    .map(game => {
      const date = new Date(`${game.date}T12:00:00`);
      return {
        ...game,
        day: String(date.getDate()).padStart(2, '0'),
        month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        // Id de atleta apagado é ignorado, como no Calendário
        athleteNames: game.athleteIds
          .map(id => athletesById.get(id))
          .filter((athlete): athlete is Athlete => !!athlete)
          .map(athlete => `${athlete.name} ${athlete.lastName || ''}`.trim()),
      };
    });

  // Cada pessoa conta uma vez, como no card Atletas Totais; categorias fora de CATEGORIES vão ao final
  const people = buildEntries(athletes).map(entry => entry.athlete);
  const extraCategories = Array.from(new Set(people.map(a => a.category).filter(c => c && !CATEGORIES.includes(c))));
  const categoryBreakdown = [...CATEGORIES, ...extraCategories].map(label => ({
    label,
    count: people.filter(a => a.category === label).length,
  }));

  // Top 5 pelo total de minutos lançados nos jogos; quem não tem minutos não entra
  const featuredAthletes = athletes
    .map((athlete) => ({ ...athlete, minutes: minutesByAthlete.get(athlete.id) || 0 }))
    .filter((athlete) => athlete.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);
  const topMinutes = featuredAthletes[0]?.minutes || 1;

  const statCards = [
    { label: 'Atletas Agenciados', val: agenciadosCount.toString(), icon: Users, clickable: true, useLogo: true, targetView: 'athletes' as View },
    { label: 'Atletas Negociados', val: negociadosCount.toString(), icon: TrendingUp, clickable: true, useBrand: true, targetView: 'negociados' as View },
    { label: 'Atletas Totais', val: totalPeopleCount.toString(), icon: Users, clickable: true, usePeople: true, targetView: 'atletas-totais' as View }
  ];

  // Pelo id gravado na atividade; o nome serve só para atividades antigas sem athlete_id
  const resolveAthlete = (athleteId: string | undefined, athleteName: string) => {
    const byId = athleteId ? athletes.find((athlete) => athlete.id === athleteId) : undefined;
    if (byId) return byId;
    const normalized = athleteName.trim().toLowerCase();
    if (!normalized) return null;
    return athletes.find((athlete) =>
      `${athlete.name} ${athlete.lastName || ''}`.trim().toLowerCase() === normalized
    ) || null;
  };

  return (
    // Ordem na tela: contagens, próximos jogos, Top 5 e categorias, minutagem (no celular as classes max-sm:order-* mantêm essa ordem)
    <div className="mx-auto flex w-full max-w-[1600px] flex-col px-3 pb-12 pt-6 sm:px-6 sm:pt-10 lg:px-10">
      <section hidden={showNotifications} className="-order-2 grid grid-cols-3 gap-2 sm:gap-4">
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
            className={`bg-surface-low p-3 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden group transition-all cursor-pointer hover:bg-surface-high hover:border-primary/30`}
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
              <div className="text-3xl font-black tracking-tighter text-white italic leading-none mb-1.5 sm:mb-1">{stat.val}</div>
              <div className="text-[8px] font-black uppercase leading-tight tracking-[0.06em] sm:tracking-[0.2em] text-on-surface-variant">{stat.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* max-sm:contents: no celular os dois blocos entram direto na ordem da página (notificações logo abaixo do sino) */}
      <section className={`grid grid-cols-1 gap-5 max-sm:contents ${showNotifications ? '' : 'sm:mt-6'}`}>
        <div hidden={showNotifications} className="space-y-3 max-sm:order-3 max-sm:mt-3 sm:space-y-5 xl:grid xl:grid-cols-2 xl:gap-5 xl:space-y-0">
          <div className="bg-surface-low p-4 sm:p-5 rounded-[1.75rem] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Destaque</p>
                <h3 className="text-xl sm:text-[1.7rem] font-black text-white italic uppercase mt-1 leading-none">Top 5</h3>
              </div>
              <div className="p-2 rounded-xl bg-surface-high">
                <Trophy className="w-4 h-4 text-primary" />
              </div>
            </div>

            <div className="space-y-3">
              {featuredAthletes.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-surface-high p-4 text-center text-[11px] text-on-surface-variant">
                  Nenhuma minutagem cadastrada ainda. Informe os minutos de cada atleta nos jogos do Calendário.
                </p>
              )}
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
                      animate={{ width: `${(athlete.minutes / topMinutes) * 100}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/55"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-low p-4 sm:p-5 rounded-[1.75rem] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl sm:text-[1.7rem] font-black text-white italic uppercase leading-none">Atleta por categoria</h3>
              </div>
              <div className="p-2 rounded-xl bg-surface-high">
                <Star className="w-4 h-4 text-primary" />
              </div>
            </div>

            {/* No celular cada categoria vira um quadro (número em cima, nome embaixo), três por linha, sem a barra */}
            <div className="max-sm:grid max-sm:grid-cols-3 max-sm:gap-2 sm:space-y-4">
              {categoryBreakdown.map((item) => {
                const percentage = (item.count / Math.max(totalPeopleCount, 1)) * 100;
                return (
                  <div key={item.label} className="max-sm:rounded-xl max-sm:border max-sm:border-white/5 max-sm:bg-surface-high max-sm:px-1 max-sm:py-2.5">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant max-sm:flex-col-reverse max-sm:gap-1 max-sm:text-[8px] max-sm:tracking-normal sm:mb-1">
                      <span>{item.label}</span>
                      <span className={`max-sm:text-xl max-sm:italic max-sm:leading-none ${item.count > 0 ? 'max-sm:text-white' : 'max-sm:text-white/25'}`}>{item.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-highest max-sm:hidden">
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

        <aside hidden={!showNotifications} className="rounded-[1.75rem] border border-white/10 bg-surface-low p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Atualizações</p>
              <h3 className="mt-2 text-xl sm:text-[1.5rem] font-black uppercase italic leading-none text-white">Notificações</h3>
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

          <div className="flex flex-col gap-3">
            {notifications.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-[#1d1f23] p-4 text-center text-[11px] text-on-surface-variant">
                Nenhuma notificação ainda.
              </p>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearNotifications}
                className="order-last flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-surface-high px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:border-primary/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar notificações
              </button>
            )}
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleOpenNotification(notification)}
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

      <section hidden={showNotifications} className="mt-3 max-sm:order-4 sm:mt-5">
        <div className="bg-surface-low p-4 sm:p-5 rounded-[1.75rem] border border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Performance</p>
              <h3 className="break-words text-xl sm:text-[1.7rem] font-black text-white italic uppercase leading-none">Minutagem Atletas F1eld/Cosmopolitano</h3>
            </div>
            <div className="flex shrink-0 items-center gap-2 bg-surface-high px-3 py-2 rounded-xl">
              <Clock3 className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">{chartTotal.toLocaleString('pt-BR')} min</span>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-2">
            {chartSeries.map((series) => (
              <span key={series.key} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                <span className={`h-2.5 w-2.5 rounded-sm ${series.barClass}`} />
                {series.label}
              </span>
            ))}
            <span className="ml-auto text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Últimos 6 meses</span>
          </div>

          {chartTotal === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-surface-high p-6 text-center text-[11px] text-on-surface-variant">
              Nenhuma minutagem cadastrada nos últimos 6 meses. Informe os minutos de cada atleta nos jogos do Calendário.
            </p>
          ) : (
            <div className="flex items-end gap-1.5 sm:gap-3 sm:px-2">
              {chartData.map((item, index) => (
                <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-36 w-full items-end justify-center gap-1">
                    {chartSeries.map((series) => (
                      <motion.div
                        key={series.key}
                        initial={{ height: 0 }}
                        animate={{ height: `${(item[series.key] / chartMax) * 100}%` }}
                        transition={{ duration: 0.7, delay: index * 0.08 }}
                        title={`${series.label}: ${item[series.key].toLocaleString('pt-BR')} min`}
                        className={`w-full max-w-10 rounded-t-xl ${series.barClass}`}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">{item.label}</span>
                  <span className="text-[10px] font-black text-white">{(item.field + item.cosmopolitano).toLocaleString('pt-BR')}<span className="hidden sm:inline"> min</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* A pedido do usuário, "Próximos jogos" vem logo abaixo das contagens (-order-2 e -order-1), em qualquer tela */}
      <section hidden={showNotifications} className="-order-1 mt-3 sm:mt-6">
        <div className="rounded-[1.75rem] border border-white/10 bg-surface-low p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Próximos jogos</p>
              <h3 className="mt-1 text-xl sm:text-[1.4rem] font-black uppercase italic leading-none text-white">Agenda</h3>
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
            {upcomingGames.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-[#1d1f23] p-4 text-center text-[11px] text-on-surface-variant">
                Nenhum próximo jogo cadastrado no Calendário.
              </p>
            )}
            {upcomingGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => onNavigate?.('calendar')}
                className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-[#1d1f23] p-3 text-left transition hover:border-primary/40 hover:bg-[#212427] sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-surface-high text-center">
                    <span className="text-lg font-black leading-none text-white">{game.day}</span>
                    <span className="text-[7px] font-black uppercase tracking-[0.18em] text-on-surface-variant">{game.month}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-primary">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{game.time || '--:--'}</span>
                      {game.competition && <span className="min-w-0 break-words text-on-surface-variant">· {game.competition}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-black uppercase italic text-white">
                      <span className="break-words">{game.home}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-on-surface-variant">VS</span>
                      <span className="break-words">{game.away}</span>
                    </div>
                    {(game.category || game.venue) && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.16em] text-on-surface-variant">
                        {game.category && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[7px] text-primary">{game.category}</span>
                        )}
                        {game.venue && (
                          <>
                            <MapPin className="h-3 w-3 shrink-0 text-primary" />
                            <span className="break-words">{game.venue}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-2 sm:min-w-[110px] sm:max-w-[160px] sm:border-0 sm:pt-0 sm:text-right">
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
                    {game.athleteNames.length === 1 ? 'Atleta' : 'Atletas'}
                  </p>
                  {game.athleteNames.length > 0 ? (
                    game.athleteNames.map((name) => (
                      <p key={name} className="break-words text-[10px] font-black uppercase leading-tight tracking-[0.12em] text-white">{name}</p>
                    ))
                  ) : (
                    <p className="text-[10px] text-on-surface-variant">Nenhum vinculado</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
