import React, { useMemo, useState } from 'react';
import { Athlete, ScoutEntry } from '../types';
import { SCOUT_FIELDS, formatScoutValue, scoutValue } from '../scout';
import { SheetSelect } from './SheetSelect';

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const labelClass = 'text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant';
const filterClass = 'h-10 w-full rounded-xl border bg-white/[0.04] px-3 text-sm text-white outline-none transition';

const FIELD_BY_KEY = new Map(SCOUT_FIELDS.map((field) => [field.key, field]));
const fieldOf = (key: string) => FIELD_BY_KEY.get(key)!;

const fullName = (athlete: Athlete) => `${athlete.name} ${athlete.lastName || ''}`.trim();
const format = (value: number) => value.toLocaleString('pt-BR');

// Números em destaque no topo do resumo
const HEADLINE_KEYS = ['minutes', 'goals', 'assists', 'goalParticipations'];

// Aproveitamento: percentual de acerto, com os certos sobre o total
const RATES = [
  { label: 'Ações', ok: 'actionsOk', total: 'actionsTotal', pct: 'actionsPct' },
  { label: 'Passes', ok: 'passesCompleted', total: 'passesTotal', pct: 'passesPct' },
  { label: 'Passes longos', ok: 'longPassesCompleted', total: 'longPassesTotal', pct: 'longPassesPct' },
  { label: 'Finalizações', ok: 'shotsOnTarget', total: 'shotsTotal', pct: 'shotsPct' },
  { label: 'Cruzamentos', ok: 'crossesCompleted', total: 'crossesTotal', pct: 'crossesPct' },
  { label: 'Dribles', ok: 'dribblesCompleted', total: 'dribblesTotal', pct: 'dribblesPct' },
];

// Número usado no ranking de atletas
const RANKING_KEYS = ['minutes', 'goals', 'assists', 'goalParticipations', 'tackles', 'interceptions'];
const RANKING_SIZE = 8;

// Comparativos: dois números que formam um par
const SPLITS = [
  { title: 'Início das partidas', left: 'starter', right: 'bench', leftLabel: 'Titular', rightLabel: 'Reserva' },
  { title: 'Faltas', left: 'foulsSuffered', right: 'foulsCommitted', leftLabel: 'Sofridas', rightLabel: 'Cometidas' },
  { title: 'Duelo aéreo defensivo', left: 'aerialDefWon', right: 'aerialDefLost', leftLabel: 'Vencidos', rightLabel: 'Perdidos' },
  { title: 'Duelo aéreo ofensivo', left: 'aerialOffWon', right: 'aerialOffLost', leftLabel: 'Vencidos', rightLabel: 'Perdidos' },
];

const DEFENSE_KEYS = ['tackles', 'tacklesIncomplete', 'interceptions', 'ballLosses', 'dribbledPast', 'yellowCards', 'redCards', 'offsides'];

const RING_RADIUS = 34;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

// Anel de aproveitamento: o arco branco é o percentual de acerto
const RateRing: React.FC<{ label: string; pct?: number; ok: number; total: number }> = ({ label, pct, ok, total }) => (
  <div className={`${panelClass} flex flex-col items-center px-3 py-5 text-center`} title={`${label}: ${ok} de ${total}${pct === undefined ? '' : ` (${pct}%)`}`}>
    <div className="relative h-24 w-24">
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
      <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-white">{pct === undefined ? '-' : `${pct}%`}</span>
    </div>
    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-white">{label}</p>
    <p className="mt-1 text-[10px] font-bold text-on-surface-variant">{total > 0 ? `${format(ok)} de ${format(total)}` : 'Sem lançamentos'}</p>
  </div>
);

// Resumo do scout com gráficos (aba "Scout"), sobre os lançamentos filtrados por atleta e competição.
// Preto e branco como o resto do app: branco é o valor, branco translúcido é o complemento
export const ScoutOverview = ({ entries, athletes }: { entries: ScoutEntry[]; athletes: Athlete[] }) => {
  const [athleteId, setAthleteId] = useState('');
  const [competition, setCompetition] = useState('');
  const [rankingKey, setRankingKey] = useState(RANKING_KEYS[0]);

  const athleteById = useMemo(() => new Map(athletes.map((athlete) => [athlete.id, athlete])), [athletes]);
  // Lançamento de atleta apagado não entra no resumo
  const valid = useMemo(() => entries.filter((entry) => athleteById.has(entry.athleteId)), [entries, athleteById]);

  const athleteOptions = useMemo(() => {
    const ids = [...new Set<string>(valid.map((entry) => entry.athleteId))];
    return ids
      .map((id) => ({ value: id, label: fullName(athleteById.get(id)!) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [valid, athleteById]);
  const competitionOptions = useMemo(
    () => [...new Set<string>(valid.map((entry) => entry.competition).filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name })),
    [valid],
  );

  const filtered = valid.filter((entry) => (!athleteId || entry.athleteId === athleteId) && (!competition || entry.competition === competition));

  // Soma de cada número lançado; totais e percentuais são calculados sobre essa soma
  const totals: Record<string, number> = {};
  filtered.forEach((entry) => Object.entries(entry.stats).forEach(([key, value]) => { totals[key] = (totals[key] || 0) + Number(value); }));
  const value = (key: string) => scoutValue(fieldOf(key), totals) || 0;

  const athleteCount = new Set(filtered.map((entry) => entry.athleteId)).size;

  // Ranking: soma do número escolhido por atleta, do maior para o menor
  const byAthlete = new Map<string, number>();
  filtered.forEach((entry) => byAthlete.set(entry.athleteId, (byAthlete.get(entry.athleteId) || 0) + (entry.stats[rankingKey] || 0)));
  const ranking = [...byAthlete.entries()]
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, RANKING_SIZE)
    .map(([id, total]) => ({ athlete: athleteById.get(id)!, total }));
  const rankingMax = ranking[0]?.total || 1;

  if (valid.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Filtros numa linha só, acima dos gráficos */}
      <div className={`${panelClass} grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}>
        <div className="min-w-0">
          <p className={`${labelClass} mb-2`}>Atleta</p>
          <SheetSelect value={athleteId} options={athleteOptions} onChange={setAthleteId} label="Filtrar por atleta" placeholder="Todos os atletas" className={filterClass} />
        </div>
        <div className="min-w-0">
          <p className={`${labelClass} mb-2`}>Competição</p>
          <SheetSelect value={competition} options={competitionOptions} onChange={setCompetition} label="Filtrar por competição" placeholder="Todas as competições" className={filterClass} />
        </div>
        <p className={`${labelClass} pb-3 sm:text-right`}>
          <span className="text-white">{filtered.length}</span> {filtered.length === 1 ? 'lançamento' : 'lançamentos'} · <span className="text-white">{athleteCount}</span> {athleteCount === 1 ? 'atleta' : 'atletas'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className={`${panelClass} p-8 text-center`}>
          <p className={labelClass}>Sem números</p>
          <p className="mt-2 text-sm text-white/70">Nenhum lançamento para esse atleta nessa competição.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {HEADLINE_KEYS.map((key) => (
              <div key={key} className={`${panelClass} relative overflow-hidden px-5 py-6`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <p className={labelClass}>{fieldOf(key).label}</p>
                <p className="mt-3 text-4xl font-black italic leading-none tracking-tight text-white sm:text-5xl">{format(value(key))}</p>
              </div>
            ))}
          </div>

          <div>
            <p className={`${labelClass} mb-3 px-1`}>Aproveitamento</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {RATES.map((rate) => (
                <RateRing key={rate.pct} label={rate.label} pct={scoutValue(fieldOf(rate.pct), totals)} ok={value(rate.ok)} total={value(rate.total)} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className={`${panelClass} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={labelClass}>Ranking de atletas</p>
                <div className="flex flex-wrap gap-1.5">
                  {RANKING_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRankingKey(key)}
                      aria-pressed={rankingKey === key}
                      className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition ${rankingKey === key ? 'bg-primary text-background' : 'border border-white/10 text-on-surface-variant hover:bg-white/10 hover:text-white'}`}
                    >
                      {fieldOf(key).label}
                    </button>
                  ))}
                </div>
              </div>

              {ranking.length === 0 ? (
                <p className="mt-6 text-sm text-white/70">Nenhum atleta com {fieldOf(rankingKey).label.toLowerCase()} lançado.</p>
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

            <div className={`${panelClass} p-5`}>
              <p className={labelClass}>Comparativos</p>
              <div className="mt-5 space-y-5">
                {SPLITS.map((split) => {
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
          </div>

          <div>
            <p className={`${labelClass} mb-3 px-1`}>Defesa e disciplina</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
              {DEFENSE_KEYS.map((key) => (
                <div key={key} className={`${panelClass} px-3 py-4 text-center`}>
                  <p className="text-2xl font-black leading-none text-white">{formatScoutValue(fieldOf(key), totals) || '0'}</p>
                  <p className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">{fieldOf(key).label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
