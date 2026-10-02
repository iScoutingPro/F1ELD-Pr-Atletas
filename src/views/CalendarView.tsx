import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, MapPin, Clock3, ChevronLeft, ChevronRight } from 'lucide-react';

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const fixtures = [
  { date: '2026-09-12', home: 'F1eld Pró FC', away: 'Ativa Sports', venue: 'Estádio do Vale', time: '20:00', type: 'Casa', athleteImage: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=300&q=80', athleteName: 'Rafael Costa', category: 'Campeonato Nacional' },
  { date: '2026-09-12', home: 'F1eld Pró FC', away: 'Tupy FC', venue: 'Centro de Treinamento', time: '16:30', type: 'Casa', athleteImage: 'https://images.unsplash.com/photo-1541534401786-2077eed87a74?auto=format&fit=crop&w=300&q=80', athleteName: 'Gabriel Alves', category: 'Coletivo Sub-20' },
  { date: '2026-09-12', home: 'Ativa Sports', away: 'Nova Era FC', venue: 'Arena Norte', time: '18:45', type: 'Fora', athleteImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', athleteName: 'Mateus Silva', category: 'Amistoso' },
  { date: '2026-09-12', home: 'F1eld Pró FC', away: 'Riviera SC', venue: 'Estádio do Vale', time: '21:15', type: 'Casa', athleteImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80', athleteName: 'Leonardo Reis', category: 'Liga Regional' },
  { date: '2026-09-18', home: 'Ativa Sports', away: 'Lions FC', venue: 'Arena Norte', time: '18:30', type: 'Fora', athleteImage: 'https://images.unsplash.com/photo-1541534401786-2077eed87a74?auto=format&fit=crop&w=300&q=80', athleteName: 'Mateus Silva', category: 'Amistoso' },
  { date: '2026-09-25', home: 'F1eld Pró FC', away: 'Northside SC', venue: 'Centro de Treinamento', time: '19:15', type: 'Casa', athleteImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', athleteName: 'Henrique Lobo', category: 'Preparação' },
  { date: '2026-09-30', home: 'Lions FC', away: 'F1eld Pró FC', venue: 'Complexo Esportivo', time: '17:45', type: 'Fora', athleteImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80', athleteName: 'Gabriel Nunes', category: 'Liga Regional' },
  { date: '2026-10-02', home: 'F1eld Pró FC', away: 'Belo Horizonte FC', venue: 'Estádio do Vale', time: '20:30', type: 'Casa', athleteImage: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=300&q=80', athleteName: 'Lucas Mendes', category: 'Copa do Brasil' },
  { date: '2026-10-07', home: 'Riviera SC', away: 'F1eld Pró FC', venue: 'Arena Central', time: '19:00', type: 'Fora', athleteImage: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=300&q=80', athleteName: 'Davi Rocha', category: 'Pós-temporada' },
];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthLabel = (date: Date) =>
  date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (char) => char.toUpperCase());

const getMonthShortLabel = (date: Date) =>
  date.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^./, (char) => char.toUpperCase());

export const CalendarView = () => {
  const initialMonth = new Date(2026, 8, 1);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState('2026-09-30');

  const monthDays = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const gridStart = new Date(start);
    gridStart.setDate(1 - start.getDay());

    const days: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentMonth]);

  const selectedFixture = fixtures.filter((item) => item.date === selectedDate);

  const moveMonth = (direction: number) => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(nextMonth);

    const firstFixtureInMonth = fixtures.find((fixture) => {
      const fixtureDate = new Date(`${fixture.date}T12:00:00`);
      return fixtureDate.getMonth() === nextMonth.getMonth() && fixtureDate.getFullYear() === nextMonth.getFullYear();
    });

    setSelectedDate(firstFixtureInMonth ? firstFixtureInMonth.date : formatDateKey(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1)));
  };

  const isSelectedDateInCurrentMonth = new Date(`${selectedDate}T12:00:00`).getMonth() === currentMonth.getMonth() && new Date(`${selectedDate}T12:00:00`).getFullYear() === currentMonth.getFullYear();

  const isCurrentMonth = currentMonth.getMonth() === initialMonth.getMonth() && currentMonth.getFullYear() === initialMonth.getFullYear();

  const resetToInitialMonth = () => {
    setCurrentMonth(initialMonth);
    setSelectedDate('2026-09-30');
  };

  const selectedDateValue = new Date(`${selectedDate}T12:00:00`);
  const selectedFixtureTime = selectedFixture[0]?.time ?? '--:--';

  return (
    <div className="min-h-screen px-6 pt-24 pb-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-white/10 bg-surface-low/80 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-2 rounded-full border border-white/10 bg-[#1a1d22]/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <button onClick={() => moveMonth(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-surface-high text-on-surface-variant transition hover:border-primary/40 hover:text-white hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)]">
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex flex-1 items-center justify-center gap-2 text-center">
                <button
                  onClick={resetToInitialMonth}
                  disabled={isCurrentMonth}
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] transition ${
                    isCurrentMonth
                      ? 'border-white/10 bg-white/5 text-on-surface-variant opacity-60 cursor-not-allowed'
                      : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 shadow-[0_10px_25px_rgba(59,130,246,0.15)]'
                  }`}
                >
                  Hoje
                </button>

                <div className="flex items-center justify-center gap-2 text-center">
                  <span className="text-sm font-black uppercase tracking-[0.18em] text-white">{getMonthShortLabel(currentMonth)}</span>
                  <span className="text-sm font-black uppercase tracking-[0.18em] text-on-surface-variant">{currentMonth.getFullYear()}</span>
                </div>
              </div>

              <button onClick={() => moveMonth(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-surface-high text-on-surface-variant transition hover:border-primary/40 hover:text-white hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)]">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center">
              {weekDays.map((day) => (
                <div key={day} className="py-2 text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant">
                  {day}
                </div>
              ))}

              {monthDays.map((day) => {
                const key = formatDateKey(day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isSelected = selectedDate === key;
                const hasFixture = fixtures.some((fixture) => fixture.date === key);

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={`relative flex h-20 flex-col items-center justify-center rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/15 text-white shadow-[0_12px_30px_rgba(59,130,246,0.25)]'
                        : isCurrentMonth
                          ? 'border-white/5 bg-surface-high text-white/90 hover:border-white/20'
                          : 'border-white/5 bg-surface-high/60 text-white/35'
                    }`}
                  >
                    <span className="text-sm font-black">{day.getDate()}</span>
                    {hasFixture && (
                      <span className={`mt-1 h-2 w-2 rounded-full ${isSelected ? 'bg-primary' : 'bg-green-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="flex h-[calc(100vh-10rem)] min-h-[420px] flex-col rounded-[28px] border border-white/10 bg-surface-low/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="w-full">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Agenda</p>
                <h3 className="mt-2 text-[clamp(1.1rem,1.8vw,1.8rem)] font-black uppercase italic leading-none text-white">
                  {selectedDateValue.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </h3>
              </div>
            </div>

            <div
              className="agenda-scroll flex-1 space-y-3 overflow-y-auto pr-1"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#7a7a7a transparent' }}
            >
              {selectedFixture.length > 0 ? (
                selectedFixture.map((fixture) => (
                  <div key={fixture.date} className="rounded-[28px] border border-white/10 bg-[#1e2023]/80 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                    <div className="mb-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#2b2d30]/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <div className="flex min-w-[84px] flex-col items-center justify-center">
                        <img
                          src={fixture.athleteImage}
                          alt={fixture.home}
                          className="h-16 w-16 rounded-2xl object-cover border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                        />
                        <p className="mt-2 max-w-[80px] text-center text-[8px] font-black uppercase tracking-[0.18em] text-on-surface-variant leading-[1.4]">
                          {fixture.athleteName}
                        </p>
                      </div>

                      <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                        <div className="min-w-0 text-left">
                          <p className="truncate text-sm font-black uppercase italic text-white">{fixture.home}</p>
                        </div>

                        <div className="flex h-8 min-w-[42px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                          VS
                        </div>

                        <div className="min-w-0 text-right">
                          <p className="truncate text-sm font-black uppercase italic text-white">{fixture.away}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-white/5 pt-4 text-xs font-black uppercase tracking-[0.15em] text-on-surface-variant">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-surface-high/80 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-primary">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>{fixture.time}</span>
                        </div>
                        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-[#2b2d30]/90 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/85">
                          <span className="text-on-surface-variant">Cat.</span>
                          <span>{fixture.category}</span>
                        </div>
                        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-[#2b2d30]/90 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-primary">
                          <span className="text-on-surface-variant">Comp.</span>
                          <span>Liga Regional</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#2b2d30]/90 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>{fixture.venue}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-surface-high p-6 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Sem jogo</p>
                  <p className="mt-2 text-sm text-white/70">Nenhuma partida marcada para esta data.</p>
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
};
