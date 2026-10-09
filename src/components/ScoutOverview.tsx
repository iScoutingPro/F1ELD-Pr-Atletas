import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Armchair, ArrowLeft, ArrowRight, CalendarDays, Shield, Swords, LogIn, LogOut, LucideIcon, RectangleVertical, Shirt, Target, Timer, TrendingDown, TrendingUp } from 'lucide-react';
import { Athlete, ScoutEntry } from '../types';
import { SCOUT_FIELDS, scoutMonthKey, scoutValue } from '../scout';
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

// Fundamentos: percentual de acerto (certos sobre o total) e as parcelas que formam o total

// Número usado no ranking de atletas
const RANKING_KEYS = ['minutes', 'goals', 'assists'];
const RANKING_SIZE = 8;

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

// Radar do perfil técnico: um eixo por linha do perfil, todos de 0 a 100% do raio
const RADAR = { width: 540, height: 310, cx: 270, cy: 155, radius: 105, labelRadius: 122 };
// Eixo do radar: label, o texto mostrado embaixo dele, quanto do raio ocupa (0 a 100; undefined = sem lançamentos) e o mesmo para a comparação
export interface RadarAxis { label: string; text: string; value?: number; reference?: number; title: string }

// axes: uma ponta por eixo; compare: desenha a linha tracejada de todos os atletas (quando há um atleta escolhido)
export const RadarChart: React.FC<{ axes: RadarAxis[]; compare?: boolean }> = ({ axes, compare }) => {
  const radarPoint = (index: number, ratio: number, radius = RADAR.radius) => {
    const angle = ((-90 + index * (360 / axes.length)) * Math.PI) / 180;
    return { x: RADAR.cx + Math.cos(angle) * radius * ratio, y: RADAR.cy + Math.sin(angle) * radius * ratio };
  };
  const radarPolygon = (ratios: number[]) => ratios.map((ratio, index) => { const p = radarPoint(index, ratio); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
  const values = axes.map((axis) => axis.value);
  return (
  <svg viewBox={`0 0 ${RADAR.width} ${RADAR.height}`} className="mx-auto w-full max-w-[580px]" role="img" aria-label="Radar do perfil técnico">
    {[0.25, 0.5, 0.75, 1].map((ring) => (
      <polygon key={ring} points={radarPolygon(axes.map(() => ring))} className={ring === 1 ? 'fill-white/[0.03] stroke-white/25' : 'fill-none stroke-white/10'} strokeWidth="1" />
    ))}
    {axes.map((axis, index) => {
      const end = radarPoint(index, 1);
      return <line key={axis.label} x1={RADAR.cx} y1={RADAR.cy} x2={end.x} y2={end.y} className="stroke-white/10" strokeWidth="1" />;
    })}
    {compare && (
      <polygon points={radarPolygon(axes.map((axis) => (axis.reference || 0) / 100))} fill="none" className="stroke-white/50" strokeWidth="1.5" strokeDasharray="4 4" strokeLinejoin="round" />
    )}
    <defs>
      <radialGradient id="radar-fill" gradientUnits="userSpaceOnUse" cx={RADAR.cx} cy={RADAR.cy} r={RADAR.radius}>
        <stop offset="0%" stopColor="white" stopOpacity="0.05" />
        <stop offset="100%" stopColor="white" stopOpacity="0.38" />
      </radialGradient>
    </defs>
    <polygon points={radarPolygon(values.map((pct) => (pct || 0) / 100))} fill="url(#radar-fill)" className="stroke-primary drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" strokeWidth="2" strokeLinejoin="round" />
    {values.map((pct, index) => {
      if (!pct) return null;
      const p = radarPoint(index, pct / 100);
      return <circle key={index} cx={p.x} cy={p.y} r="4" className="fill-primary stroke-surface-low" strokeWidth="2" />;
    })}
    {axes.map((axis, index) => {
      const p = radarPoint(index, 1, RADAR.labelRadius);
      const side = Math.round(p.x - RADAR.cx);
      const anchor = side === 0 ? 'middle' : side > 0 ? 'start' : 'end';
      // Em cima e embaixo o texto fica fora do radar; nos lados, centralizado na altura do eixo
      const y = side === 0 ? (p.y < RADAR.cy ? p.y - 16 : p.y + 12) : p.y - 4;
      return (
        <text key={axis.label} x={p.x} y={y} textAnchor={anchor}>
          <title>{axis.title}</title>
          <tspan x={p.x} className="fill-on-surface-variant text-[11px] font-black uppercase">{axis.label}</tspan>
          <tspan x={p.x} dy="15" className="fill-white text-[14px] font-black">{axis.text}</tspan>
        </text>
      );
    })}
  </svg>
  );
};

const RING_RADIUS = 34;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

// Quadro que também é botão (número em destaque e anel de aproveitamento): o escolhido ganha o contorno branco e o ponto no canto
const pickClass = (on: boolean) => `${panelClass} relative transition hover:bg-white/[0.06] ${on ? 'ring-1 ring-white/60' : ''}`;

// Título de cada parte do resumo, com um fio até a borda e, à direita, a dica do que os quadros fazem
const SectionHeader = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
    <h3 className="text-base font-black uppercase italic tracking-tight text-white">{title}</h3>
    <span className="h-px min-w-8 flex-1 bg-gradient-to-r from-white/20 to-transparent" />
    {hint && <p className="text-[10px] font-bold text-on-surface-variant">{hint}</p>}
  </div>
);

const topLineClass = 'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent';

// Scout técnico do perfil, dividido pelo usuário em ações gerais, ofensivas e defensivas.
// pairs: quadros com anel (o primeiro número é o acerto; "miss" pode somar mais de um número, como finalizações fora e bloqueadas);
// tiles: números soltos
interface Pair { title: string; ok: string; okLabel: string; miss: string[]; missLabel: string }
const GENERAL_TILES = [
  { key: 'assists', label: 'Assistência' },
  { key: 'preAssists', label: 'Pré Assistência' },
  { key: 'actionsOk', label: 'Ações bem sucedidas' },
  { key: 'actionsBad', label: 'Ações mal sucedidas' },
];
const OFFENSIVE_PAIRS: Pair[] = [
  { title: 'Passes totais', ok: 'passesCompleted', okLabel: 'Passes certos', miss: ['passesMissed'], missLabel: 'Passes errados' },
  { title: 'Passes longos totais', ok: 'longPassesCompleted', okLabel: 'Passes longos certos', miss: ['longPassesMissed'], missLabel: 'Passes longos errados' },
  { title: 'Finalizações totais', ok: 'shotsOnTarget', okLabel: 'Finalizações certas', miss: ['shotsOff', 'shotsBlocked'], missLabel: 'Finalizações erradas' },
  { title: 'Cruzamentos totais', ok: 'crossesCompleted', okLabel: 'Cruzamentos certos', miss: ['crossesMissed'], missLabel: 'Cruzamentos errados' },
  { title: 'Dribles totais', ok: 'dribblesCompleted', okLabel: 'Dribles certos', miss: ['dribblesMissed'], missLabel: 'Dribles errados' },
  { title: 'Duelos aéreos ofensivos', ok: 'aerialOffWon', okLabel: 'Vencidos', miss: ['aerialOffLost'], missLabel: 'Perdidos' },
];
const OFFENSIVE_TILES = ['ballLosses', 'foulsSuffered', 'offsides'];
const DEFENSIVE_PAIRS: Pair[] = [
  { title: 'Desarmes totais', ok: 'tackles', okLabel: 'Desarmes completos', miss: ['tacklesIncomplete'], missLabel: 'Desarmes incompletos' },
  { title: 'Duelos aéreos defensivos', ok: 'aerialDefWon', okLabel: 'Vencidos', miss: ['aerialDefLost'], missLabel: 'Perdidos' },
];
const DEFENSIVE_TILES = ['dribbledPast', 'interceptions', 'foulsCommitted'];

// Barras de certo e errado do scout técnico do perfil: verde para o certo e vermelho para o errado, a pedido do usuário
const OK_BAR = 'bg-gradient-to-r from-emerald-500 to-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.35)]';
const MISS_BAR = 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_14px_rgba(239,68,68,0.25)]';


// Quadro com anel do percentual de acerto, o total e a barra dividida em certos e errados
const PairCard: React.FC<{ pair: Pair; totals: Record<string, number> }> = ({ pair, totals }) => {
  const ok = totals[pair.ok] || 0;
  const miss = pair.miss.reduce((sum, key) => sum + (totals[key] || 0), 0);
  const total = ok + miss;
  const pct = total ? Math.round((ok / total) * 100) : undefined;
  const parts = [{ label: pair.okLabel, value: ok, tone: OK_BAR, dot: 'bg-emerald-400' }, { label: pair.missLabel, value: miss, tone: MISS_BAR, dot: 'bg-red-500' }];
  return (
    <div className={`${panelClass} relative overflow-hidden p-5`}>
      <div className={topLineClass} />
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth="6" className="stroke-white/10" />
            {pct !== undefined && pct > 0 && (
              <circle cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(pct / 100) * RING_LENGTH} ${RING_LENGTH}`} className="stroke-primary" />
            )}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">{pct === undefined ? '-' : `${pct}%`}</span>
        </div>
        <div className="min-w-0">
          <p className={labelClass}>{pair.title}</p>
          <p className="mt-2 text-4xl font-black italic leading-none tracking-tight text-white">{format(total)}</p>
        </div>
      </div>
      <div className="mt-5 flex h-2 gap-0.5">
        {total === 0
          ? <div className="h-full flex-1 rounded-full bg-white/10" />
          : parts.filter((part) => part.value > 0).map((part) => (
            <div key={part.label} className={`h-full rounded-full ${part.tone}`} style={{ flexGrow: part.value, flexBasis: 0 }} />
          ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-on-surface-variant">
        {parts.map((part) => (
          <span key={part.label} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${part.dot}`} />
            {part.label} <span className="font-black text-white">{format(part.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

// Quadro de um número solto do scout técnico
const NumberTile: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className={`${panelClass} relative flex flex-col justify-center overflow-hidden px-4 py-5 sm:px-5`}>
    <div className={topLineClass} />
    <p className={labelClass}>{label}</p>
    <p className="mt-3 text-4xl font-black italic leading-none tracking-tight text-white">{format(value)}</p>
  </div>
);

// Nome curto de cada aproveitamento no perfil técnico (pela chave do acerto)
const PROFILE_LABELS: Record<string, string> = {
  passesCompleted: 'Passes', longPassesCompleted: 'Passes longos', shotsOnTarget: 'Finalizações', crossesCompleted: 'Cruzamentos',
  dribblesCompleted: 'Dribles', aerialOffWon: 'Duelos Aéreos Ofe', tackles: 'Desarmes', aerialDefWon: 'Duelos Aéreos Def',
};
const [TACKLES_PAIR, AERIAL_DEF_PAIR] = DEFENSIVE_PAIRS;
// O que o perfil técnico mostra em cada visualização, ditado pelo usuário: a lista ao lado traz os aproveitamentos (pairs)
// e os números soltos (counts), nesta ordem; o radar traz só os mais importantes (radar, pela chave do acerto ou do número).
// Em "gerais" a ordem da lista põe Desarmes antes dos duelos aéreos, e o radar junta os três do ataque e os três da defesa (escolha nossa)
const PROFILE_VIEWS: Record<BlockView, { pairs: Pair[]; counts: string[]; radar: string[] }> = {
  general: {
    pairs: [...OFFENSIVE_PAIRS.slice(0, 5), TACKLES_PAIR, OFFENSIVE_PAIRS[5], AERIAL_DEF_PAIR],
    counts: ['interceptions', 'dribbledPast'],
    radar: ['passesCompleted', 'shotsOnTarget', 'dribblesCompleted', 'tackles', 'interceptions', 'dribbledPast'],
  },
  // Nas ações ofensivas e defensivas o radar mostra tudo (radar vazio = todas as linhas): o corte vale só para as gerais, a pedido do usuário
  offensive: { pairs: OFFENSIVE_PAIRS, counts: [], radar: [] },
  defensive: { pairs: DEFENSIVE_PAIRS, counts: ['interceptions', 'dribbledPast', 'foulsCommitted'], radar: [] },
};
const pairRate = (pair: Pair, totals: Record<string, number>) => {
  const ok = totals[pair.ok] || 0;
  const total = ok + pair.miss.reduce((sum, key) => sum + (totals[key] || 0), 0);
  return { ok, total, pct: total ? Math.round((ok / total) * 100) : undefined };
};

// Perfil técnico, igual no perfil do atleta e na aba Scout: à esquerda os botões de visualização (gerais, ofensivas e defensivas),
// que trocam só o que este painel mostra; no meio o radar e, à direita, o ponto forte, o ponto a evoluir e uma linha por
// fundamento (acertos sobre o total e a barra do percentual).
// reference: soma de todos os atletas nos mesmos filtros, para comparar quando há um atleta escolhido (linha tracejada e risco na barra)
export const TechnicalProfile: React.FC<{ totals: Record<string, number>; reference?: Record<string, number> }> = ({ totals, reference }) => {
  const [view, setView] = useState<BlockView>('general');
  const { pairs, counts, radar } = PROFILE_VIEWS[view];
  // Número solto não tem percentual: no radar e na barra vale a proporção sobre o maior deles
  const maxCount = Math.max(1, ...counts.map((key) => totals[key] || 0));
  const rows: { key: string; label: string; pct?: number; ok: number; total: number; referencePct?: number; count?: number }[] = [
    ...pairs.map((pair) => ({ key: pair.ok, label: PROFILE_LABELS[pair.ok], ...pairRate(pair, totals), referencePct: reference && pairRate(pair, reference).pct })),
    ...counts.map((key) => ({ key, label: fieldOf(key).label, ok: 0, total: 0, count: totals[key] || 0 })),
  ];
  // O radar mostra só as linhas mais importantes da visualização; a lista ao lado mostra todas
  const axes: RadarAxis[] = (radar.length ? radar.map((key) => rows.find((row) => row.key === key)!) : rows).map((row) => row.count !== undefined
    ? { label: row.label, text: format(row.count), value: (row.count / maxCount) * 100, title: `${row.label}: ${format(row.count)}` }
    : {
      label: row.label,
      text: row.pct === undefined ? '-' : `${row.pct}%`,
      value: row.pct,
      reference: row.referencePct,
      title: `${row.label}: ${row.pct === undefined ? 'sem lançamentos' : `${row.pct}%`}${reference ? ` · todos os atletas do filtro: ${row.referencePct === undefined ? '-' : `${row.referencePct}%`}` : ''}`,
    });
  const rated = rows.filter((row) => row.pct !== undefined);
  const best = rated.reduce<typeof rows[number] | undefined>((top, row) => (!top || row.pct! > top.pct! ? row : top), undefined);
  const worst = rated.reduce<typeof rows[number] | undefined>((low, row) => (!low || row.pct! < low.pct! ? row : low), undefined);
  // Com um fundamento só não há o que comparar
  const highlights = rated.length > 1 && best && worst ? [{ title: 'Ponto forte', row: best, strong: true }, { title: 'A evoluir', row: worst, strong: false }] : [];
  return (
    <div className={`${panelClass} relative overflow-hidden`}>
      <div className={topLineClass} />
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/[0.06] blur-3xl" />
      {/* Radar em cima, na largura toda, e as informações embaixo, a pedido do usuário (antes ficavam lado a lado) */}
      <div className="relative">
        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          {/* Botões de visualização em cima do radar, um ao lado do outro */}
          <BlockViewButtons view={view} onChange={setView} />
          <div className="flex min-w-0 flex-1 flex-col justify-center pt-4">
          {reference && (
            <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full bg-primary" />Atleta</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-white/60" />Todos os atletas</span>
            </p>
          )}
          <RadarChart axes={axes} compare={Boolean(reference)} />
          </div>
        </div>

        <div className="min-w-0 border-t border-white/10 p-5 sm:p-6">
          {highlights.length > 0 && (
            <div className="mb-5 grid grid-cols-2 gap-3">
              {highlights.map(({ title, row, strong }) => (
                <div key={title} className={`flex min-w-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${strong ? 'border-white/25 bg-white/[0.07] shadow-[0_0_28px_rgba(255,255,255,0.06)]' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">{title}</p>
                    <p className="mt-1.5 truncate text-xs font-black uppercase tracking-[0.12em] text-white">{row.label}</p>
                  </div>
                  <p className={`shrink-0 text-3xl font-black italic leading-none tracking-tight ${strong ? 'text-white' : 'text-zinc-400'}`}>{row.pct}%</p>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
            {rows.map((row) => {
              // Largura da barra: o percentual, ou, no número solto, a proporção sobre o maior deles
              const width = row.count !== undefined ? (row.count / maxCount) * 100 : row.pct;
              return (
              <div key={row.label} title={row.count !== undefined ? `${row.label}: ${format(row.count)}` : row.pct === undefined ? `${row.label}: sem lançamentos` : `${row.label}: ${row.ok} de ${row.total} (${row.pct}%)${row.referencePct === undefined ? '' : ` · todos os atletas do filtro: ${row.referencePct}%`}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-white">{row.label}</p>
                  <p className="shrink-0 text-xs font-bold text-on-surface-variant">
                    {row.count !== undefined
                      ? <span className="font-black text-white">{format(row.count)}</span>
                      : row.pct === undefined ? '-' : <><span className="font-black text-white">{format(row.ok)}</span> de {format(row.total)}</>}
                  </p>
                </div>
                <div className="relative mt-1.5 h-1.5 rounded-full bg-white/10">
                  {width !== undefined && width > 0 && (
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${row === best ? 'bg-gradient-to-r from-zinc-300 to-white shadow-[0_0_14px_rgba(255,255,255,0.3)]' : 'bg-gradient-to-r from-zinc-600 to-zinc-300'}`}
                      style={{ width: `${Math.min(width, 100)}%` }}
                    />
                  )}
                  {row.referencePct !== undefined && (
                    <span className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-white/70" style={{ left: `${Math.min(row.referencePct, 100)}%` }} />
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Visualização do perfil técnico (radar e lista ao lado), escolhida nos botões à esquerda do radar
type BlockView = 'general' | 'offensive' | 'defensive';
const BLOCK_VIEWS: { key: BlockView; label: string; icon: LucideIcon }[] = [
  { key: 'general', label: 'Ações gerais', icon: Activity },
  { key: 'offensive', label: 'Ações ofensivas', icon: Swords },
  { key: 'defensive', label: 'Ações defensivas', icon: Shield },
];

// Botões de visualização do perfil técnico, em linha, em cima do radar
const BlockViewButtons: React.FC<{ view: BlockView; onChange: (view: BlockView) => void }> = ({ view, onChange }) => (
  <div className="grid grid-cols-3 gap-1.5">
    {BLOCK_VIEWS.map(({ key, label, icon: Icon }) => (
      <button
        key={key}
        type="button"
        onClick={() => onChange(key)}
        aria-pressed={view === key}
        className={`flex items-center gap-2.5 rounded-2xl px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] transition max-sm:flex-col max-sm:px-1.5 max-sm:text-center max-sm:text-[8px] ${view === key ? 'bg-primary text-background shadow-[0_8px_24px_rgba(255,255,255,0.15)]' : 'border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.07] hover:text-white'}`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${view === key ? 'border-background/15 bg-background/10' : 'border-white/15 bg-white/[0.04]'}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 leading-tight">{label}</span>
      </button>
    ))}
  </div>
);

// Os três blocos do scout técnico (ações gerais, ofensivas e defensivas), iguais no perfil do atleta e na aba Scout, a pedido do usuário.
// Os três aparecem sempre: os botões de visualização do perfil técnico não mexem aqui, a pedido do usuário.
// totals: soma dos números lançados; title: desenha o título de cada bloco no estilo da tela que usa
export const TechnicalBlocks: React.FC<{ totals: Record<string, number>; title: (text: string) => React.ReactNode }> = ({ totals, title }) => {
  const value = (key: string) => scoutValue(fieldOf(key), totals) || 0;
  return (
    <>
    <section className="space-y-4">
      {title('Ações gerais')}
      {/* Um quadro por número; o aproveitamento é o percentual de ações bem sucedidas sobre o total */}
      <div className="grid grid-cols-2 gap-3 max-sm:[&>*:last-child]:col-span-2 sm:grid-cols-3 lg:grid-cols-5">
        {GENERAL_TILES.map((tile) => <NumberTile key={tile.key} label={tile.label} value={value(tile.key)} />)}
        <div className={`${panelClass} relative flex flex-col justify-center overflow-hidden px-4 py-5 sm:px-5`} title={`${value('actionsOk')} de ${value('actionsTotal')} ações bem sucedidas`}>
          <div className={topLineClass} />
          <p className={labelClass}>Aproveitamento das ações</p>
          <p className="mt-3 text-4xl font-black italic leading-none tracking-tight text-white">{value('actionsTotal') ? `${value('actionsPct')}%` : '-'}</p>
          <div className={`mt-3 flex h-1.5 gap-0.5 ${value('actionsTotal') ? '' : 'rounded-full bg-white/10'}`}>
            {value('actionsOk') > 0 && <div className={`h-full rounded-full ${OK_BAR}`} style={{ flexGrow: value('actionsOk'), flexBasis: 0 }} />}
            {value('actionsBad') > 0 && <div className={`h-full rounded-full ${MISS_BAR}`} style={{ flexGrow: value('actionsBad'), flexBasis: 0 }} />}
          </div>
        </div>
      </div>
    </section>

    <section className="space-y-4">
      {title('Ações ofensivas')}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OFFENSIVE_PAIRS.map((pair) => <PairCard key={pair.title} pair={pair} totals={totals} />)}
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:[&>*:last-child]:col-span-2 sm:grid-cols-3">
        {OFFENSIVE_TILES.map((key) => <NumberTile key={key} label={fieldOf(key).label} value={value(key)} />)}
      </div>
    </section>

    <section className="space-y-4">
      {title('Ações defensivas')}
      <div className="grid gap-3 sm:grid-cols-2">
        {DEFENSIVE_PAIRS.map((pair) => <PairCard key={pair.title} pair={pair} totals={totals} />)}
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:[&>*:last-child]:col-span-2 sm:grid-cols-3">
        {DEFENSIVE_TILES.map((key) => <NumberTile key={key} label={fieldOf(key).label} value={value(key)} />)}
      </div>
    </section>
    </>
  );
};

// Resumo do scout com gráficos (aba "Scout"), sobre os lançamentos filtrados por atleta e competição.
// Preto e branco como o resto do app: branco é o valor, branco translúcido é o complemento
const LIST_OPTIONS = [{ value: 'agenciados', label: 'Agenciados' }, { value: 'negociados', label: 'Negociados' }];
// Mesma pessoa nos dois cadastros: mesmo nome completo e mesma data de nascimento
const personKey = (athlete: Athlete) => `${`${athlete.name} ${athlete.lastName || ''}`.trim().toLowerCase().replace(/\s+/g, ' ')}|${(athlete.birthDate || '').slice(0, 10)}`;

// onTechnicalChange avisa a aba quando a tela do scout técnico abre ou fecha (a tabela de lançamentos some enquanto ela está aberta)
export const ScoutOverview = ({ entries, athletes, onTechnicalChange }: { entries: ScoutEntry[]; athletes: Athlete[]; onTechnicalChange?: (open: boolean) => void }) => {
  const [athleteId, setAthleteId] = useState('');
  // '' = as duas listas; o filtro de competição deu lugar a este a pedido do usuário
  const [listType, setListType] = useState('');
  const [category, setCategory] = useState('');
  const [position, setPosition] = useState('');
  const [rankingKey, setRankingKey] = useState(RANKING_KEYS[0]);
  // O scout técnico fica recolhido até o botão ser clicado
  const [showTechnical, setShowTechnical] = useState(false);
  useEffect(() => { onTechnicalChange?.(showTechnical); }, [showTechnical]);
  // Número dos gráficos "Evolução por mês" e "Por competição", e aproveitamento do gráfico de linha
  const [trendKey, setTrendKey] = useState(HEADLINE_KEYS[0]);

  const athleteById = useMemo(() => new Map(athletes.map((athlete) => [athlete.id, athlete])), [athletes]);
  // Lançamento de atleta apagado não entra no resumo
  const valid = useMemo(() => entries.filter((entry) => athleteById.has(entry.athleteId)), [entries, athleteById]);

  // Listas de cada pessoa: quem está nas duas (mesmo nome completo e nascimento) entra nos dois filtros
  const listsByPerson = useMemo(() => {
    const map = new Map<string, Set<string>>();
    athletes.forEach((athlete) => {
      const key = personKey(athlete);
      map.set(key, (map.get(key) || new Set<string>()).add(athlete.listType || 'agenciados'));
    });
    return map;
  }, [athletes]);

  // Lista, categoria e posição vêm do cadastro do atleta de cada lançamento
  const matchesAthlete = (id: string, wantedCategory = category, wantedPosition = position, wantedList = listType) => {
    const athlete = athleteById.get(id);
    return Boolean(athlete)
      && (!wantedList || Boolean(listsByPerson.get(personKey(athlete!))?.has(wantedList)))
      && (!wantedCategory || athlete!.category === wantedCategory)
      && (!wantedPosition || athlete!.position === wantedPosition);
  };

  // Atletas com lançamento, só os da categoria e da posição escolhidas
  const athleteOptions = useMemo(() => {
    const ids = [...new Set<string>(valid.map((entry) => entry.athleteId))];
    return ids
      .filter((id) => matchesAthlete(id))
      .map((id) => ({ value: id, label: fullName(athleteById.get(id)!) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [valid, athleteById, category, position, listType, listsByPerson]);
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
  const pickList = (next: string) => {
    setListType(next);
    if (athleteId && !matchesAthlete(athleteId, category, position, next)) setAthleteId('');
  };

  // Lançamentos da lista, da categoria e da posição escolhidas, de todos os atletas
  const peers = valid.filter((entry) => matchesAthlete(entry.athleteId));
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
  const referenceTotals = athleteId ? sumStats(peers) : undefined;


  // Lançamentos que têm algum número além dos da súmula (jogos com transmissão)
  const technicalCount = filtered.filter((entry) => Object.keys(entry.stats).some((key) => !SHEET_KEYS.has(key))).length;

  // Ranking: soma do número escolhido por atleta, do maior para o menor.
  // Não segue os filtros do topo (pedido do usuário): conta sempre todos os lançamentos
  // untitled: sem o nome dentro do quadro, quando o título da parte já diz "Ranking dos atletas"
  const rankingPanel = (keys: string[], current: string, onPick: (key: string) => void, untitled = false) => {
    const byAthlete = new Map<string, number>();
    valid.forEach((entry) => byAthlete.set(entry.athleteId, (byAthlete.get(entry.athleteId) || 0) + (entry.stats[current] || 0)));
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
      <div className={`${panelClass} grid gap-3 p-4 sm:grid-cols-2 sm:items-end xl:grid-cols-[1.3fr_1.3fr_1fr_1fr]`}>
        <div className="min-w-0">
          <p className={`${labelClass} mb-2`}>Atleta</p>
          <SheetSelect value={athleteId} options={athleteOptions} onChange={setAthleteId} label="Filtrar por atleta" placeholder="Todos os atletas" className={filterClass} />
        </div>
        <div className="min-w-0">
          <p className={`${labelClass} mb-2`}>Lista</p>
          <SheetSelect value={listType} options={LIST_OPTIONS} onChange={pickList} label="Filtrar por agenciados ou negociados" placeholder="Agenciados e negociados" className={filterClass} />
        </div>
        <div className="min-w-0">
          <p className={`${labelClass} mb-2`}>Categoria</p>
          <SheetSelect value={category} options={categoryOptions} onChange={pickCategory} label="Filtrar por categoria" placeholder="Todas as categorias" className={filterClass} />
        </div>
        <div className="min-w-0">
          <p className={`${labelClass} mb-2`}>Posição</p>
          <SheetSelect value={position} options={positionOptions} onChange={pickPosition} label="Filtrar por posição" placeholder="Todas as posições" className={filterClass} />
        </div>
      </div>

      {/* Ranking dos atletas: em cima do Scout Geral, sem seguir os filtros; some na tela do scout técnico */}
      {!showTechnical && (
        <div className="space-y-4 pb-2 pt-4">
          <SectionHeader title="Ranking dos atletas" />
          {rankingPanel(RANKING_KEYS, rankingKey, setRankingKey, true)}
        </div>
      )}

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
          {/* Perfil técnico em cima das ações gerais, a pedido do usuário; com um atleta escolhido, compara com todos os atletas nos mesmos filtros */}
          <div className="space-y-4">
            <SectionHeader title="Perfil técnico" />
            <TechnicalProfile totals={totals} reference={referenceTotals} />
          </div>

          {/* Scout técnico: os mesmos blocos do scout do perfil do atleta (ações gerais, ofensivas e defensivas), a pedido do usuário */}
          <TechnicalBlocks totals={totals} title={(text) => <SectionHeader title={text} />} />
          </>
          )}
        </div>
      )}
    </section>
  );
};
