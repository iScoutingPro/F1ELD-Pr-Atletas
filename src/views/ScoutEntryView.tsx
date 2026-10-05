import React, { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardList, Save } from 'lucide-react';
import { Athlete, Game } from '../types';
import { SCOUT_FIELDS } from '../scout';

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

type Draft = Record<string, Record<string, string>>;

interface ScoutEntryViewProps {
  games: Game[];
  athletes: Athlete[];
  onSaveScouts: (gameId: string, scouts: Record<string, Record<string, number>>) => Promise<boolean>;
}

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatDate = (date: string) => date.split('-').reverse().join('/');

const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 3);

// Lançamento do scout em formato de planilha (só admin): um jogo por vez, uma linha por atleta vinculado
export const ScoutEntryView = ({ games, athletes, onSaveScouts }: ScoutEntryViewProps) => {
  // Jogos do mais recente para o mais antigo
  const sortedGames = useMemo(
    () => [...games].sort((a, b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`)),
    [games],
  );

  // Abre no jogo mais recente já realizado
  const [gameId, setGameId] = useState(() => {
    const today = todayKey();
    return (sortedGames.find((game) => game.date <= today) || sortedGames[0])?.id || '';
  });
  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const game = sortedGames.find((item) => item.id === gameId) || sortedGames[0];
  const rows = game ? game.athleteIds.map((id) => athletes.find((athlete) => athlete.id === id)).filter((athlete): athlete is Athlete => Boolean(athlete)) : [];

  // Ao trocar de jogo, a grade carrega o scout já gravado dele
  useEffect(() => {
    const next: Draft = {};
    Object.entries(game?.athleteScouts || {}).forEach(([athleteId, scout]) => {
      next[athleteId] = Object.fromEntries(Object.entries(scout).map(([key, value]) => [key, String(value)]));
    });
    setDraft(next);
    setSaved(false);
  }, [game?.id]);

  const setCell = (athleteId: string, key: string, value: string) => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, [athleteId]: { ...prev[athleteId], [key]: onlyDigits(value) } }));
  };

  // Colar um bloco copiado da planilha preenche a grade a partir da célula clicada (para a direita e para baixo)
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    const lines = event.clipboardData.getData('text').replace(/\r/g, '').replace(/\n+$/, '').split('\n').map((line) => line.split('\t'));
    if (lines.length === 1 && lines[0].length === 1) return;
    event.preventDefault();
    setSaved(false);
    setDraft((prev) => {
      const next = { ...prev };
      lines.forEach((cells, lineIndex) => {
        const athlete = rows[rowIndex + lineIndex];
        if (!athlete) return;
        const row = { ...next[athlete.id] };
        cells.forEach((cell, cellIndex) => {
          const field = SCOUT_FIELDS[colIndex + cellIndex];
          if (field) row[field.key] = onlyDigits(cell);
        });
        next[athlete.id] = row;
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!game || saving) return;
    // Só vai para o banco o que foi preenchido, e só de quem continua vinculado ao jogo
    const scouts: Record<string, Record<string, number>> = {};
    rows.forEach((athlete) => {
      const filled = SCOUT_FIELDS.filter(({ key }) => (draft[athlete.id]?.[key] || '') !== '').map(({ key }) => [key, Number(draft[athlete.id][key])] as [string, number]);
      if (filled.length > 0) scouts[athlete.id] = Object.fromEntries(filled);
    });
    setSaving(true);
    const ok = await onSaveScouts(game.id, scouts);
    setSaving(false);
    setSaved(ok);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 pb-12 pt-10 lg:px-10 space-y-6">
      <section className={`${panelClass} p-6`}>
        <div className="flex flex-wrap items-center gap-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">Scout</h2>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Só administradores</span>
        </div>
        <p className="mt-2 text-sm text-white/70">
          Escolha o jogo e preencha os números de cada atleta. Dá para colar um bloco copiado da planilha: clique na primeira célula e cole.
        </p>

        {sortedGames.length > 0 && (
          <label className="mt-5 block">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Jogo</span>
            <select
              value={game?.id || ''}
              onChange={(event) => setGameId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-surface-high px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-primary"
            >
              {sortedGames.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatDate(item.date)} · {item.home} x {item.away}{item.competition ? ` · ${item.competition}` : ''}{item.category ? ` · ${item.category}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {!game ? (
        <div className={`${panelClass} p-8 text-center`}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Sem jogos</p>
          <p className="mt-2 text-sm text-white/70">Cadastre um jogo na aba Calendário para lançar o scout.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className={`${panelClass} p-8 text-center`}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Sem atletas</p>
          <p className="mt-2 text-sm text-white/70">Este jogo não tem atletas vinculados. Vincule os atletas na aba Calendário.</p>
        </div>
      ) : (
        <section className={`${panelClass} p-4`}>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-center">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface-low px-3 py-2 text-left text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Atleta</th>
                  {SCOUT_FIELDS.map(({ key, short, label }) => (
                    <th key={key} title={label} className="px-1 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-primary">{short}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((athlete, rowIndex) => (
                  <tr key={athlete.id}>
                    <td className="sticky left-0 z-10 border-t border-white/5 bg-surface-low px-3 py-2 text-left">
                      <div className="flex items-center gap-3">
                        <img src={athlete.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <p className="whitespace-nowrap text-xs font-black uppercase italic text-white">{athlete.name} {athlete.lastName}</p>
                          <p className="whitespace-nowrap text-[8px] font-black uppercase tracking-[0.18em] text-on-surface-variant">{athlete.position} · {athlete.category}</p>
                        </div>
                      </div>
                    </td>
                    {SCOUT_FIELDS.map(({ key, label }, colIndex) => (
                      <td key={key} className="border-t border-white/5 px-1 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={draft[athlete.id]?.[key] || ''}
                          onChange={(event) => setCell(athlete.id, key, event.target.value)}
                          onPaste={(event) => handlePaste(event, rowIndex, colIndex)}
                          onFocus={(event) => event.target.select()}
                          aria-label={`${label} de ${athlete.name} ${athlete.lastName}`}
                          title={label}
                          className="h-9 w-12 rounded-lg border border-white/10 bg-surface-high text-center text-sm font-black text-white outline-none transition focus:border-primary focus:bg-white/10"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">
            {SCOUT_FIELDS.map(({ key, short, label }) => (
              <span key={key}><span className="text-primary">{short}</span> {label}</span>
            ))}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-4">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                <Check className="h-3.5 w-3.5" /> Scout salvo
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.02] disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Salvando...' : 'Salvar scout'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
