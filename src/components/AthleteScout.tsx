import React from 'react';
import { Trophy } from 'lucide-react';
import { Athlete, Game } from '../types';
import { GOALKEEPER_FIELDS, SCOUT_FIELDS, scoutOf } from '../scout';

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

const SectionTitle = ({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <span className="h-4 w-0.5 rounded-full bg-primary" />
    <h3 className="text-base font-black uppercase tracking-[0.12em] text-primary underline decoration-2 underline-offset-8">{children}</h3>
    <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    {aside && <span className="text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant">{aside}</span>}
  </div>
);

// Scout do atleta: soma dos números lançados na aba "Scout" e o detalhe de cada jogo.
// Só entram jogos com scout lançado; jogos e minutos do Calendário ficam no ícone Calendário
export const AthleteScout = ({ athlete, games }: { athlete: Athlete; games: Game[] }) => {
  // Jogos com scout lançado para o atleta, do mais recente para o mais antigo
  const entries = games
    .filter((game) => scoutOf(game, athlete.id))
    .sort((a, b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`));

  const total = (key: string) => entries.reduce((sum, game) => sum + (scoutOf(game, athlete.id)?.[key] || 0), 0);
  // Números de goleiro só aparecem para quem tem algum lançado
  const fields = SCOUT_FIELDS.filter(({ key }) => !GOALKEEPER_FIELDS.includes(key) || entries.some((game) => scoutOf(game, athlete.id)?.[key] !== undefined));

  if (entries.length === 0) {
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
        <SectionTitle aside={`${entries.length} ${entries.length === 1 ? 'jogo' : 'jogos'}`}>Scout</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {fields.map(({ key, label }) => (
            <div key={key} className={`${panelClass} px-3 py-5 text-center`}>
              <p className="text-3xl font-black leading-none text-white">{total(key)}</p>
              <p className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Scout por jogo</SectionTitle>
        <div className="space-y-3">
          {entries.map((game) => {
            const date = new Date(`${game.date}T12:00:00`);
            const scout = scoutOf(game, athlete.id) || {};
            return (
              <div key={game.id} className={`${panelClass} flex items-start gap-4 p-4`}>
                <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-surface-high text-center">
                  <span className="text-2xl font-black leading-none text-white">{String(date.getDate()).padStart(2, '0')}</span>
                  <span className="mt-1 text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                    {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')} {date.getFullYear()}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                    <Trophy className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-words">{game.competition || 'Jogo'}</span>
                  </div>
                  <p className="mt-2 break-words text-sm font-black uppercase italic leading-tight text-white">
                    {game.home} <span className="mx-1 text-[9px] not-italic tracking-[0.2em] text-on-surface-variant">VS</span> {game.away}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {SCOUT_FIELDS.filter(({ key }) => scout[key] !== undefined).map(({ key, label }) => (
                      <span key={key} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">
                        {label} <span className="ml-1 text-white">{scout[key]}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
