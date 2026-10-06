import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ClipboardList, Minus, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { Athlete, Game, ScoutEntry, ScoutEntryInput } from '../types';
import { SCOUT_FIELDS, SCOUT_INFO_FIELDS, ScoutField, formatScoutValue, sortScoutEntries } from '../scout';
import { SheetSelect, normalize } from '../components/SheetSelect';
import { ScoutOverview } from '../components/ScoutOverview';

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

// Linha da planilha: chave da coluna -> texto digitado (na coluna Atleta, o id do atleta escolhido).
// gameId, fora das colunas, marca a linha que veio de um jogo do Calendário
type Row = Record<string, string>;

interface Column {
  key: string;
  label: string;
  // calc: total ou percentual calculado pelo app, não digitado
  kind: 'text' | 'athlete' | 'number' | 'calc';
  width: string;
  field?: ScoutField;
}

const INFO_WIDTHS: Record<string, string> = {
  year: 'min-w-[6.5rem]',
  team: 'min-w-[11rem]',
  matchDate: 'min-w-[9rem]',
  competition: 'min-w-[12rem]',
  round: 'min-w-[5.5rem]',
  match: 'min-w-[18rem]',
};

const infoColumn = ({ key, label }: { key: string; label: string }): Column => ({ key, label, kind: 'text', width: INFO_WIDTHS[key] });

// Mesma ordem de colunas da planilha do usuário
const COLUMNS: Column[] = [
  ...SCOUT_INFO_FIELDS.slice(0, 1).map(infoColumn),
  { key: 'athlete', label: 'Atleta', kind: 'athlete', width: 'min-w-[15rem]' },
  ...SCOUT_INFO_FIELDS.slice(1).map(infoColumn),
  ...SCOUT_FIELDS.map((field): Column => ({ key: field.key, label: field.label, kind: field.calc ? 'calc' : 'number', width: 'min-w-[4rem]', field })),
];

// A planilha de lançamento não tem os totais e percentuais: eles são calculados e aparecem só na tabela e no perfil
const SHEET_COLUMNS = COLUMNS.filter((column) => column.kind !== 'calc');

const BLANK_ROWS = 8;
// Linhas em branco depois das que vêm do Calendário
const EXTRA_BLANK_ROWS = 2;

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Data e horário do jogo no formato da planilha do usuário: "03.01 às 13h00"
const matchDateText = (date: string, time?: string) => {
  const [, month, day] = date.split('-');
  return `${day}.${month}${time ? ` às ${time.slice(0, 5).replace(':', 'h')}` : ''}`;
};

interface ScoutEntryViewProps {
  entries: ScoutEntry[];
  athletes: Athlete[];
  // Só para sugerir as competições já cadastradas no Calendário
  games: Game[];
  onSave: (rows: ScoutEntryInput[], editingId?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 3);

const cleanValue = (column: Column, value: string) => (column.kind === 'number' ? onlyDigits(value) : value);

const fullName = (athlete: Athlete) => `${athlete.name} ${athlete.lastName || ''}`.trim();

// Números digitados na linha, para gravar e para as colunas calculadas
const rowStats = (row: Row): Record<string, number> =>
  Object.fromEntries(SCOUT_FIELDS.filter(({ key, calc }) => !calc && (row[key] || '') !== '').map(({ key }) => [key, Number(row[key])]));

const isTextColumn = (column: Column) => column.kind === 'text' || column.kind === 'athlete';

// Valores sem repetição, em ordem alfabética
const uniqueSorted = (values: (string | undefined)[]) =>
  [...new Set<string>(values.map((value) => (value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const NO_CLUB = 'Sem Clube';

// Competição com a categoria no nome, como o usuário escreve na planilha ("Campeonato Paulista Sub-17").
// Os jogos do Calendário guardam a categoria num campo separado; Profissional não entra no nome
const withCategory = (competition?: string, category?: string) => {
  const name = (competition || '').trim();
  const suffix = (category || '').trim();
  if (!name || !suffix || suffix === 'Profissional' || normalize(name).includes(normalize(suffix))) return name;
  return `${name} ${suffix}`;
};

// Competições da categoria do atleta primeiro, mantendo a ordem alfabética dentro de cada grupo
const categoryFirst = (options: string[], category?: string) => {
  const suffix = normalize(category || '');
  if (!suffix || suffix === 'profissional') return options;
  const matches = (option: string) => normalize(option).includes(suffix);
  return [...options.filter(matches), ...options.filter((option) => !matches(option))];
};

interface ChoiceCellProps {
  value: string;
  options: string[];
  // Com "Outra…" a célula vira campo de texto para digitar um valor que ainda não está na lista
  allowOther?: boolean;
  onChange: (value: string) => void;
  label: string;
  className: string;
}

// Célula de lista suspensa da planilha (Ano, Equipe do Atleta e Competição)
const ChoiceCell = ({ value, options, allowOther, onChange, label, className }: ChoiceCellProps) => {
  const [typing, setTyping] = useState(false);

  if (typing) {
    return (
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setTyping(false)}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        aria-label={label}
        title={label}
        placeholder="Digite"
        className={`${className} border-primary font-bold`}
      />
    );
  }

  // Valor já gravado que não está na lista continua aparecendo
  const list = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <SheetSelect
      value={value}
      options={list.map((option) => ({ value: option, label: option }))}
      onChange={onChange}
      onOther={allowOther ? () => { onChange(''); setTyping(true); } : undefined}
      label={label}
      className={className}
    />
  );
};

// Linha do Calendário em que nenhum número foi digitado: não é salva e volta na próxima vez
const isUntouchedGameRow = (row: Row) => Boolean(row.gameId) && Object.keys(rowStats(row)).length === 0;

const isEmptyRow = (row: Row) => SHEET_COLUMNS.every(({ key }) => (row[key] || '').trim() === '');

// Lançamento do scout (só admin): o botão abre uma planilha, uma linha por atleta em cada partida,
// e a tela lista embaixo tudo o que já foi lançado. A planilha já abre com os jogos do Calendário que aguardam scout.
// O lançamento é só no computador: no celular (abaixo de sm) o botão, as caixas de seleção e os botões de editar e excluir somem e fica só a tabela
export const ScoutEntryView = ({ entries, athletes, games, onSave, onDelete }: ScoutEntryViewProps) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ScoutEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const athleteById = useMemo(() => new Map(athletes.map((athlete) => [athlete.id, athlete])), [athletes]);
  // Opções da coluna Atleta: todos os cadastrados, em ordem alfabética. Quem está nas duas listas tem dois cadastros
  // com o mesmo nome e aparece uma vez só (vale o de Agenciados); na edição, o cadastro já gravado entra como está
  const athleteOptions = useMemo(() => {
    const byName = new Map<string, Athlete>();
    const original = editing ? athleteById.get(editing.athleteId) : undefined;
    [...(original ? [original] : []), ...athletes.filter((a) => a.listType !== 'negociados'), ...athletes].forEach((athlete) => {
      const name = normalize(fullName(athlete));
      if (!byName.has(name)) byName.set(name, athlete);
    });
    return [...byName.values()].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [athletes, athleteById, editing]);

  // Listas suspensas da planilha: o que já existe no app mais o que foi digitado nas outras linhas
  const choices = useMemo<Record<string, { options: string[]; allowOther?: boolean }>>(() => {
    const thisYear = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, index) => String(thisYear + 1 - index));
    return {
      year: { options: [...new Set<string>([...years, ...entries.map((entry) => entry.year).filter(Boolean)])].sort((a, b) => b.localeCompare(a)) },
      team: {
        options: uniqueSorted([...athletes.map((athlete) => athlete.club).filter((club) => club !== NO_CLUB), ...entries.map((entry) => entry.team), ...rows.map((row) => row.team)]),
        allowOther: true,
      },
      competition: {
        options: uniqueSorted([...games.map((game) => withCategory(game.competition, game.category)), ...entries.map((entry) => entry.competition), ...rows.map((row) => row.competition)]),
        allowOther: true,
      },
    };
  }, [athletes, entries, games, rows]);

  // Jogos do Calendário já realizados que ainda não têm scout: uma linha por atleta vinculado, do jogo mais antigo para o mais novo,
  // já com ano, equipe, data, competição e partida. O jogo sai da lista quando o scout daquele atleta é salvo
  const pendingRows = useMemo(() => {
    const today = todayKey();
    const done = new Set(entries.filter((entry) => entry.gameId).map((entry) => `${entry.gameId}|${entry.athleteId}`));
    return [...games]
      .filter((game) => game.date <= today)
      .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))
      .flatMap((game) => game.athleteIds
        .filter((id) => athleteById.has(id) && !done.has(`${game.id}|${id}`))
        .map((id): Row => {
          const club = athleteById.get(id)!.club;
          return {
            gameId: game.id,
            athlete: id,
            year: game.date.slice(0, 4),
            team: club && club !== NO_CLUB ? club : '',
            matchDate: matchDateText(game.date, game.time),
            competition: withCategory(game.competition, game.category),
            round: game.round || '',
            match: `${game.home} x ${game.away}`,
          };
        }));
  }, [games, entries, athleteById]);

  // Jogos do Calendário que ainda não entram na planilha, para o topo da aba explicar o motivo:
  // os de data futura (entram no dia do jogo) e os já realizados sem atleta vinculado
  const waitingGames = useMemo(() => {
    const today = todayKey();
    const linked = (game: Game) => game.athleteIds.some((id) => athleteById.has(id));
    return {
      future: games.filter((game) => game.date > today && linked(game)).length,
      withoutAthletes: games.filter((game) => game.date <= today && !linked(game)).length,
    };
  }, [games, athleteById]);
  const calendarStatus = [
    pendingRows.length > 0 && `${pendingRows.length} ${pendingRows.length === 1 ? 'scout pendente' : 'scouts pendentes'}`,
    waitingGames.future > 0 && `${waitingGames.future} ${waitingGames.future === 1 ? 'jogo futuro entra' : 'jogos futuros entram'} na data do jogo`,
    waitingGames.withoutAthletes > 0 && `${waitingGames.withoutAthletes} ${waitingGames.withoutAthletes === 1 ? 'jogo' : 'jogos'} sem atleta vinculado`,
  ].filter(Boolean);

  // Ao escolher o atleta, a linha já vem com o ano atual, o clube do cadastro e a competição do último scout dele
  const pickAthlete = (rowIndex: number, athleteId: string) => {
    const athlete = athleteById.get(athleteId);
    const last = sortScoutEntries(entries).find((entry) => entry.athleteId === athleteId);
    setSheetError('');
    setRows((prev) => prev.map((row, index) => (index !== rowIndex ? row : {
      ...row,
      athlete: athleteId,
      year: row.year || (athlete ? String(new Date().getFullYear()) : ''),
      team: athlete && athlete.club && athlete.club !== NO_CLUB ? athlete.club : (row.team || ''),
      competition: last?.competition || row.competition || '',
    })));
  };

  const openSheet = (entry?: ScoutEntry) => {
    setEditing(entry || null);
    setSheetError('');
    if (entry) {
      const row: Row = { athlete: athleteById.has(entry.athleteId) ? entry.athleteId : '', gameId: entry.gameId || '' };
      SCOUT_INFO_FIELDS.forEach(({ key }) => { row[key] = entry[key]; });
      Object.entries(entry.stats).forEach(([key, value]) => { row[key] = String(value); });
      setRows([row]);
    } else {
      // Primeiro os jogos do Calendário que aguardam scout, depois linhas em branco para lançar à mão
      setRows([...pendingRows.map((row) => ({ ...row })), ...Array.from({ length: pendingRows.length > 0 ? EXTRA_BLANK_ROWS : BLANK_ROWS }, () => ({}))]);
    }
    setSheetOpen(true);
  };

  useEffect(() => {
    if (!sheetOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sheetOpen]);

  const setCell = (rowIndex: number, column: Column, value: string) => {
    setSheetError('');
    setRows((prev) => prev.map((row, index) => (index === rowIndex ? { ...row, [column.key]: cleanValue(column, value) } : row)));
  };

  // A planilha nunca fica sem linha: remover a única deixa uma em branco
  const removeRow = (rowIndex: number) => {
    setSheetError('');
    setRows((prev) => (prev.length > 1 ? prev.filter((_, index) => index !== rowIndex) : [{}]));
  };

  const handleSave = async () => {
    if (saving) return;
    const filled = rows.filter((row) => !isEmptyRow(row) && !isUntouchedGameRow(row));
    if (filled.length === 0) {
      setSheetError(rows.some(isUntouchedGameRow) ? 'Preencha os números de pelo menos uma linha.' : 'Preencha pelo menos uma linha.');
      return;
    }

    if (filled.some((row) => !athleteById.has(row.athlete || ''))) {
      setSheetError('Escolha o atleta em todas as linhas preenchidas.');
      return;
    }

    const info = (row: Row, key: string) => (row[key] || '').trim();
    const inputs: ScoutEntryInput[] = filled.map((row) => ({
      athleteId: row.athlete,
      gameId: row.gameId || undefined,
      year: info(row, 'year'),
      // A coluna Analista saiu da planilha; lançamento antigo mantém o que já tinha
      analyst: editing?.analyst || '',
      team: info(row, 'team'),
      matchDate: info(row, 'matchDate'),
      competition: info(row, 'competition'),
      round: info(row, 'round'),
      match: info(row, 'match'),
      // Só vão para o banco os números preenchidos; totais e percentuais são calculados na hora de exibir
      stats: rowStats(row),
    }));

    setSaving(true);
    const ok = await onSave(inputs, editing?.id);
    setSaving(false);
    if (ok) setSheetOpen(false);
  };

  const sorted = useMemo(() => sortScoutEntries(entries), [entries]);
  const term = normalize(search);
  const visible = term
    ? sorted.filter((entry) => {
        const athlete = athleteById.get(entry.athleteId);
        return normalize(`${athlete ? fullName(athlete) : ''} ${entry.team} ${entry.competition} ${entry.match}`).includes(term);
      })
    : sorted;

  // Seleção de lançamentos: os botões do topo da tabela (editar e excluir) agem sobre as linhas marcadas.
  // Só contam as marcadas que estão na tela, para a pesquisa não deixar nada selecionado escondido
  const selectedEntries = visible.filter((entry) => selected.includes(entry.id));
  const allSelected = visible.length > 0 && selectedEntries.length === visible.length;

  const toggleSelected = (id: string) => {
    setConfirmingDelete(false);
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    setConfirmingDelete(false);
    setSelected(allSelected ? [] : visible.map((entry) => entry.id));
  };

  // Exclusão com confirmação em dois cliques; para no primeiro lançamento que não puder ser apagado
  const handleDeleteSelected = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setConfirmingDelete(false);
    setDeleting(true);
    for (const entry of selectedEntries) {
      if (!(await onDelete(entry.id))) break;
    }
    setDeleting(false);
    setSelected([]);
  };

  const headClass = 'whitespace-nowrap px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em]';
  const cellClass = 'whitespace-nowrap border-t border-white/5 px-3 py-2.5 text-xs text-white/80';
  // A caixa de seleção e o nome do atleta ficam parados à esquerda ao rolar a tabela para o lado
  const stickyClass = 'sticky left-0 z-10 sm:left-10';
  const checkColumnClass = 'sticky left-0 z-10 w-10 min-w-10 !px-0 max-sm:hidden';
  // As colunas paradas precisam de fundo sólido, igual ao da linha, para os números não aparecerem por baixo ao rolar
  const stickyBg = (isSelected: boolean) => (isSelected ? 'bg-surface-high' : 'bg-surface-low group-hover:bg-surface');
  const checkBoxClass = (on: boolean) => `mx-auto flex h-[18px] w-[18px] items-center justify-center rounded-md border transition ${on ? 'border-primary bg-primary text-background' : 'border-white/25 text-transparent hover:border-white/60'}`;
  const toolButtonClass = 'flex h-9 items-center justify-center gap-1.5 rounded-full border px-4 text-[9px] font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-35';
  const neutralToolClass = 'border-white/10 text-on-surface-variant enabled:hover:bg-white/10 enabled:hover:text-white';

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pb-12 pt-6 sm:px-6 sm:pt-10 lg:px-10 space-y-6">
      <section className={`${panelClass} flex flex-wrap items-center justify-between gap-4 p-6`}>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">Scout</h2>
          </div>
        </div>
        {calendarStatus.length > 0 && (
          <p className="ml-auto text-right text-[9px] font-black uppercase leading-relaxed tracking-[0.2em] text-on-surface-variant max-sm:hidden">
            <span className="text-white">Calendário</span> · {calendarStatus.join(' · ')}
          </p>
        )}
        <button
          type="button"
          onClick={() => openSheet()}
          className="hidden items-center gap-2 rounded-full bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.02] sm:inline-flex"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar scout
        </button>
      </section>

      <ScoutOverview entries={entries} athletes={athletes} />

      <section className="rounded-3xl border border-white/10 bg-surface-low p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex flex-wrap items-center gap-3 px-1">
          {sorted.length > 0 && (
            <>
              <label className="relative block w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar atleta, equipe ou partida"
                  className="w-full rounded-full border border-white/10 bg-surface-high py-2 pl-9 pr-4 text-xs font-bold text-white outline-none transition placeholder:text-on-surface-variant focus:border-primary"
                />
              </label>
              <div className="flex items-center gap-2 max-sm:hidden">
                <button
                  type="button"
                  onClick={() => openSheet(selectedEntries[0])}
                  disabled={selectedEntries.length !== 1}
                  title={selectedEntries.length > 1 ? 'Selecione só um lançamento para editar' : 'Editar o lançamento selecionado'}
                  className={`${toolButtonClass} ${neutralToolClass}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  onBlur={() => setConfirmingDelete(false)}
                  disabled={selectedEntries.length === 0 || deleting}
                  title="Excluir os lançamentos selecionados"
                  className={`${toolButtonClass} ${confirmingDelete ? 'border-error/40 bg-error/15 text-error hover:bg-error hover:text-white' : neutralToolClass}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {confirmingDelete ? `Confirmar (${selectedEntries.length})` : selectedEntries.length > 0 ? `Excluir (${selectedEntries.length})` : 'Excluir'}
                </button>
              </div>
            </>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">{sorted.length === 0 ? 'Sem lançamentos' : 'Nada encontrado'}</p>
            <p className="mt-2 text-sm text-white/70">
              {sorted.length === 0 ? 'Nenhum scout lançado ainda. O que for adicionado aparece aqui.' : 'Nenhum lançamento corresponde à pesquisa.'}
            </p>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-center">
              <thead>
                <tr>
                  <th className={`${headClass} ${checkColumnClass} bg-surface-low`}>
                    <button type="button" onClick={toggleAll} className={checkBoxClass(allSelected)} aria-label={allSelected ? 'Limpar seleção' : 'Selecionar todos'}>
                      <Check className="h-3 w-3" strokeWidth={4} />
                    </button>
                  </th>
                  {COLUMNS.map((column) => (
                    <th key={column.key} className={`${headClass} ${isTextColumn(column) ? 'text-on-surface-variant' : 'text-primary'} ${column.kind === 'athlete' ? `${stickyClass} bg-surface-low` : ''}`}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => {
                  const athlete = athleteById.get(entry.athleteId);
                  const isSelected = selected.includes(entry.id);
                  return (
                    <tr key={entry.id} className={`group ${isSelected ? 'bg-surface-high' : 'hover:bg-surface'}`}>
                      <td className={`${cellClass} ${checkColumnClass} ${stickyBg(isSelected)}`}>
                        <button type="button" onClick={() => toggleSelected(entry.id)} className={checkBoxClass(isSelected)} aria-label={isSelected ? 'Desmarcar lançamento' : 'Selecionar lançamento'} aria-pressed={isSelected}>
                          <Check className="h-3 w-3" strokeWidth={4} />
                        </button>
                      </td>
                      {COLUMNS.map(({ key, kind, field }) => (
                        <td key={key} className={`${cellClass} ${kind === 'athlete' ? `${stickyClass} ${stickyBg(isSelected)} font-black uppercase italic text-white` : ''} ${field ? 'font-black text-white' : ''}`}>
                          {kind === 'athlete'
                            ? (athlete ? fullName(athlete) : 'Atleta apagado')
                            : field
                              ? formatScoutValue(field, entry.stats)
                              : entry[key as keyof ScoutEntry] as string}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {sheetOpen && createPortal(
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/65 px-2 py-4 backdrop-blur-sm sm:px-4 sm:py-8" onClick={() => setSheetOpen(false)}>
          <div className="relative w-full max-w-[1800px] overflow-hidden rounded-[32px] border border-white/10 bg-[#17191c] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.8)] sm:p-6" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="absolute right-3 top-3 z-30 flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-error/40 bg-error/15 text-error shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-error hover:text-white active:bg-error active:text-white"
              aria-label="Fechar"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pr-12">
              <h3 className="text-xl font-black uppercase italic tracking-tight text-white">{editing ? 'Editar scout' : 'Adicionar scout'}</h3>
              <p className="mt-2 text-sm text-white/70">
                {editing
                  ? 'Altere as informações do lançamento e salve.'
                  : pendingRows.length > 0
                    ? 'Os jogos do Calendário já realizados vêm no início, com os dados da partida preenchidos: complete o placar em "Partida" e os números. Linha de jogo sem nenhum número não é salva e volta na próxima vez.'
                    : 'Preencha uma linha por atleta em cada partida. Ao escolher o atleta, o ano, a equipe e a competição já vêm preenchidos; confira e troque se for outro. Totais e percentuais não são preenchidos: o app calcula e mostra na tabela.'}
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-center">
                <thead>
                  <tr>
                    {!editing && <th />}
                    {SHEET_COLUMNS.map((column) => (
                      <th key={column.key} className={`whitespace-nowrap px-1 py-2 text-[9px] font-black uppercase tracking-[0.14em] ${isTextColumn(column) ? 'text-on-surface-variant' : 'text-primary'}`}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    // Linha com algo preenchido e sem atleta escolhido fica marcada
                    const athleteMissing = !isEmptyRow(row) && !row.athlete;
                    const untouched = isUntouchedGameRow(row);
                    const inputClass = 'h-10 w-full rounded-xl border bg-white/[0.04] px-2.5 text-center text-sm text-white outline-none transition focus:border-primary focus:bg-white/10';
                    return (
                      <tr key={rowIndex} title={untouched ? 'Jogo do Calendário aguardando os números' : undefined}>
                        {!editing && (
                          <td className="py-1 pr-1">
                            <button
                              type="button"
                              onClick={() => removeRow(rowIndex)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-on-surface-variant transition hover:border-error/40 hover:bg-error/15 hover:text-error"
                              aria-label={`Remover linha ${rowIndex + 1}`}
                              title="Remover linha"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                        {SHEET_COLUMNS.map((column) => (
                          <td key={column.key} className="px-0.5 py-1">
                            {column.kind === 'athlete' ? (
                              <SheetSelect
                                value={row.athlete || ''}
                                options={athleteOptions.map((athlete) => ({ value: athlete.id, label: fullName(athlete) }))}
                                onChange={(value) => pickAthlete(rowIndex, value)}
                                label={`Atleta, linha ${rowIndex + 1}`}
                                invalid={athleteMissing}
                                className={`${inputClass} ${column.width}`}
                              />
                            ) : choices[column.key] ? (
                              <ChoiceCell
                                value={row[column.key] || ''}
                                options={column.key === 'competition' ? categoryFirst(choices.competition.options, athleteById.get(row.athlete)?.category) : choices[column.key].options}
                                allowOther={choices[column.key].allowOther}
                                onChange={(value) => setCell(rowIndex, column, value)}
                                label={`${column.label}, linha ${rowIndex + 1}`}
                                className={`${inputClass} ${column.width}`}
                              />
                            ) : (
                              <input
                                type="text"
                                inputMode={column.kind === 'number' ? 'numeric' : undefined}
                                value={row[column.key] || ''}
                                onChange={(event) => setCell(rowIndex, column, event.target.value)}
                                aria-label={`${column.label}, linha ${rowIndex + 1}`}
                                title={column.label}
                                className={`${inputClass} ${column.width} border-white/10 hover:border-white/25 ${column.kind === 'number' ? 'font-black' : 'font-bold'}`}
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sheetError && <p className="mt-4 px-1 text-sm font-bold text-error">{sheetError}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
              {!editing && (
                <button
                  type="button"
                  onClick={() => setRows((prev) => [...prev, {}])}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar linha
                </button>
              )}
              {!editing && (
                <button
                  type="button"
                  onClick={() => removeRow(rows.length - 1)}
                  title="Remove a última linha da planilha"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
                >
                  <Minus className="h-3.5 w-3.5" />
                  Remover linha
                </button>
              )}
              <div className="flex flex-1 justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="rounded-full border border-white/10 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
                >
                  Cancelar
                </button>
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
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
