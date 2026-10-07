import React, { useMemo, useState } from 'react';
import { Armchair, ArrowLeft, ArrowRight, CalendarDays, LogIn, LogOut, LucideIcon, RectangleVertical, Shirt, Target, Timer, TrendingDown, TrendingUp } from 'lucide-react';
import { Athlete, ScoutEntry } from '../types';
import { SCOUT_FIELDS, formatScoutValue, scoutMonthKey, scoutValue } from '../scout';
import { SheetSelect } from './SheetSelect';

export const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
export const labelClass = 'text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant';
const filterClass = 'h-10 w-full rounded-xl border bg-white/[0.04] px-3 text-sm text-white outline-none transition';

const FIELD_BY_KEY = new Map(SCOUT_FIELDS.map((field) => [field.key, field]));
export const fieldOf = (key: string) => FIELD_BY_KEY.get(key)!;

const fullName = (athlete: Athlete) => `${athlete.name} ${athlete.lastName || ''}`.trim();
const format = (value: number) => value.toLocaleString('pt-BR');

// O resumo tem dois níveis. Scout geral (súmula): o que existe em todo jogo (Titular, Reserva, Entrou, Saiu, Minutagem, Gols e cartões), sempre à mostra.
// Scout técnico: os outros números, que só existem nos jogos com transmissão, e aparecem pelo botão "Scout técnico"
export const SHEET_KEYS = new Set(['starter', 'bench', 'subIn', 'subOut', 'minutes', 'goals', 'yellowCards', 'redCards']);

// Números em destaque no topo do resumo (súmula); clicar escolhe o número dos gráficos de "Evolução"
export const GAMES_KEY = 'games';
export const GAMES_LABEL = 'Jogos relacionados';
export const HEADLINE_KEYS = [GAMES_KEY, 'minutes', 'starter', 'bench', 'goals'];
// Quadros menores, embaixo dos em destaque
export const SHEET_TILE_KEYS = ['subIn', 'subOut', 'yellowCards', 'redCards'];
// Cor do ícone dos quadros menores, a pedido do usuário (única exceção ao preto e branco do resumo):
// Entrou verde, Saiu vermelho e os cartões na cor de cada um (o ícone do cartão é preenchido)
export const TILE_TONES: Record<string, string> = {
  subIn: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400',
  subOut: 'border-red-500/30 bg-red-500/10 text-red-500',
  yellowCards: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-400 [&>svg]:fill-current',
  redCards: 'border-red-500/30 bg-red-500/10 text-red-500 [&>svg]:fill-current',
};

// Ícone de cada quadro do scout geral (GAMES_KEY é o quadro "Jogos relacionados", a contagem de lançamentos)
export const GENERAL_ICONS: Record<string, LucideIcon> = {
  minutes: Timer,
  goals: Target,
  yellowCards: RectangleVertical,
  redCards: RectangleVertical,
  [GAMES_KEY]: CalendarDays,
  starter: Shirt,
  bench: Armchair,
  subIn: LogIn,
  subOut: LogOut,
};
// Scout técnico: quadros em destaque (ataque) e quadros pequenos (defesa e posse)
const TECH_HERO_KEYS = ['goalParticipations', 'assists', 'preAssists', 'shotsTotal'];
const TECH_TILE_KEYS = ['tackles', 'tacklesIncomplete', 'interceptions', 'ballLosses', 'dribbledPast', 'offsides'];

// Fundamentos: percentual de acerto (certos sobre o total) e as parcelas que formam o total
const OK_TONE = 'bg-primary';
const MISS_TONE = 'bg-white/25';
export const RATES = [
  { label: 'Ações', ok: 'actionsOk', total: 'actionsTotal', pct: 'actionsPct', parts: [{ key: 'actionsOk', label: 'Bem sucedidas', tone: OK_TONE }, { key: 'actionsBad', label: 'Mal sucedidas', tone: MISS_TONE }] },
  { label: 'Passes', ok: 'passesCompleted', total: 'passesTotal', pct: 'passesPct', parts: [{ key: 'passesCompleted', label: 'Certos', tone: OK_TONE }, { key: 'passesMissed', label: 'Errados', tone: MISS_TONE }] },
  { label: 'Passes longos', ok: 'longPassesCompleted', total: 'longPassesTotal', pct: 'longPassesPct', parts: [{ key: 'longPassesCompleted', label: 'Certos', tone: OK_TONE }, { key: 'longPassesMissed', label: 'Errados', tone: MISS_TONE }] },
  { label: 'Finalizações', ok: 'shotsOnTarget', total: 'shotsTotal', pct: 'shotsPct', parts: [{ key: 'shotsOnTarget', label: 'Certas', tone: OK_TONE }, { key: 'shotsOff', label: 'Fora', tone: 'bg-white/45' }, { key: 'shotsBlocked', label: 'Bloqueadas', tone: 'bg-white/20' }] },
  { label: 'Cruzamentos', ok: 'crossesCompleted', total: 'crossesTotal', pct: 'crossesPct', parts: [{ key: 'crossesCompleted', label: 'Certos', tone: OK_TONE }, { key: 'crossesMissed', label: 'Errados', tone: MISS_TONE }] },
  { label: 'Dribles', ok: 'dribblesCompleted', total: 'dribblesTotal', pct: 'dribblesPct', parts: [{ key: 'dribblesCompleted', label: 'Certos', tone: OK_TONE }, { key: 'dribblesMissed', label: 'Errados', tone: MISS_TONE }] },
];

// Número usado no ranking de atletas
const RANKING_KEYS = ['minutes', 'goals', 'assists'];
const TECH_RANKING_KEYS = ['goalParticipations', 'assists', 'passesCompleted', 'shotsOnTarget', 'dribblesCompleted', 'tackles', 'interceptions'];
const RANKING_SIZE = 8;

// Comparativos do scout técnico: dois números que formam um par
export const TECH_SPLITS = [
  { title: 'Desarmes', left: 'tackles', right: 'tacklesIncomplete', leftLabel: 'Completos', rightLabel: 'Incompletos' },
  { title: 'Faltas', left: 'foulsSuffered', right: 'foulsCommitted', leftLabel: 'Sofridas', rightLabel: 'Cometidas' },
  { title: 'Duelo aéreo defensivo', left: 'aerialDefWon', right: 'aerialDefLost', leftLabel: 'Vencidos', rightLabel: 'Perdidos' },
  { title: 'Duelo aéreo ofensivo', left: 'aerialOffWon', right: 'aerialOffLost', leftLabel: 'Vencidos', rightLabel: 'Perdidos' },
];

// Gráficos por mês: os últimos meses com lançamento
const MONTHS_SHOWN = 8;
const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
// "2026-03" -> "mar/26"
const monthLabel = (key: string) => `${MONTH_NAMES[Number(key.slice(5)) - 1]}/${key.slice(2, 4)}`;
// Meses do gráfico "por mês" do scout geral, em janela corrida
const TREND_MONTHS = 6;
// "2026-03" deslocado em meses: shiftMonth("2026-03", -3) -> "2025-12"
const shiftMonth = (key: string, delta: number) => {
  const date = new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};


// Soma de cada número lançado; totais e percentuais são calculados sobre essa soma
const sumStats = (list: ScoutEntry[]) => {
  const totals: Record<string, number> = {};
  list.forEach((entry) => Object.entries(entry.stats).forEach(([key, value]) => { totals[key] = (totals[key] || 0) + Number(value); }));
  return totals;
};

const toggleClass = (on: boolean) =>
  `rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition ${on ? 'bg-primary text-background' : 'border border-white/10 text-on-surface-variant hover:bg-white/10 hover:text-white'}`;

// Radar do perfil técnico: um eixo por aproveitamento, todos de 0 a 100%
const RADAR = { width: 440, height: 270, cx: 220, cy: 135, radius: 85, labelRadius: 102 };
const radarPoint = (index: number, ratio: number, radius = RADAR.radius) => {
  const angle = ((-90 + index * (360 / RATES.length)) * Math.PI) / 180;
  return { x: RADAR.cx + Math.cos(angle) * radius * ratio, y: RADAR.cy + Math.sin(angle) * radius * ratio };
};
const radarPolygon = (ratios: number[]) => ratios.map((ratio, index) => { const p = radarPoint(index, ratio); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');

// values: aproveitamento dos lançamentos filtrados; reference: o de todos os atletas, para comparar quando há um atleta escolhido
export const RadarChart: React.FC<{ values: (number | undefined)[]; reference?: (number | undefined)[] }> = ({ values, reference }) => (
  <svg viewBox={`0 0 ${RADAR.width} ${RADAR.height}`} className="mx-auto w-full max-w-[440px]" role="img" aria-label="Radar de aproveitamento">
    {[0.25, 0.5, 0.75, 1].map((ring) => (
      <polygon key={ring} points={radarPolygon(RATES.map(() => ring))} fill="none" className={ring === 1 ? 'stroke-white/20' : 'stroke-white/10'} strokeWidth="1" />
    ))}
    {RATES.map((rate, index) => {
      const end = radarPoint(index, 1);
      return <line key={rate.pct} x1={RADAR.cx} y1={RADAR.cy} x2={end.x} y2={end.y} className="stroke-white/10" strokeWidth="1" />;
    })}
    {reference && (
      <polygon points={radarPolygon(reference.map((pct) => (pct || 0) / 100))} fill="none" className="stroke-white/50" strokeWidth="1.5" strokeDasharray="4 4" strokeLinejoin="round" />
    )}
    <polygon points={radarPolygon(values.map((pct) => (pct || 0) / 100))} className="fill-white/15 stroke-primary" strokeWidth="2" strokeLinejoin="round" />
    {values.map((pct, index) => {
      if (!pct) return null;
      const p = radarPoint(index, pct / 100);
      return <circle key={index} cx={p.x} cy={p.y} r="4" className="fill-primary stroke-surface-low" strokeWidth="2" />;
    })}
    {RATES.map((rate, index) => {
      const p = radarPoint(index, 1, RADAR.labelRadius);
      const side = Math.round(p.x - RADAR.cx);
      const anchor = side === 0 ? 'middle' : side > 0 ? 'start' : 'end';
      // Em cima e embaixo o texto fica fora do radar; nos lados, centralizado na altura do eixo
      const y = side === 0 ? (p.y < RADAR.cy ? p.y - 16 : p.y + 12) : p.y - 4;
      const pct = values[index];
      return (
        <text key={rate.pct} x={p.x} y={y} textAnchor={anchor}>
          <title>{`${rate.label}: ${pct === undefined ? 'sem lançamentos' : `${pct}%`}${reference ? ` · todos os atletas do filtro:${reference[index] === undefined ? '-' : `${reference[index]}%`}` : ''}`}</title>
          <tspan x={p.x} className="fill-on-surface-variant text-[11px] font-black uppercase">{rate.label}</tspan>
          <tspan x={p.x} dy="15" className="fill-white text-[14px] font-black">{pct === undefined ? '-' : `${pct}%`}</tspan>
        </text>
      );
    })}
  </svg>
);

const RING_RADIUS = 34;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

// Quadro que também é botão (número em destaque e anel de aproveitamento): o escolhido ganha o contorno branco e o ponto no canto
const pickClass = (on: boolean) => `${panelClass} relative transition hover:bg-white/[0.06] ${on ? 'ring-1 ring-white/60' : ''}`;
const PickDot = ({ on }: { on: boolean }) => (on ? <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-primary" /> : null);

// Título de cada parte do resumo, com um fio até a borda e, à direita, a dica do que os quadros fazem
const SectionHeader = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
    <h3 className="text-base font-black uppercase italic tracking-tight text-white">{title}</h3>
    <span className="h-px min-w-8 flex-1 bg-gradient-to-r from-white/20 to-transparent" />
    {hint && <p className="text-[10px] font-bold text-on-surface-variant">{hint}</p>}
  </div>
);

// Quadro de um fundamento do scout técnico: anel com o percentual de acerto, o total e a barra dividida em certos e errados.
// Clicar escolhe o fundamento do gráfico por mês
const RateCard: React.FC<{ rate: typeof RATES[number]; totals: Record<string, number>; selected: boolean; onSelect: () => void }> = ({ rate, totals, selected, onSelect }) => {
  const pct = scoutValue(fieldOf(rate.pct), totals);
  const total = scoutValue(fieldOf(rate.total), totals) || 0;
  const parts = rate.parts.map((part) => ({ ...part, value: totals[part.key] || 0 }));
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`${pickClass(selected)} block w-full overflow-hidden p-5 text-left`}
      title={`${rate.label}: ${parts.map((part) => `${part.value} ${part.label.toLowerCase()}`).join(', ')}${pct === undefined ? '' : ` (${pct}% de acerto)`}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <PickDot on={selected} />
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth="6" className="stroke-white/10" />
            {pct !== undefined && pct > 0 && (
              <circle
                cx="40"
                cy="40"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * RING_LENGTH} ${RING_LENGTH}`}
                className="stroke-primary transition-[stroke-dasharray] duration-500"
              />
            )}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">{pct === undefined ? '-' : `${pct}%`}</span>
        </div>
        <div className="min-w-0">
          <p className={labelClass}>{rate.label}</p>
          <p className="mt-2 text-4xl font-black italic leading-none tracking-tight text-white">{format(total)}</p>
          <p className="mt-1.5 text-[10px] font-bold text-on-surface-variant">{total > 0 ? 'no total' : 'Sem lançamentos'}</p>
        </div>
      </div>
      <div className="mt-5 flex h-2 gap-0.5">
        {total === 0
          ? <div className="h-full flex-1 rounded-full bg-white/10" />
          : parts.filter((part) => part.value > 0).map((part) => (
            <div key={part.key} className={`h-full rounded-full ${part.tone}`} style={{ flexGrow: part.value, flexBasis: 0 }} />
          ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-on-surface-variant">
        {parts.map((part) => (
          <span key={part.key} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${part.tone}`} />
            {part.label} <span className="font-black text-white">{format(part.value)}</span>
          </span>
        ))}
      </div>
    </button>
  );
};

// Resumo do scout com gráficos (aba "Scout"), sobre os lançamentos filtrados por atleta e competição.
// Preto e branco como o resto do app: branco é o valor, branco translúcido é o complemento
export const ScoutOverview = ({ entries, athletes }: { entries: ScoutEntry[]; athletes: Athlete[] }) => {
  const [athleteId, setAthleteId] = useState('');
  const [competition, setCompetition] = useState('');
  const [category, setCategory] = useState('');
  const [position, setPosition] = useState('');
  const [rankingKey, setRankingKey] = useState(RANKING_KEYS[0]);
  const [techRankingKey, setTechRankingKey] = useState(TECH_RANKING_KEYS[0]);
  // O scout técnico fica recolhido até o botão ser clicado
  const [showTechnical, setShowTechnical] = useState(false);
  // Número dos gráficos "Evolução por mês" e "Por competição", e aproveitamento do gráfico de linha
  const [trendKey, setTrendKey] = useState(HEADLINE_KEYS[0]);
  const [rateKey, setRateKey] = useState(RATES[1].pct);

  const athleteById = useMemo(() => new Map(athletes.map((athlete) => [athlete.id, athlete])), [athletes]);
  // Lançamento de atleta apagado não entra no resumo
  const valid = useMemo(() => entries.filter((entry) => athleteById.has(entry.athleteId)), [entries, athleteById]);

  // Categoria e posição vêm do cadastro do atleta de cada lançamento
  const matchesAthlete = (id: string, wantedCategory = category, wantedPosition = position) => {
    const athlete = athleteById.get(id);
    return Boolean(athlete) && (!wantedCategory || athlete!.category === wantedCategory) && (!wantedPosition || athlete!.position === wantedPosition);
  };

  // Atletas com lançamento, só os da categoria e da posição escolhidas
  const athleteOptions = useMemo(() => {
    const ids = [...new Set<string>(valid.map((entry) => entry.athleteId))];
    return ids
      .filter((id) => matchesAthlete(id))
      .map((id) => ({ value: id, label: fullName(athleteById.get(id)!) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [valid, athleteById, category, position]);
  // Opções de categoria e posição: as dos atletas que têm lançamento
  const athleteFieldOptions = (field: 'category' | 'position') =>
    [...new Set<string>(valid.map((entry) => athleteById.get(entry.athleteId)![field]).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
      .map((name) => ({ value: name, label: name }));
  const categoryOptions = useMemo(() => athleteFieldOptions('category'), [valid, athleteById]);
  const positionOptions = useMemo(() => athleteFieldOptions('position'), [valid, athleteById]);

  // Trocar a categoria ou a posição tira o atleta escolhido quando ele não é dela
  const pickCategory = (next: string) => {
    setCategory(next);
    if (athleteId && !matchesAthlete(athleteId, next, position)) setAthleteId('');
  };
  const pickPosition = (next: string) => {
    setPosition(next);
    if (athleteId && !matchesAthlete(athleteId, category, next)) setAthleteId('');
  };
  const competitionOptions = useMemo(
    () => [...new Set<string>(valid.map((entry) => entry.competition).filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name })),
    [valid],
  );

  // Lançamentos da competição, da categoria e da posição escolhidas, de todos os atletas
  const peers = valid.filter((entry) => (!competition || entry.competition === competition) && matchesAthlete(entry.athleteId));
  const filtered = peers.filter((entry) => !athleteId || entry.athleteId === athleteId);

  const totals = sumStats(filtered);
  const value = (key: string) => scoutValue(fieldOf(key), totals) || 0;

  // Evolução por mês: os lançamentos de cada mês somados (sem ano ou data reconhecível, o lançamento fica fora)
  const entriesByMonth = new Map<string, ScoutEntry[]>();
  filtered.forEach((entry) => {
    const key = scoutMonthKey(entry);
    if (key) entriesByMonth.set(key, [...(entriesByMonth.get(key) || []), entry]);
  });
  const months = [...entriesByMonth.keys()].sort().slice(-MONTHS_SHOWN).map((key) => ({ key, label: monthLabel(key), count: entriesByMonth.get(key)!.length, totals: sumStats(entriesByMonth.get(key)!) }));
  // O quadro "Jogos relacionados" não é um número lançado: conta os lançamentos
  const isGamesTrend = trendKey === GAMES_KEY;
  const trendLabel = isGamesTrend ? GAMES_LABEL : fieldOf(trendKey).label;
  // Gráfico por mês: janela corrida dos últimos TREND_MONTHS meses até o último mês com lançamento (mês sem lançamento entra com zero).
  // Com "Jogos relacionados" escolhido, a coluna é a quantidade de atletas relacionados no mês (cada atleta conta uma vez) e as convocações (um atleta numa partida) vão embaixo
  const trendMonths = months.length === 0 ? [] : Array.from({ length: TREND_MONTHS }, (_, index) => {
    const key = shiftMonth(months[months.length - 1].key, index - (TREND_MONTHS - 1));
    const list = entriesByMonth.get(key) || [];
    const athletesInMonth = new Set(list.map((entry) => entry.athleteId)).size;
    return { key, label: monthLabel(key), games: list.length, value: isGamesTrend ? athletesInMonth : scoutValue(fieldOf(trendKey), sumStats(list)) || 0 };
  });
  const trendMax = Math.max(...trendMonths.map((month) => month.value), 1);
  // No período, atleta relacionado em mais de um mês conta uma vez só
  const trendTotal = isGamesTrend
    ? new Set(trendMonths.flatMap((month) => (entriesByMonth.get(month.key) || []).map((entry) => entry.athleteId))).size
    : trendMonths.reduce((total, month) => total + month.value, 0);
  const trendBest = trendMonths.reduce<typeof trendMonths[number] | undefined>((best, month) => (month.value > (best?.value || 0) ? month : best), undefined);
  const trendLast = trendMonths[trendMonths.length - 1];
  const trendPrevious = trendMonths[trendMonths.length - 2];
  const trendDelta = trendLast && trendPrevious ? trendLast.value - trendPrevious.value : 0;
  const rate = RATES.find((item) => item.pct === rateKey)!;
  const ratePoints = months
    .map((month, index) => ({ label: month.label, x: months.length === 1 ? 50 : (index / (months.length - 1)) * 100, pct: scoutValue(fieldOf(rate.pct), month.totals) }))
    .filter((point): point is { label: string; x: number; pct: number } => point.pct !== undefined);

  // Titulares e reservas, por convocação (um atleta numa partida): titular é quem tem Titular marcado; reserva é quem não é titular
  // e tem Reserva ou Entrou marcado. Lançamento sem nenhuma dessas marcações fica fora
  const lineup = filtered.reduce((sum, { stats }) => {
    const starter = (stats.starter || 0) > 0;
    const reserve = !starter && ((stats.bench || 0) > 0 || (stats.subIn || 0) > 0);
    if (starter) {
      sum.starters += 1;
      if ((stats.subOut || 0) > 0) sum.startersOut += 1;
    } else if (reserve) {
      sum.reserves += 1;
      if ((stats.subIn || 0) > 0) sum.reservesIn += 1;
    }
    sum.called = sum.starters + sum.reserves;
    return sum;
  }, { called: 0, starters: 0, startersOut: 0, reserves: 0, reservesIn: 0 });
  const share = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);


  // Radar: aproveitamento dos lançamentos filtrados; com um atleta escolhido, compara com o de todos os atletas nos mesmos filtros
  const radarValues = RATES.map((item) => scoutValue(fieldOf(item.pct), totals));
  const referenceTotals = athleteId ? sumStats(peers) : undefined;
  const radarReference = referenceTotals && RATES.map((item) => scoutValue(fieldOf(item.pct), referenceTotals));

  const athleteCount = new Set(filtered.map((entry) => entry.athleteId)).size;

  // Lançamentos que têm algum número além dos da súmula (jogos com transmissão)
  const technicalCount = filtered.filter((entry) => Object.keys(entry.stats).some((key) => !SHEET_KEYS.has(key))).length;

  // Ranking: soma do número escolhido por atleta, do maior para o menor
  // untitled: sem o nome dentro do quadro, quando o título da parte já diz "Ranking dos atletas"
  const rankingPanel = (keys: string[], current: string, onPick: (key: string) => void, untitled = false) => {
    const byAthlete = new Map<string, number>();
    filtered.forEach((entry) => byAthlete.set(entry.athleteId, (byAthlete.get(entry.athleteId) || 0) + (entry.stats[current] || 0)));
    const ranking = [...byAthlete.entries()]
      .filter(([, total]) => total > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, RANKING_SIZE)
      .map(([id, total]) => ({ athlete: athleteById.get(id)!, total }));
    const rankingMax = ranking[0]?.total || 1;
    return (
      <div className={`${panelClass} min-w-0 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!untitled && <p className={labelClass}>Ranking de atletas</p>}
          <div className="flex flex-wrap gap-1.5">
            {keys.map((key) => (
              <button key={key} type="button" onClick={() => onPick(key)} aria-pressed={current === key} className={toggleClass(current === key)}>
                {fieldOf(key).label}
              </button>
            ))}
          </div>
        </div>

        {ranking.length === 0 ? (
          <p className="mt-6 text-sm text-white/70">Nenhum atleta com {fieldOf(current).label.toLowerCase()} lançado.</p>
        ) : (
          <div className="mt-5 space-y-3.5">
            {ranking.map(({ athlete, total }, index) => (
              <div key={athlete.id} className="flex items-center gap-3" title={`${fullName(athlete)}: ${format(total)}`}>
                <span className="w-4 shrink-0 text-center text-[10px] font-black text-on-surface-variant">{index + 1}</span>
                <img src={athlete.image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-xs font-black uppercase italic text-white">{fullName(athlete)}</p>
                    <p className="shrink-0 text-sm font-black text-white">{format(total)}</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(total / rankingMax) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Comparativos: barras divididas em dois
  const splitsPanel = (splits: typeof TECH_SPLITS) => (
    <div className={`${panelClass} min-w-0 p-5`}>
      <p className={labelClass}>Comparativos</p>
      <div className="mt-5 space-y-5">
        {splits.map((split) => {
          const left = value(split.left);
          const right = value(split.right);
          const sum = left + right;
          return (
            <div key={split.title} title={`${split.title}: ${left} ${split.leftLabel.toLowerCase()}, ${right} ${split.rightLabel.toLowerCase()}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white">{split.title}</p>
              <div className="mt-2 flex h-2 gap-0.5">
                {sum === 0 ? (
                  <div className="h-full flex-1 rounded-full bg-white/10" />
                ) : (
                  <>
                    {left > 0 && <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(left / sum) * 100}%` }} />}
                    {right > 0 && <div className="h-full flex-1 rounded-full bg-white/25" />}
                  </>
                )}
              </div>
              <div className="mt-2 flex justify-between gap-3 text-[10px] font-bold text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />{split.leftLabel} <span className="font-black text-white">{format(left)}</span></span>
                <span className="inline-flex items-center gap-1.5"><span className="font-black text-white">{format(right)}</span> {split.rightLabel}<span className="h-2 w-2 rounded-full bg-white/25" /></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Quadros pequenos de número
  const tiles = (items: { label: string; text: string }[], columns: string) => (
    <div className={`grid grid-cols-2 gap-3 ${columns}`}>
      {items.map((item) => (
        <div key={item.label} className={`${panelClass} px-3 py-4 text-center`}>
          <p className="text-2xl font-black leading-none text-white">{item.text}</p>
          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">{item.label}</p>
        </div>
      ))}
    </div>
  );
  const fieldTile = (key: string) => ({ label: fieldOf(key).label, text: formatScoutValue(fieldOf(key), totals) || '0' });

  // Botão que troca a súmula pela tela do scout técnico (só jogos com transmissão) e volta.
  // Na súmula fica abaixo de "Evolução"; na tela do scout técnico, no topo
  const technicalButton = (
          <button
            type="button"
            onClick={() => setShowTechnical((open) => !open)}
            className={`${panelClass} relative flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 overflow-hidden px-5 py-5 text-left transition hover:bg-white/[0.06] sm:px-6`}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="min-w-0">
              <p className="text-base font-black uppercase italic tracking-tight text-white">Scout técnico</p>
              <p className="mt-1 text-[10px] font-bold text-on-surface-variant">
                Jogos com transmissão · <span className="text-white">{technicalCount}</span> de <span className="text-white">{filtered.length}</span> {filtered.length === 1 ? 'lançamento' : 'lançamentos'}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-background">
              {showTechnical && <ArrowLeft className="h-3.5 w-3.5" />}
              {showTechnical ? 'Voltar para o scout geral' : 'Ver scout técnico'}
              {!showTechnical && <ArrowRight className="h-3.5 w-3.5" />}
            </span>
          </button>
  );

  if (valid.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Filtros numa linha só, acima dos gráficos */}
      <div className={`${panelClass} grid gap-3 p-4 sm:grid-cols-2 sm:items-end xl:grid-cols-[1.3fr_1.3fr_1fr_1fr_auto]`}>
        <div className="min-w-0">
          <p className={`${labelClass} mb-2`}>Atleta</p>
          <SheetSelect value={athleteId} options={athleteOptions} onChange={setAthleteId} label="Filtrar por atleta" placeholder="Todos os atletas" className={filterClass} />
        </div>
        <div className="min-w-0">
          <p className={`${labelClass} mb-2`}>Competição</p>
          <SheetSelect value={competition} options={competitionOptions} onChange={setCompetition} label="Filtrar por competição" placeholder="Todas as competições" className={filterClass} />
        </div>
        <div className="min-w-0">
          <p className={`${labelClass} mb-2`}>Categoria</p>
          <SheetSelect value={category} options={categoryOptions} onChange={pickCategory} label="Filtrar por categoria" placeholder="Todas as categorias" className={filterClass} />
        </div>
        <div className="min-w-0">
          <p className={`${labelClass} mb-2`}>Posição</p>
          <SheetSelect value={position} options={positionOptions} onChange={pickPosition} label="Filtrar por posição" placeholder="Todas as posições" className={filterClass} />
        </div>
        <p className={`${labelClass} pb-3 sm:col-span-2 sm:text-right xl:col-span-1`}>
          <span className="text-white">{filtered.length}</span> {filtered.length === 1 ? 'lançamento' : 'lançamentos'} · <span className="text-white">{athleteCount}</span> {athleteCount === 1 ? 'atleta' : 'atletas'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className={`${panelClass} p-8 text-center`}>
          <p className={labelClass}>Sem números</p>
          <p className="mt-2 text-sm text-white/70">Nenhum lançamento com esses filtros.</p>
        </div>
      ) : (
        <div className="space-y-10 pt-4">
          {showTechnical && technicalButton}

          {!showTechnical && (
          <>
          {/* 1. Scout geral: os quadros de número ficam em cima, antes dos gráficos. Os cinco em destaque escolhem o número dos gráficos de "Evolução" */}
          <div className="space-y-4">
          <SectionHeader title="Scout Geral" hint="Todos os jogos" />
          <div className="grid grid-cols-2 gap-3 max-sm:[&>*:first-child]:col-span-2 sm:grid-cols-3 xl:grid-cols-5">
            {HEADLINE_KEYS.map((key) => {
              const on = trendKey === key;
              const Icon = GENERAL_ICONS[key];
              const isGames = key === GAMES_KEY;
              const total = isGames ? filtered.length : value(key);
              const perGame = total / filtered.length;
              return (
                <button key={key} type="button" onClick={() => setTrendKey(key)} aria-pressed={on} className={`${pickClass(on)} overflow-hidden p-4 text-left sm:p-5`}>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                  <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/[0.07] blur-2xl" />
                  <Icon className="pointer-events-none absolute -bottom-5 -right-4 h-28 w-28 text-white/[0.04]" strokeWidth={1.5} />
                  <div className="relative flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${on ? 'border-primary bg-primary text-background shadow-[0_0_24px_rgba(255,255,255,0.25)]' : 'border-white/15 bg-white/[0.04] text-white'}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <p className={`${labelClass} ${on ? 'text-white' : ''}`}>{isGames ? GAMES_LABEL : fieldOf(key).label}</p>
                  </div>
                  <p className="relative mt-5 text-4xl font-black italic leading-none tracking-tight text-white sm:text-5xl">{format(total)}</p>
                  {/* Jogos relacionados não tem linha de baixo; o espaço é mantido para o número ficar na mesma altura dos outros */}
                  <p className={`relative mt-3 text-xs font-bold text-on-surface-variant sm:text-sm ${isGames ? 'invisible' : ''}`}>
                    {isGames ? (
                      '-'
                    ) : fieldOf(key).flag ? (
                      <><span className="font-black text-white">{Math.round(perGame * 100)}%</span> dos jogos</>
                    ) : (
                      <>Média de <span className="font-black text-white">{perGame.toLocaleString('pt-BR', { maximumFractionDigits: key === 'minutes' ? 0 : 2 })}</span> por jogo</>
                    )}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {SHEET_TILE_KEYS.map((key) => ({ key, label: fieldOf(key).label, total: value(key) })).map((item) => {
              const Icon = GENERAL_ICONS[item.key];
              const share = Math.round((item.total / filtered.length) * 100);
              return (
                <div key={item.key} className={`${panelClass} relative overflow-hidden p-4`} title={`${item.label}: ${item.total} em ${filtered.length} jogos`}>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${TILE_TONES[item.key] || 'border-white/15 bg-white/[0.04] text-white'}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-2xl font-black italic leading-none text-white">{format(item.total)}</p>
                      <p className="mt-1.5 truncate text-[9px] font-black uppercase tracking-[0.16em] text-on-surface-variant">{item.label}</p>
                    </div>
                    <p className="ml-auto shrink-0 text-right text-[10px] font-black text-white/70">{share}%</p>
                  </div>
                  <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.min(share, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          </div>

          {/* 2. Evolução: gráficos do número escolhido nos quadros em destaque */}
          <div className="space-y-4">
          <SectionHeader title="Evolução" />
          <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
            <div className={`${panelClass} relative min-w-0 overflow-hidden p-5 sm:p-6`}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <p className={labelClass}>{isGamesTrend ? 'Atletas relacionados por mês' : `${trendLabel} por mês`}</p>
              {trendMonths.length === 0 ? (
                <p className="mt-6 text-sm text-white/70">Nenhum lançamento com ano e data da partida reconhecíveis.</p>
              ) : (
                <>
                  {/* Resumo do período, acima das colunas */}
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:px-4">
                      <p className="text-2xl font-black italic leading-none text-white sm:text-3xl">{format(trendTotal)}</p>
                      <p className="mt-2 truncate text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">{isGamesTrend ? `Atletas em ${TREND_MONTHS} meses` : `Últimos ${TREND_MONTHS} meses`}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:px-4">
                      <p className="text-2xl font-black italic leading-none text-white sm:text-3xl">{trendBest ? format(trendBest.value) : '-'}</p>
                      <p className="mt-2 truncate text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">Melhor mês{trendBest ? ` · ${trendBest.label}` : ''}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:px-4">
                      <p className="flex items-center gap-1.5 text-2xl font-black italic leading-none text-white sm:text-3xl">
                        {trendDelta > 0 ? <TrendingUp className="h-5 w-5 shrink-0 text-emerald-400" /> : trendDelta < 0 ? <TrendingDown className="h-5 w-5 shrink-0 text-red-500" /> : null}
                        {trendDelta > 0 ? '+' : ''}{format(trendDelta)}
                      </p>
                      <p className="mt-2 truncate text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">{trendLast.label} x {trendPrevious.label}</p>
                    </div>
                  </div>

                  <div className={`relative mt-6 flex ${isGamesTrend ? 'h-56' : 'h-52'} gap-2 sm:gap-4`}>
                    {/* Linhas de referência atrás das colunas */}
                    <div className={`pointer-events-none absolute inset-x-0 top-5 ${isGamesTrend ? 'bottom-10' : 'bottom-6'}`}>
                      {[0, 50, 100].map((mark) => <div key={mark} className="absolute inset-x-0 border-t border-dashed border-white/[0.07]" style={{ top: `${mark}%` }} />)}
                    </div>
                    {trendMonths.map((month) => {
                      const isBest = month === trendBest;
                      return (
                        <div key={month.key} className="group relative flex min-w-0 flex-1 flex-col items-center" title={isGamesTrend ? `${month.label}: ${month.value} ${month.value === 1 ? 'atleta relacionado' : 'atletas relacionados'} em ${month.games} ${month.games === 1 ? 'convocação' : 'convocações'}` : `${month.label}: ${format(month.value)} (${trendLabel}) · ${month.games} ${month.games === 1 ? 'jogo' : 'jogos'}`}>
                          <div className="flex w-full flex-1 flex-col items-center justify-end border-b border-white/15">
                            <span className={`mb-1.5 text-xs font-black leading-none ${month.value > 0 ? 'text-white' : 'text-white/25'}`}>{format(month.value)}</span>
                            <div
                              className={`w-full max-w-14 rounded-t-lg transition-[height] duration-500 ${isBest ? 'bg-gradient-to-t from-white/70 to-white shadow-[0_0_28px_rgba(255,255,255,0.18)]' : 'bg-gradient-to-t from-white/15 to-white/45 group-hover:to-white/70'}`}
                              style={{ height: `calc((100% - 1.25rem) * ${month.value / trendMax})`, minHeight: month.value > 0 ? 3 : 0 }}
                            />
                          </div>
                          <span className={`mt-2 truncate text-[9px] font-black uppercase tracking-[0.1em] ${isBest ? 'text-white' : 'text-on-surface-variant'}`}>{month.label}</span>
                          {isGamesTrend && <span className="mt-1 truncate text-[9px] font-bold leading-none text-on-surface-variant">{month.games} conv.</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Titulares e reservas: de cada convocação, quem começou jogando e quem ficou no banco; dos titulares, quantos saem;
                dos reservas, quantos entram e quantos não entram. Não segue o quadro em destaque escolhido */}
            <div className={`${panelClass} relative min-w-0 overflow-hidden p-5 sm:p-6`}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <div className="flex items-center justify-between gap-3">
                <p className={labelClass}>Titulares e reservas</p>
                <p className={`${labelClass} shrink-0`}><span className="text-white">{lineup.called}</span> {lineup.called === 1 ? 'convocação' : 'convocações'}</p>
              </div>
              {lineup.called === 0 ? (
                <p className="mt-6 text-sm text-white/70">Nenhum lançamento com Titular, Reserva ou Entrou marcado.</p>
              ) : (
                <>
                  <div className="mt-5 flex h-4 gap-1" title={`${lineup.starters} como titular, ${lineup.reserves} como reserva`}>
                    {lineup.starters > 0 && <div className="h-full rounded-full bg-gradient-to-r from-zinc-300 to-white shadow-[0_0_18px_rgba(255,255,255,0.25)] transition-[flex-grow] duration-500" style={{ flexGrow: lineup.starters, flexBasis: 0 }} />}
                    {lineup.reserves > 0 && <div className="h-full rounded-full bg-gradient-to-r from-zinc-600 to-zinc-400 transition-[flex-grow] duration-500" style={{ flexGrow: lineup.reserves, flexBasis: 0 }} />}
                  </div>
                  <div className="mt-3 flex justify-between gap-3">
                    <div>
                      <p className="text-3xl font-black italic leading-none text-white">{share(lineup.starters, lineup.called)}%</p>
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant"><span className="h-2 w-2 rounded-full bg-primary" />Titular <span className="font-black text-white">{format(lineup.starters)}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black italic leading-none text-zinc-400">{share(lineup.reserves, lineup.called)}%</p>
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant"><span className="font-black text-white">{format(lineup.reserves)}</span> Reserva<span className="h-2 w-2 rounded-full bg-zinc-400" /></p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    {[
                      { title: 'Titulares que saem', tone: 'stroke-primary', dot: 'bg-primary', pct: lineup.starters ? share(lineup.startersOut, lineup.starters) : undefined, lines: [['Saíram', lineup.startersOut], ['Jogaram até o fim', lineup.starters - lineup.startersOut]] },
                      { title: 'Reservas que entram', tone: 'stroke-zinc-400', dot: 'bg-zinc-400', pct: lineup.reserves ? share(lineup.reservesIn, lineup.reserves) : undefined, lines: [['Entraram', lineup.reservesIn], ['Não entraram', lineup.reserves - lineup.reservesIn]] },
                    ].map((row) => (
                      <div key={row.title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                        <div className="relative h-16 w-16 shrink-0">
                          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
                            <circle cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth="7" className="stroke-white/10" />
                            {row.pct !== undefined && row.pct > 0 && (
                              <circle cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(row.pct / 100) * RING_LENGTH} ${RING_LENGTH}`} className={`${row.tone} transition-[stroke-dasharray] duration-500`} />
                            )}
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">{row.pct === undefined ? '-' : `${row.pct}%`}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white">{row.title}</p>
                          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-on-surface-variant">
                            {row.lines.map(([label, total], index) => <span key={label} className="inline-flex items-center gap-1.5">{index === 0 && <span className={`h-2 w-2 rounded-full ${row.dot}`} />}{label} <span className="font-black text-white">{format(Number(total))}</span></span>)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          </div>

          {technicalButton}

          {/* 3. Ranking dos atletas, ainda só com números do scout geral */}
          <div className="space-y-4">
            <SectionHeader title="Ranking dos atletas" />
            {rankingPanel(RANKING_KEYS, rankingKey, setRankingKey, true)}
          </div>

          </>
          )}

          {showTechnical && technicalCount === 0 && (
            <div className={`${panelClass} p-8 text-center`}>
              <p className={labelClass}>Sem scout técnico</p>
              <p className="mt-2 text-sm text-white/70">Nenhum lançamento com números de scout técnico nesses filtros.</p>
            </div>
          )}

          {showTechnical && technicalCount > 0 && (
          <>
          {/* Scout técnico: primeiro os quadros de número (ataque, defesa e posse), depois os fundamentos e os gráficos */}
          <div className="space-y-4">
            <SectionHeader title="Ataque" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {TECH_HERO_KEYS.map((key) => (
                <div key={key} className={`${panelClass} relative overflow-hidden px-5 py-6`}>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  <p className={labelClass}>{fieldOf(key).label}</p>
                  <p className="mt-3 text-4xl font-black italic leading-none tracking-tight text-white sm:text-5xl">{format(value(key))}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeader title="Defesa e posse" />
            {tiles(TECH_TILE_KEYS.map(fieldTile), 'sm:grid-cols-3 xl:grid-cols-6')}
          </div>

          {/* Fundamentos: um quadro por fundamento, com o total, o percentual de acerto e a divisão em certos e errados. Clicar escolhe o do gráfico por mês */}
          <div className="space-y-4">
            <SectionHeader title="Fundamentos" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {RATES.map((item) => (
                <RateCard key={item.pct} rate={item} totals={totals} selected={rateKey === item.pct} onSelect={() => setRateKey(item.pct)} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
          <SectionHeader title="Perfil técnico" />

          <div className="grid gap-3 xl:grid-cols-[2fr_3fr]">
            <div className={`${panelClass} min-w-0 p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={labelClass}>Aproveitamento por fundamento</p>
                {radarReference && (
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-on-surface-variant">
                    <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full bg-primary" />Atleta</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-white/60" />Todos os atletas</span>
                  </p>
                )}
              </div>
              <div className="mt-3">
                <RadarChart values={radarValues} reference={radarReference} />
              </div>
            </div>

            <div className={`${panelClass} min-w-0 p-5`}>
              <p className={labelClass}>{rate.label} por mês · % de acerto</p>
              {ratePoints.length === 0 ? (
                <p className="mt-6 text-sm text-white/70">Nenhum mês com {rate.label.toLowerCase()} lançados.</p>
              ) : (
                <div className="mt-9 pl-8 pr-5">
                  <div className="relative h-40">
                    {[100, 50, 0].map((mark) => (
                      <div key={mark} className="absolute inset-x-0 border-t border-white/10" style={{ top: `${100 - mark}%` }}>
                        <span className="absolute -left-8 -top-1.5 w-6 text-right text-[9px] font-bold leading-none text-on-surface-variant">{mark}%</span>
                      </div>
                    ))}
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                      <polyline
                        points={ratePoints.map((point) => `${point.x},${100 - point.pct}`).join(' ')}
                        fill="none"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        className="stroke-primary"
                      />
                    </svg>
                    {ratePoints.map((point) => (
                      <div key={point.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${point.x}%`, top: `${100 - point.pct}%` }} title={`${point.label}: ${point.pct}% (${rate.label})`}>
                        <span className="block h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface-low" />
                        <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 text-[10px] font-black leading-none text-white">{point.pct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="relative mt-2 h-4">
                    {months.map((month, index) => (
                      <span
                        key={month.key}
                        className="absolute -translate-x-1/2 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.1em] text-on-surface-variant"
                        style={{ left: `${months.length === 1 ? 50 : (index / (months.length - 1)) * 100}%` }}
                      >
                        {month.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          <div className="space-y-4">
            <SectionHeader title="Atletas e duelos" />
            <div className="grid gap-3 xl:grid-cols-2">
              {rankingPanel(TECH_RANKING_KEYS, techRankingKey, setTechRankingKey)}
              {splitsPanel(TECH_SPLITS)}
            </div>
          </div>
          </>
          )}
        </div>
      )}
    </section>
  );
};
