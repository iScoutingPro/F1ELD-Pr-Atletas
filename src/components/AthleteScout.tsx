import React from 'react';
import { Trophy } from 'lucide-react';
import { ScoutEntry } from '../types';
import { SCOUT_FIELDS, formatScoutValue, scoutValue, sortScoutEntries } from '../scout';

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

const SectionTitle = ({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <span className="h-4 w-0.5 rounded-full bg-primary" />
    <h3 className="text-base font-black uppercase tracking-[0.12em] text-primary underline decoration-2 underline-offset-8">{children}</h3>
    <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    {aside && <span className="text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant">{aside}</span>}
  </div>
);

// Scout do atleta: soma dos números lançados na aba "Scout" e o detalhe de cada partida.
// Recebe só os lançamentos do atleta; jogos do Calendário ficam no ícone Calendário
export const AthleteScout = ({ entries }: { entries: ScoutEntry[] }) => {
  const sorted = sortScoutEntries(entries);
  // Soma de cada número lançado; totais e percentuais são calculados sobre essa soma
  const totals: Record<string, number> = {};
  sorted.forEach((entry) => Object.entries(entry.stats).forEach(([key, value]) => { totals[key] = (totals[key] || 0) + value; }));

  if (sorted.length === 0) {
    return (
      <section className="mt-8 space-y-3">
        <SectionTitle>Scout</SectionTitle>
        <div className={`${panelClass} p-8 text-center`}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Sem números</p>
          <p className="mt-2 text-sm text-white/70">Nenhum número de scout cadastrado para este atleta.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="space-y-3">
        <SectionTitle aside={`${sorted.length} ${sorted.length === 1 ? 'jogo' : 'jogos'}`}>Scout</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SCOUT_FIELDS.map((field) => (
            <div key={field.key} className={`${panelClass} px-3 py-5 text-center`}>
              <p className="text-3xl font-black leading-none text-white">{formatScoutValue(field, totals) || (field.percent ? '-' : '0')}</p>
              <p className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant">{field.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Scout por jogo</SectionTitle>
        <div className="space-y-3">
          {sorted.map((entry) => (
            <div key={entry.id} className={`${panelClass} p-4`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                <Trophy className="h-3.5 w-3.5 shrink-0" />
                <span className="break-words">{entry.competition || 'Jogo'}</span>
                {entry.round && entry.round !== '-' && <span className="text-on-surface-variant">· Rodada {entry.round}</span>}
              </div>
              <p className="mt-2 break-words text-sm font-black uppercase italic leading-tight text-white">{entry.match || entry.team || 'Partida'}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
                {[[entry.matchDate, entry.year].filter(Boolean).join(' · '), entry.match ? entry.team : ''].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {/* Só o que tem valor: marcações (titular, reserva...) aparecem sem número */}
                {SCOUT_FIELDS.filter((field) => (scoutValue(field, entry.stats) || 0) > 0).map((field) => (
                  <span key={field.key} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">
                    {field.label}{!field.flag && <span className="ml-1 text-white">{formatScoutValue(field, entry.stats)}</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
