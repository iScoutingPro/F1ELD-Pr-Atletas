import React from 'react';
import { Clock3, MapPin, Trophy } from 'lucide-react';
import { Athlete, Game } from '../types';

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Próximos jogos (de hoje em diante) em que o atleta está vinculado
export const AthleteGames = ({ athlete, games }: { athlete: Athlete; games: Game[] }) => {
  const today = todayKey();
  const upcoming = games
    .filter((game) => game.athleteIds.includes(athlete.id) && game.date >= today)
    .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));

  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-4 w-0.5 rounded-full bg-primary" />
        <h3 className="text-base font-black uppercase tracking-[0.12em] text-primary underline decoration-2 underline-offset-8">Próximos jogos</h3>
        <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant">
          {upcoming.length} {upcoming.length === 1 ? 'jogo' : 'jogos'}
        </span>
      </div>

      {upcoming.length > 0 ? (
        <div className="space-y-3">
          {upcoming.map((game) => {
            const date = new Date(`${game.date}T12:00:00`);
            return (
              <div key={game.id} className={`${panelClass} flex items-center gap-4 p-4`}>
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
                    {game.category && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[8px] tracking-[0.16em] text-background">{game.category}</span>
                    )}
                  </div>
                  <p className="mt-2 break-words text-sm font-black uppercase italic leading-tight text-white">
                    {game.home} <span className="mx-1 text-[9px] not-italic tracking-[0.2em] text-on-surface-variant">VS</span> {game.away}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5 text-primary" />
                      {game.time || '--:--'}
                    </span>
                    {game.venue && (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="break-words">{game.venue}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`${panelClass} p-8 text-center`}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Sem jogos</p>
          <p className="mt-2 text-sm text-white/70">Nenhum próximo jogo cadastrado para este atleta.</p>
        </div>
      )}
    </section>
  );
};
