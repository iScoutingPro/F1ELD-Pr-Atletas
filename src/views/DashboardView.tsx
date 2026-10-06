import React from 'react';
import { motion } from 'motion/react';
import { Users, UserCheck, Handshake, Trophy, Clock3, Star, CalendarDays, MapPin, ChevronRight, ArrowUpRight, CheckCheck, Trash2 } from 'lucide-react';
import { Athlete, Game, ScoutEntry, View } from '../types';
import { scoutMonthKey } from '../scout';
import { Logo } from '../components/Logo';
import { buildEntries } from './AtletasTotaisView';

const CATEGORIES = ['Profissional', 'Sub-20', 'Sub-17', 'Sub-15', 'Sub-14', 'Sub-13', 'Sub-12', 'Sub-11', 'Sub-10'];

// Mesmo padrão visual do resumo da aba Scout (ScoutOverview): painel em degradê com fio de luz no topo, quadro de ícone e linhas internas
const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const topLineClass = 'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent';
const labelClass = 'text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant';
const titleClass = 'mt-2 text-xl font-black uppercase italic leading-none tracking-tight text-white sm:text-2xl';
const iconFrameClass = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white';
const rowClass = 'rounded-2xl border border-white/10 bg-white/[0.03]';
const emptyClass = `${rowClass} p-5 text-center text-[11px] text-on-surface-variant`;

interface DashboardViewProps {
  athletes: Athlete[];
  games?: Game[];
  scoutEntries?: ScoutEntry[];
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

export const DashboardView = ({ athletes, games = [], scoutEntries = [], onNavigate, onOpenAthleteProfile, activities = [], showNotifications = false, onUnreadChange }: DashboardViewProps) => {
  const totalAthletes = athletes.length;
  // Mesmas contagens das abas: cada lista pelo listType e o total sem repetir quem está nas duas
  const negociadosCount = athletes.filter(a => a.listType === 'negociados').length;
  const agenciadosCount = totalAthletes - negociadosCount;
  const totalPeopleCount = buildEntries(athletes).length;

  // Minutagem real: soma da coluna Minutagem dos lançamentos de scout (aba "Scout").
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
  scoutEntries.forEach(entry => {
    const athlete = athletesById.get(entry.athleteId);
    const minutes = entry.stats.minutes;
    if (!athlete || !(minutes > 0)) return;
    minutesByAthlete.set(athlete.id, (minutesByAthlete.get(athlete.id) || 0) + minutes);
    // Lançamento sem ano ou sem data reconhecível conta no Top 5, mas não entra no gráfico por mês
    const month = chartData.find(item => item.key === scoutMonthKey(entry));
    if (!month) return;
    if (athlete.listType === 'negociados') month.cosmopolitano += minutes;
    else month.field += minutes;
  });
  const chartTotal = chartData.reduce((acc, item) => acc + item.field + item.cosmopolitano, 0);
  const chartMax = Math.max(1, ...chartData.map(item => Math.max(item.field, item.cosmopolitano)));
  // Atletas relacionados em cada mês do gráfico, por lista: quem tem scout lançado no mês, cada atleta contado uma vez, e as convocações (um atleta numa partida)
  const calledByMonth = chartData.map(() => ({ field: new Set<string>(), cosmopolitano: new Set<string>(), games: 0 }));
  scoutEntries.forEach(entry => {
    const athlete = athletesById.get(entry.athleteId);
    const called = calledByMonth[chartData.findIndex(item => item.key === scoutMonthKey(entry))];
    if (!athlete || !called) return;
    called[athlete.listType === 'negociados' ? 'cosmopolitano' : 'field'].add(athlete.id);
    called.games += 1;
  });
  const calledMax = Math.max(1, ...calledByMonth.map(month => Math.max(month.field.size, month.cosmopolitano.size)));
  // No período, atleta relacionado em mais de um mês conta uma vez só
  const calledBySeries = {
    field: new Set(calledByMonth.flatMap(month => [...month.field])).size,
    cosmopolitano: new Set(calledByMonth.flatMap(month => [...month.cosmopolitano])).size,
  };
  const calledTotal = calledBySeries.field + calledBySeries.cosmopolitano;
  const minutesBySeries = {
    field: chartData.reduce((acc, item) => acc + item.field, 0),
    cosmopolitano: chartData.reduce((acc, item) => acc + item.cosmopolitano, 0),
  };
  // Tons de cinza, como no resto do app: claro para F1eld e médio para Cosmopolitano
  const chartSeries = [
    { key: 'field' as const, label: 'F1eld (Agenciados)', barClass: 'bg-gradient-to-t from-zinc-300 to-white' },
    { key: 'cosmopolitano' as const, label: 'Cosmopolitano (Negociados)', barClass: 'bg-gradient-to-t from-zinc-600 to-zinc-400' },
  ];
  // Legenda dos dois gráficos: o valor de cada lista, o total somando as duas e, se houver, uma linha a mais
  const seriesLegend = (values: Record<'field' | 'cosmopolitano', number>, extra?: { label: string; value: number }) => (
    <div className="min-w-[13.5rem] space-y-1.5">
      {chartSeries.map((series) => (
        <p key={series.key} className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${series.barClass}`} />
          <span>{series.label}</span>
          <span className="ml-auto pl-3 text-xs font-black text-white">{values[series.key].toLocaleString('pt-BR')}</span>
        </p>
      ))}
      <p className="flex items-center gap-2 border-t border-white/10 pt-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
        <span>Total</span>
        <span className="ml-auto pl-3 text-xs">{(values.field + values.cosmopolitano).toLocaleString('pt-BR')}</span>
      </p>
      {extra && (
        <p className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
          <span>{extra.label}</span>
          <span className="ml-auto pl-3 text-xs font-black text-white">{extra.value.toLocaleString('pt-BR')}</span>
        </p>
      )}
    </div>
  );

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

  // Top 5 pelo total de minutos lançados no scout; quem não tem minutos não entra
  const featuredAthletes = athletes
    .map((athlete) => ({ ...athlete, minutes: minutesByAthlete.get(athlete.id) || 0 }))
    .filter((athlete) => athlete.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);
  const topMinutes = featuredAthletes[0]?.minutes || 1;

  const statCards = [
    { label: 'Atletas Agenciados', val: agenciadosCount.toString(), icon: UserCheck, useLogo: true, useBrand: false },
    { label: 'Atletas Negociados', val: negociadosCount.toString(), icon: Handshake, useLogo: false, useBrand: true },
    { label: 'Atletas Totais', val: totalPeopleCount.toString(), icon: Users, useLogo: false, useBrand: false }
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
          // Só informação: os cards não são clicáveis
          <div key={i} className={`${panelClass} relative overflow-hidden p-3 text-left sm:px-5 sm:py-4`}>
            <div className={topLineClass} />
            <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-white/[0.07] blur-2xl" />
            {/* Marca da lista apagada ao fundo */}
            <div className="pointer-events-none absolute -right-4 -top-2 opacity-5 sm:bottom-3 sm:right-3 sm:top-auto">
              {stat.useBrand ? (
                <div className="flex items-center justify-center pr-6 translate-y-1.5 sm:pr-0">
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
              ) : (
                <Users className="h-16 w-16 text-white/80" />
              )}
            </div>
            {/* No celular os três cards ficam estreitos: sem o quadro do ícone, só o número e o nome */}
            <div className="relative flex items-center gap-3 max-sm:hidden">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white">
                <stat.icon className="h-4 w-4" />
              </span>
              <p className={labelClass}>{stat.label}</p>
            </div>
            <p className="relative text-3xl font-black italic leading-none tracking-tight text-white sm:mt-3 sm:text-4xl">{stat.val}</p>
            <p className="relative mt-1.5 text-[8px] font-black uppercase leading-tight tracking-[0.06em] text-on-surface-variant sm:hidden">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* max-sm:contents: no celular os dois blocos entram direto na ordem da página (notificações logo abaixo do sino) */}
      <section className={`grid grid-cols-1 gap-5 max-sm:contents ${showNotifications ? '' : 'sm:mt-6'}`}>
        <div hidden={showNotifications} className="space-y-3 max-sm:order-3 max-sm:mt-3 sm:space-y-5 xl:grid xl:grid-cols-2 xl:gap-5 xl:space-y-0">
          <div className={`${panelClass} relative overflow-hidden p-4 sm:p-6`}>
            <div className={topLineClass} />
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className={labelClass}>Destaque · minutagem</p>
                <h3 className={titleClass}>Top 5</h3>
              </div>
              <span className={iconFrameClass}>
                <Trophy className="h-[18px] w-[18px]" />
              </span>
            </div>

            <div className="space-y-2.5">
              {featuredAthletes.length === 0 && (
                <p className={emptyClass}>
                  Nenhuma minutagem cadastrada ainda. Lance a minutagem de cada atleta na aba Scout.
                </p>
              )}
              {featuredAthletes.map((athlete, index) => (
                <div key={athlete.id} className={`${rowClass} p-3`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black ${index === 0 ? 'border-primary bg-primary text-background' : 'border-white/15 bg-white/[0.04] text-on-surface-variant'}`}>{index + 1}</span>
                    <img src={athlete.image} alt={athlete.name} className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/15" referrerPolicy="no-referrer" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black uppercase italic text-white">{athlete.name} {athlete.lastName}</p>
                      <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">{[athlete.position, athlete.category].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-black italic leading-none text-white">{athlete.minutes.toLocaleString('pt-BR')}</p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">min</p>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(athlete.minutes / topMinutes) * 100}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className={`h-full rounded-full ${index === 0 ? 'bg-gradient-to-r from-zinc-300 to-white' : 'bg-white/50'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${panelClass} relative overflow-hidden p-4 sm:p-6`}>
            <div className={topLineClass} />
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className={labelClass}>{totalPeopleCount} {totalPeopleCount === 1 ? 'atleta' : 'atletas'}</p>
                <h3 className={titleClass}>Atleta por categoria</h3>
              </div>
              <span className={iconFrameClass}>
                <Star className="h-[18px] w-[18px]" />
              </span>
            </div>

            {/* No celular cada categoria vira um quadro (número em cima, nome embaixo), três por linha, sem a barra */}
            <div className="max-sm:grid max-sm:grid-cols-3 max-sm:gap-2 sm:space-y-3.5">
              {categoryBreakdown.map((item) => {
                const percentage = (item.count / Math.max(totalPeopleCount, 1)) * 100;
                return (
                  <div key={item.label} className="max-sm:rounded-xl max-sm:border max-sm:border-white/10 max-sm:bg-white/[0.03] max-sm:px-1 max-sm:py-2.5 sm:grid sm:grid-cols-[6.5rem_1fr_2.5rem] sm:items-center sm:gap-3">
                    <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-on-surface-variant max-sm:hidden">{item.label}</span>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 max-sm:hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full rounded-full bg-gradient-to-r from-zinc-400 to-white"
                      />
                    </div>
                    <div className="flex items-center justify-end text-[9px] font-black uppercase text-on-surface-variant max-sm:flex-col-reverse max-sm:justify-between max-sm:gap-1 max-sm:text-[8px]">
                      <span className="sm:hidden">{item.label}</span>
                      <span className={`text-base italic leading-none max-sm:text-xl ${item.count > 0 ? 'text-white' : 'text-white/25'}`}>{item.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside hidden={!showNotifications} className={`${panelClass} relative overflow-hidden p-4 sm:p-6`}>
          <div className={topLineClass} />
          {/* No celular o título e os botões encolhem para caber na mesma linha; se ainda assim não couber, os botões descem alinhados à direita */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-2 gap-y-3 sm:gap-x-3">
            <div className="min-w-0">
              <p className={`${labelClass} max-sm:tracking-[0.16em]`}>Atualizações</p>
              <h3 className="mt-2 text-base font-black uppercase italic leading-none tracking-tight text-white sm:text-2xl">Notificações</h3>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <div className="flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-primary px-2 text-[10px] font-black uppercase tracking-[0.18em] text-background sm:h-10 sm:min-w-[2.5rem]">
                {unreadCount}
              </div>
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white transition hover:bg-white/10 sm:h-10 sm:w-10"
                aria-label="Marcar notificações como lidas"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearNotifications}
                  className="flex h-8 w-8 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10 sm:h-10 sm:w-auto sm:px-3.5"
                  aria-label="Limpar notificações"
                  title="Limpar notificações"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="max-sm:hidden">Limpar</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {notifications.length === 0 && (
              <p className={emptyClass}>
                Nenhuma notificação ainda.
              </p>
            )}
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleOpenNotification(notification)}
                className={`w-full rounded-2xl border p-3.5 text-left transition ${
                  notification.isRead
                    ? 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                    : 'border-white/30 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${notification.accent.replace('text-primary', 'bg-primary').replace('text-green-400', 'bg-green-400').replace('text-yellow-300', 'bg-yellow-300').replace('text-violet-300', 'bg-violet-300')}`} />
                      <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-white">{notification.title}</p>
                    </div>
                    <p className="mt-2 text-sm font-black uppercase italic text-white">
                      {notification.athleteName}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-white/70">{notification.description}</p>
                  </div>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" />
                </div>
                <div className="mt-3 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
                  <span>{notification.time}</span>
                  <span className={notification.isRead ? '' : 'rounded-full bg-primary px-2 py-0.5 text-background'}>
                    {notification.isRead ? 'Lida' : 'Nova'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section hidden={showNotifications} className="mt-3 max-sm:order-4 sm:mt-5">
        <div>
          {/* Dois painéis lado a lado, cada um completo (título, número do período, legenda e colunas), para não misturar minutos com atletas */}
          <div className="grid gap-3 sm:gap-5 xl:grid-cols-2">
            {/* Minutagem por mês, separada por lista */}
            <div className={`${panelClass} relative min-w-0 overflow-hidden p-4 sm:p-6`}>
              <div className={topLineClass} />
              <div className="mb-5 min-w-0">
                <p className={labelClass}>Performance · últimos 6 meses</p>
                <h3 className={`${titleClass} break-words`}>Minutagem Atletas F1eld/Cosmopolitano</h3>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="flex items-center gap-3">
                  <span className={iconFrameClass}>
                    <Clock3 className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className={labelClass}>Total do período</p>
                    <p className="mt-1.5 text-3xl font-black italic leading-none tracking-tight text-white sm:text-4xl">
                      {chartTotal.toLocaleString('pt-BR')} <span className="text-sm not-italic text-on-surface-variant">min</span>
                    </p>
                  </div>
                </div>
                {seriesLegend(minutesBySeries)}
              </div>

              {chartTotal === 0 ? (
                <p className="mt-6 text-sm text-white/70">Nenhuma minutagem cadastrada nos últimos 6 meses. Lance a minutagem de cada atleta na aba Scout.</p>
              ) : (
                <div className="relative mt-6 flex gap-1.5 sm:gap-3">
                  {/* Linhas de referência atrás das colunas */}
                  <div className="pointer-events-none absolute inset-x-0 top-5 h-36">
                    {[0, 50, 100].map((mark) => <div key={mark} className="absolute inset-x-0 border-t border-dashed border-white/[0.07]" style={{ top: `${mark}%` }} />)}
                  </div>
                  {chartData.map((item, index) => {
                    const monthTotal = item.field + item.cosmopolitano;
                    return (
                      <div key={item.key} className="relative flex min-w-0 flex-1 flex-col items-center">
                        <span className={`h-5 text-xs font-black leading-none ${monthTotal > 0 ? 'text-white' : 'text-white/25'}`}>{monthTotal.toLocaleString('pt-BR')}</span>
                        <div className="flex h-36 w-full items-end justify-center gap-1 border-b border-white/15">
                          {chartSeries.map((series) => (
                            <motion.div
                              key={series.key}
                              initial={{ height: 0 }}
                              animate={{ height: `${(item[series.key] / chartMax) * 100}%` }}
                              transition={{ duration: 0.7, delay: index * 0.08 }}
                              title={`${series.label}: ${item[series.key].toLocaleString('pt-BR')} min`}
                              className={`w-full max-w-8 rounded-t-lg ${series.barClass}`}
                            />
                          ))}
                        </div>
                        <span className={`mt-2 text-[9px] font-black uppercase tracking-[0.16em] ${monthTotal > 0 ? 'text-white' : 'text-on-surface-variant'}`}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Atletas relacionados por mês (o mesmo número da aba Scout): atletas com scout lançado no mês, cada um contado uma vez */}
            <div className={`${panelClass} relative min-w-0 overflow-hidden p-4 sm:p-6`}>
              <div className={topLineClass} />
              <div className="mb-5 min-w-0">
                <p className={labelClass}>Convocações · últimos 6 meses</p>
                <h3 className={`${titleClass} break-words`}>Atletas Relacionados F1eld/Cosmopolitano</h3>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="flex items-center gap-3">
                  <span className={iconFrameClass}>
                    <Users className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className={labelClass}>Total do período</p>
                    <p className="mt-1.5 text-3xl font-black italic leading-none tracking-tight text-white sm:text-4xl">
                      {calledTotal} <span className="text-sm not-italic text-on-surface-variant">{calledTotal === 1 ? 'atleta' : 'atletas'}</span>
                    </p>
                  </div>
                </div>
                {seriesLegend(calledBySeries)}
              </div>

              {calledTotal === 0 ? (
                <p className="mt-6 text-sm text-white/70">Nenhum scout lançado nos últimos 6 meses.</p>
              ) : (
                <div className="relative mt-6 flex gap-1.5 sm:gap-3">
                  <div className="pointer-events-none absolute inset-x-0 top-5 h-36">
                    {[0, 50, 100].map((mark) => <div key={mark} className="absolute inset-x-0 border-t border-dashed border-white/[0.07]" style={{ top: `${mark}%` }} />)}
                  </div>
                  {chartData.map((item, index) => {
                    const called = calledByMonth[index];
                    const count = called.field.size + called.cosmopolitano.size;
                    return (
                      <div
                        key={item.key}
                        className="relative flex min-w-0 flex-1 flex-col items-center"
                        title={`${item.label}: ${count} ${count === 1 ? 'atleta relacionado' : 'atletas relacionados'} em ${called.games} ${called.games === 1 ? 'convocação' : 'convocações'}`}
                      >
                        <span className={`h-5 text-xs font-black leading-none ${count > 0 ? 'text-white' : 'text-white/25'}`}>{count}</span>
                        <div className="flex h-36 w-full items-end justify-center gap-1 border-b border-white/15">
                          {chartSeries.map((series) => (
                            <motion.div
                              key={series.key}
                              initial={{ height: 0 }}
                              animate={{ height: `${(called[series.key].size / calledMax) * 100}%` }}
                              transition={{ duration: 0.7, delay: index * 0.08 }}
                              title={`${series.label}: ${called[series.key].size}`}
                              className={`w-full max-w-8 rounded-t-lg ${series.barClass}`}
                            />
                          ))}
                        </div>
                        <span className={`mt-2 text-[9px] font-black uppercase tracking-[0.16em] ${count > 0 ? 'text-white' : 'text-on-surface-variant'}`}>{item.label}</span>
                        <span className="mt-1 truncate text-[9px] font-bold leading-none text-on-surface-variant">{called.games} conv.</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* A pedido do usuário, "Próximos jogos" vem logo abaixo das contagens (-order-2 e -order-1), em qualquer tela */}
      <section hidden={showNotifications} className="-order-1 mt-3 sm:mt-6">
        <div className={`${panelClass} relative overflow-hidden p-4 sm:p-6`}>
          <div className={topLineClass} />
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className={labelClass}>Próximos jogos</p>
              <h3 className={titleClass}>Agenda</h3>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.('calendar')}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.02]"
            >
              Ver calendário
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {upcomingGames.length === 0 && (
              <p className={emptyClass}>
                Nenhum próximo jogo cadastrado no Calendário.
              </p>
            )}
            {upcomingGames.map((game, index) => (
              <button
                key={game.id}
                type="button"
                onClick={() => onNavigate?.('calendar')}
                className={`${rowClass} flex w-full flex-col gap-3 p-3 text-left transition hover:border-white/25 hover:bg-white/[0.06] sm:flex-row sm:items-center sm:p-3.5`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* O jogo mais próximo tem o quadro da data em branco */}
                  <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border text-center ${index === 0 ? 'border-primary bg-primary text-background' : 'border-white/15 bg-white/[0.04] text-white'}`}>
                    <span className="text-xl font-black italic leading-none">{game.day}</span>
                    <span className={`mt-0.5 text-[8px] font-black uppercase tracking-[0.18em] ${index === 0 ? 'text-background/70' : 'text-on-surface-variant'}`}>{game.month}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span>{game.time || '--:--'}</span>
                      {game.competition && <span className="min-w-0 break-words text-on-surface-variant">· {game.competition}</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm font-black uppercase italic text-white sm:text-base">
                      <span className="break-words">{game.home}</span>
                      <span className="rounded-full border border-white/15 bg-white/[0.04] px-1.5 py-0.5 text-[9px] not-italic text-on-surface-variant">VS</span>
                      <span className="break-words">{game.away}</span>
                    </div>
                    {(game.category || game.venue) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">
                        {game.category && (
                          <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[8px] text-white">{game.category}</span>
                        )}
                        {game.venue && (
                          <>
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="break-words">{game.venue}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-2 sm:min-w-[110px] sm:max-w-[180px] sm:border-0 sm:pt-0 sm:text-right">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
                    {game.athleteNames.length === 1 ? 'Atleta' : 'Atletas'}
                  </p>
                  {game.athleteNames.length > 0 ? (
                    game.athleteNames.map((name) => (
                      <p key={name} className="mt-0.5 break-words text-[11px] font-black uppercase italic leading-tight text-white">{name}</p>
                    ))
                  ) : (
                    <p className="mt-0.5 text-[10px] text-on-surface-variant">Nenhum vinculado</p>
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
