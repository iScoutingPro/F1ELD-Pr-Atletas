import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { MapPin, Clock3, ChevronLeft, ChevronRight, Plus, Pencil, Search, Check, X, Trash2, Trophy } from 'lucide-react';
import { Athlete, Game } from '../types';
import { CATEGORIES } from '../categories';

interface CalendarViewProps {
  games: Game[];
  athletes: Athlete[];
  onSelectAthlete?: (athlete: Athlete) => void;
  // Só o admin recebe os callbacks de gravação; sem eles os botões não aparecem
  onSaveGame?: (game: Omit<Game, 'id'>, id?: string) => Promise<boolean>;
  onDeleteGame?: (id: string) => Promise<boolean>;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const labelClass = 'ml-1 text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant';
const inputClass = 'w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-surface-high px-4 py-3.5 text-sm font-bold text-on-surface outline-none transition placeholder:font-medium placeholder:text-on-surface-variant/40 focus:border-white/60 focus:ring-2 focus:ring-white/15';

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthShortLabel = (date: Date) =>
  date.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^./, (char) => char.toUpperCase());

const fullName = (athlete: Athlete) => `${athlete.name} ${athlete.lastName || ''}`.trim();

// Sigla do time para o escudo quando não há logo: iniciais das palavras ou as três primeiras letras
const teamInitials = (name: string) => {
  const words = name.trim().split(/s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return (words.length === 1 ? words[0].slice(0, 3) : words.slice(0, 3).map((word) => word[0]).join('')).toUpperCase();
};

const TeamCrest = ({ name, logo }: { name: string; logo?: string }) => (
  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-b from-white/[0.14] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_rgba(0,0,0,0.45)]">
    {logo ? (
      <img src={logo} alt="" className="h-9 w-9 object-contain" />
    ) : (
      <span className="text-sm font-black italic tracking-tight text-white">{teamInitials(name)}</span>
    )}
  </div>
);

// No iPhone o campo de data/hora tem largura própria e saía do cartão: no celular ele perde a aparência nativa para respeitar a largura
const dateInputClass = `${inputClass} [color-scheme:dark] max-sm:min-h-[50px] max-sm:appearance-none`;

interface GameFormProps {
  game?: Game;
  initialDate: string;
  athletes: Athlete[];
  onSave: (game: Omit<Game, 'id'>, id?: string) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  onClose: () => void;
}

const GameForm = ({ game, initialDate, athletes, onSave, onDelete, onClose }: GameFormProps) => {
  const [date, setDate] = useState(game?.date || initialDate);
  const [time, setTime] = useState(game?.time || '');
  const [home, setHome] = useState(game?.home || '');
  const [away, setAway] = useState(game?.away || '');
  const [venue, setVenue] = useState(game?.venue || '');
  const [category, setCategory] = useState(game?.category || '');
  const [competition, setCompetition] = useState(game?.competition || '');
  const [round, setRound] = useState(game?.round || '');
  const [athleteIds, setAthleteIds] = useState<string[]>(game?.athleteIds || []);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const sortedAthletes = useMemo(
    () => [...athletes].sort((a, b) => fullName(a).localeCompare(fullName(b), 'pt-BR')),
    [athletes],
  );

  const term = search.trim().toLowerCase();
  const visibleAthletes = term
    ? sortedAthletes.filter((a) => fullName(a).toLowerCase().includes(term) || (a.club || '').toLowerCase().includes(term))
    : sortedAthletes;

  const selectedAthletes = sortedAthletes.filter((a) => athleteIds.includes(a.id));

  const toggleAthlete = (id: string) =>
    setAthleteIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // O formulário não tem mais campo de minutos: os já gravados são mantidos para quem continua vinculado ao jogo
    const athleteMinutes: Record<string, number> = {};
    athleteIds.forEach((id) => {
      const value = game?.athleteMinutes?.[id] || 0;
      if (value > 0) athleteMinutes[id] = value;
    });
    const saved = await onSave({ date, time, home, away, venue, category, competition, round, athleteIds, athleteMinutes }, game?.id);
    setSaving(false);
    if (saved) onClose();
  };

  const handleDelete = async () => {
    if (!game || !onDelete) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    const deleted = await onDelete(game.id);
    setSaving(false);
    if (deleted) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/65 px-2 py-4 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-[#17191c] shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/10 via-white/[0.03] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-30 flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-error/40 bg-error/15 text-error shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-error hover:text-white active:bg-error active:text-white"
          aria-label="Fechar"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <form onSubmit={handleSubmit} className="relative space-y-5 px-4 pb-6 pt-10 sm:px-10 sm:pb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Calendário</p>
            <h2 className="mt-2 text-2xl font-black uppercase italic leading-none text-white">{game ? 'Editar jogo' : 'Adicionar jogo'}</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
            <div className="space-y-1">
              <label className={labelClass}>Data *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={dateInputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Horário</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={dateInputClass} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_1.5fr_1fr] [&>*]:min-w-0">
            <div className="space-y-1">
              <label className={labelClass}>Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="">Selecione</option>
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Competição</label>
              <input type="text" value={competition} onChange={(e) => setCompetition(e.target.value)} className={inputClass} placeholder="Ex.: Campeonato Paulista" />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Rodada</label>
              <input type="text" value={round} onChange={(e) => setRound(e.target.value)} className={inputClass} placeholder="Ex.: 3 ou Semi" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
            <div className="space-y-1">
              <label className={labelClass}>Mandante *</label>
              <input type="text" value={home} onChange={(e) => setHome(e.target.value)} className={inputClass} placeholder="Time da casa" />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Visitante *</label>
              <input type="text" value={away} onChange={(e) => setAway(e.target.value)} className={inputClass} placeholder="Time visitante" />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Local</label>
            <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className={inputClass} placeholder="Estádio ou centro de treinamento" />
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Atletas vinculados ({athleteIds.length})</label>

            {selectedAthletes.length > 0 && (
              <div className="space-y-2">
                {selectedAthletes.map((athlete) => (
                  <div key={athlete.id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-surface-high p-2 sm:gap-3">
                    <img src={athlete.image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                    <p className="min-w-0 flex-1 break-words text-[11px] font-black uppercase leading-tight tracking-[0.06em] text-white">{fullName(athlete)}</p>
                    <button
                      type="button"
                      onClick={() => toggleAthlete(athlete.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition hover:border-primary hover:bg-primary hover:text-background"
                      aria-label="Remover do jogo"
                      title="Remover do jogo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} pl-11`}
                placeholder="Buscar atleta por nome ou clube"
              />
            </div>

            <div className="max-h-60 space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-surface-high/40 p-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#7a7a7a transparent' }}>
              {visibleAthletes.length > 0 ? (
                visibleAthletes.map((athlete) => {
                  const selected = athleteIds.includes(athlete.id);
                  return (
                    <button
                      key={athlete.id}
                      type="button"
                      onClick={() => toggleAthlete(athlete.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${selected ? 'border-primary/60 bg-primary/10' : 'border-transparent hover:border-white/10 hover:bg-white/5'}`}
                    >
                      <img src={athlete.image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black uppercase text-white">{fullName(athlete)}</p>
                        <p className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">
                          {[athlete.club, athlete.category, athlete.listType === 'negociados' ? 'Negociado' : 'Agenciado'].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-primary bg-primary text-background' : 'border-white/20'}`}>
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="p-4 text-center text-xs text-on-surface-variant">Nenhum atleta encontrado.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 sm:gap-3">
            {game && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl border border-error/40 bg-error/15 px-4 py-4 sm:px-5 text-[11px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-error transition hover:bg-error hover:text-white disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {confirmingDelete ? 'Confirmar exclusão' : 'Excluir'}
              </button>
            )}
            <div className="flex flex-1 justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-white/10 bg-surface-high px-4 py-4 sm:px-6 text-[11px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-white transition hover:border-white/20"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="whitespace-nowrap rounded-2xl bg-primary px-5 py-4 sm:px-8 text-[11px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-background shadow-xl transition hover:scale-[1.02] disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar jogo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export const CalendarView = ({ games, athletes, onSelectAthlete, onSaveGame, onDeleteGame }: CalendarViewProps) => {
  const todayKey = formatDateKey(new Date());
  const initialMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  // null = formulário fechado; 'new' = cadastro; Game = edição
  const [formGame, setFormGame] = useState<Game | 'new' | null>(null);
  // Lixeira do cartão do jogo: o primeiro clique pede confirmação, o segundo apaga
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteGame = async (id: string) => {
    if (!onDeleteGame || deletingId) return;
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setDeletingId(id);
    await onDeleteGame(id);
    setDeletingId(null);
    setConfirmingDeleteId(null);
  };

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

  const gameDates = useMemo(() => new Set(games.map((game) => game.date)), [games]);
  const athletesById = useMemo(() => new Map(athletes.map((athlete) => [athlete.id, athlete])), [athletes]);
  // Escudo do time: aproveita o escudo cadastrado em algum atleta do mesmo clube
  const clubLogos = useMemo(() => {
    const logos = new Map<string, string>();
    athletes.forEach((athlete) => {
      if (athlete.clubLogo && athlete.club) logos.set(athlete.club.trim().toLowerCase(), athlete.clubLogo);
    });
    return logos;
  }, [athletes]);

  const selectedGames = games
    .filter((game) => game.date === selectedDate)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const moveMonth = (direction: number) => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(nextMonth);

    const monthPrefix = formatDateKey(nextMonth).slice(0, 7);
    const firstGameInMonth = [...gameDates].filter((date) => date.startsWith(monthPrefix)).sort()[0];

    setSelectedDate(firstGameInMonth || formatDateKey(nextMonth));
  };

  const isCurrentMonth = currentMonth.getMonth() === initialMonth.getMonth() && currentMonth.getFullYear() === initialMonth.getFullYear();

  const resetToInitialMonth = () => {
    setCurrentMonth(initialMonth);
    setSelectedDate(todayKey);
  };

  const selectedDateValue = new Date(`${selectedDate}T12:00:00`);

  return (
    <div className="min-h-screen px-3 pb-12 pt-6 sm:px-6 sm:pt-10 lg:px-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-white/10 bg-surface-low/80 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-4">
            <div className="mb-4 flex items-center justify-between gap-2 rounded-[2rem] border border-white/10 bg-[#1a1d22]/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <button onClick={() => moveMonth(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-surface-high text-on-surface-variant transition hover:border-primary/40 hover:text-white hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)]">
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center sm:flex-row sm:gap-2">
                <button
                  onClick={resetToInitialMonth}
                  disabled={isCurrentMonth && selectedDate === todayKey}
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] transition ${
                    isCurrentMonth && selectedDate === todayKey
                      ? 'border-white/10 bg-white/5 text-on-surface-variant opacity-60 cursor-not-allowed'
                      : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 shadow-[0_10px_25px_rgba(59,130,246,0.15)]'
                  }`}
                >
                  Hoje
                </button>

                <div className="flex items-center justify-center gap-2 text-center">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-white">{getMonthShortLabel(currentMonth)}</span>
                  <span className="text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-on-surface-variant">{currentMonth.getFullYear()}</span>
                </div>
              </div>

              <button onClick={() => moveMonth(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-surface-high text-on-surface-variant transition hover:border-primary/40 hover:text-white hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)]">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center sm:gap-2">
              {weekDays.map((day) => (
                <div key={day} className="py-2 text-[10px] font-black uppercase tracking-[0.08em] text-on-surface-variant sm:tracking-[0.25em]">
                  {day}
                </div>
              ))}

              {monthDays.map((day) => {
                const key = formatDateKey(day);
                const isInMonth = day.getMonth() === currentMonth.getMonth();
                const isSelected = selectedDate === key;
                const hasGame = gameDates.has(key);

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={`relative flex h-14 flex-col items-center justify-center rounded-xl border transition-all sm:h-20 sm:rounded-2xl ${
                      isSelected
                        ? 'border-primary bg-primary/15 text-white shadow-[0_12px_30px_rgba(59,130,246,0.25)]'
                        : isInMonth
                          ? 'border-white/5 bg-surface-high text-white/90 hover:border-white/20'
                          : 'border-white/5 bg-surface-high/60 text-white/35'
                    }`}
                  >
                    <span className={`text-sm font-black ${key === todayKey ? 'underline decoration-2 underline-offset-4' : ''}`}>{day.getDate()}</span>
                    {hasGame && (
                      <span className={`mt-1 h-2 w-2 rounded-full ${isSelected ? 'bg-primary' : 'bg-green-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="flex flex-col rounded-[28px] border border-white/10 bg-surface-low/80 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5 xl:h-[calc(100vh-10rem)] xl:min-h-[420px]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Agenda</p>
                <h3 className="mt-2 text-[clamp(1.1rem,1.8vw,1.8rem)] font-black uppercase italic leading-none text-white">
                  {selectedDateValue.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </h3>
              </div>

              {onSaveGame && (
                <button
                  type="button"
                  onClick={() => setFormGame('new')}
                  className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-background shadow-[0_8px_24px_rgba(255,255,255,0.14)] transition hover:scale-[1.03]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar jogo
                </button>
              )}
            </div>

            <div
              // Só rola por dentro quando a agenda fica ao lado do calendário; empilhada (celular), cresce com a página
              className="agenda-scroll flex-1 space-y-3 xl:overflow-y-auto xl:pr-1"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#7a7a7a transparent' }}
            >
              {selectedGames.length > 0 ? (
                selectedGames.map((game) => {
                  const gameAthletes = game.athleteIds
                    .map((id) => athletesById.get(id))
                    .filter((athlete): athlete is Athlete => !!athlete);

                  return (
                    <div key={game.id} className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#24272b] to-[#17191c] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_rgba(0,0,0,0.45)]">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.07] to-transparent" />

                      <div className="relative flex items-center gap-2 px-5 pt-4">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Trophy className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <p className="min-w-0 break-words text-[9px] font-black uppercase leading-tight tracking-[0.24em] text-primary">
                            {game.competition || 'Jogo'}
                            {game.round && <span className="text-on-surface-variant"> · {/^\d+$/.test(game.round) ? `Rodada ${game.round}` : game.round}</span>}
                          </p>
                        </div>
                        {game.category && (
                          <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-background">
                            {game.category}
                          </span>
                        )}
                        {onSaveGame && (
                          <button
                            type="button"
                            onClick={() => setFormGame(game)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition hover:border-primary hover:bg-primary hover:text-background"
                            aria-label="Editar jogo"
                            title="Editar jogo"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        {onDeleteGame && (
                          <button
                            type="button"
                            onClick={() => handleDeleteGame(game.id)}
                            onBlur={() => setConfirmingDeleteId((current) => (current === game.id ? null : current))}
                            disabled={deletingId === game.id}
                            className={`flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full border text-[8px] font-black uppercase tracking-[0.18em] transition disabled:opacity-50 ${confirmingDeleteId === game.id ? 'border-error bg-error px-2.5 text-white' : 'w-7 border-white/10 bg-white/5 text-white/75 hover:border-error/40 hover:bg-error/15 hover:text-error'}`}
                            aria-label={confirmingDeleteId === game.id ? 'Confirmar exclusão do jogo' : 'Apagar jogo'}
                            title={confirmingDeleteId === game.id ? 'Clique de novo para apagar' : 'Apagar jogo'}
                          >
                            <Trash2 className="h-3 w-3" />
                            {confirmingDeleteId === game.id && 'Confirmar'}
                          </button>
                        )}
                      </div>

                      <div className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 pb-5 pt-5 sm:gap-3 sm:px-5">
                        <div className="flex min-w-0 flex-col items-center gap-2.5 text-center">
                          <TeamCrest name={game.home} logo={clubLogos.get(game.home.trim().toLowerCase())} />
                          <p className="w-full break-words text-[13px] font-black uppercase italic leading-tight text-white">{game.home}</p>
                          <span className="text-[7px] font-black uppercase tracking-[0.26em] text-on-surface-variant">Mandante</span>
                        </div>

                        <div className="flex flex-col items-center pt-2">
                          <span className="text-2xl font-black italic leading-none tracking-tight text-white">{game.time || '--:--'}</span>
                          <span className="mt-2 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] text-on-surface-variant">
                            <span className="h-px w-3 bg-white/20" />
                            VS
                            <span className="h-px w-3 bg-white/20" />
                          </span>
                        </div>

                        <div className="flex min-w-0 flex-col items-center gap-2.5 text-center">
                          <TeamCrest name={game.away} logo={clubLogos.get(game.away.trim().toLowerCase())} />
                          <p className="w-full break-words text-[13px] font-black uppercase italic leading-tight text-white">{game.away}</p>
                          <span className="text-[7px] font-black uppercase tracking-[0.26em] text-on-surface-variant">Visitante</span>
                        </div>
                      </div>

                      {game.venue && (
                        <div className="relative flex items-center justify-center gap-2 border-t border-white/[0.06] px-5 py-3 text-[9px] font-black uppercase leading-tight tracking-[0.2em] text-on-surface-variant">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="min-w-0 break-words">{game.venue}</span>
                        </div>
                      )}

                      <div className="relative border-t border-white/[0.06] bg-black/20 px-5 pb-5 pt-4">
                        <div className="mb-3 flex items-center gap-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.26em] text-on-surface-variant">
                            {gameAthletes.length === 1 ? 'Atleta em campo' : 'Atletas em campo'}
                          </p>
                          <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                        </div>
                        {gameAthletes.length > 0 ? (
                          <div className="space-y-2">
                            {gameAthletes.map((athlete) => (
                              <button
                                key={athlete.id}
                                type="button"
                                onClick={() => onSelectAthlete?.(athlete)}
                                className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2 pr-3 text-left transition hover:border-white/30 hover:bg-white/[0.07]"
                                title="Abrir perfil"
                              >
                                <img src={athlete.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/40 ring-offset-2 ring-offset-[#17191c]" />
                                <div className="min-w-0 flex-1">
                                  <p className="break-words text-[11px] font-black uppercase leading-tight tracking-[0.06em] text-white">{fullName(athlete)}</p>
                                  <p className="mt-1 break-words text-[8px] font-black uppercase leading-tight tracking-[0.18em] text-on-surface-variant">
                                    {[athlete.position, athlete.category].filter(Boolean).join(' · ')}
                                  </p>
                                </div>
                                {game.athleteMinutes[athlete.id] > 0 && (
                                  <span className="flex shrink-0 items-center gap-1 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                                    <Clock3 className="h-3 w-3" /> {game.athleteMinutes[athlete.id]} min
                                  </span>
                                )}
                                <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-white/50">Nenhum atleta vinculado.</p>
                        )}
                      </div>
                    </div>
                  );
                })
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

      {formGame && onSaveGame && (
        <GameForm
          game={formGame === 'new' ? undefined : formGame}
          initialDate={selectedDate}
          athletes={athletes}
          onSave={onSaveGame}
          onDelete={onDeleteGame}
          onClose={() => setFormGame(null)}
        />
      )}
    </div>
  );
};
