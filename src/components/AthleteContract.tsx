import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, ExternalLink, Pencil, Plus, ScrollText, Target, Trash2, TrendingUp, Trophy } from 'lucide-react';
import { Athlete, ContractGoal, ScoutEntry } from '../types';
import { SCOUT_FIELDS } from '../scout';
import { contractGoalProgress, formatNumber } from '../contract';
import { SheetSelect } from './SheetSelect';

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const labelClass = 'text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant';
const inputClass = 'h-[46px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-white outline-none transition placeholder:font-medium placeholder:text-on-surface-variant focus:border-primary';

const MANUAL = 'manual';
const METRIC_OPTIONS = [
  { value: MANUAL, label: 'Manual (número digitado)' },
  ...SCOUT_FIELDS.map((field) => ({ value: field.key, label: `Scout: ${field.label}` })),
];

const SectionTitle = ({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <span className="h-4 w-0.5 rounded-full bg-primary" />
    <h3 className="text-base font-black uppercase tracking-[0.12em] text-primary underline decoration-2 underline-offset-8">{children}</h3>
    <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    {aside && <span className="text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant">{aside}</span>}
  </div>
);

const toDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: string) => toDate(value)?.toLocaleDateString('pt-BR') || '';

// Aceita vírgula ou ponto; devolve NaN quando o texto não é número
const parseNumber = (text: string) => (text.trim() ? Number(text.trim().replace(',', '.')) : NaN);

const onlyNumber = (event: React.FormEvent<HTMLInputElement>) => {
  const input = event.currentTarget;
  input.value = input.value.replace(/[^\d.,]/g, '').replace(/([.,].*)[.,]/g, '$1');
};

interface AthleteContractProps {
  athlete: Athlete;
  // Lançamentos de scout do atleta: alimentam as metas ligadas a um número do scout
  entries: ScoutEntry[];
  isAdmin: boolean;
  // Devolve true quando as metas foram gravadas
  onSaveGoals: (goals: ContractGoal[]) => Promise<boolean>;
}

// Contrato do atleta (ícone Contrato do perfil): vigência, documento e as metas estipuladas no contrato, com o progresso de cada uma
export const AthleteContract = ({ athlete, entries, isAdmin, onSaveGoals }: AthleteContractProps) => {
  const goals = athlete.contractGoals || [];
  // null = formulário fechado; 'new' = meta nova; senão o id da meta em edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState(MANUAL);
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const start = toDate(athlete.contractStart);
  const end = toDate(athlete.contractEnd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const DAY = 86400000;
  const elapsedPercent = start && end && end > start
    ? Math.max(0, Math.min(100, Math.round(((today.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)))
    : null;
  const daysLeft = end ? Math.round((end.getTime() - today.getTime()) / DAY) : null;
  const hasContract = Boolean(athlete.contractLevel || start || end || athlete.contractLink);

  const progress = contractGoalProgress(athlete, entries);
  const doneCount = progress.filter((item) => item.status === 'done').length;
  const nearCount = progress.filter((item) => item.status === 'near').length;
  const overallPercent = goals.length ? Math.round(progress.reduce((total, item) => total + item.percent, 0) / goals.length) : 0;

  const openForm = (goal?: ContractGoal) => {
    setEditingId(goal?.id || 'new');
    setTitle(goal?.title || '');
    setMetric(goal?.metric || MANUAL);
    setTarget(goal ? String(goal.target).replace('.', ',') : '');
    setCurrent(goal?.current !== undefined ? String(goal.current).replace('.', ',') : '');
    setFormError('');
    setConfirmingDelete(null);
  };

  const saveGoals = async (next: ContractGoal[]) => {
    setSaving(true);
    const saved = await onSaveGoals(next);
    setSaving(false);
    return saved;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const field = SCOUT_FIELDS.find((item) => item.key === metric);
    const goalTitle = title.trim() || field?.label || '';
    const targetValue = parseNumber(target);
    const currentValue = parseNumber(current);
    if (!goalTitle) return setFormError('Escreva a meta.');
    if (!(targetValue > 0)) return setFormError('Informe o objetivo da meta, maior que zero.');
    if (!field && current.trim() && Number.isNaN(currentValue)) return setFormError('O valor atual precisa ser um número.');

    const goal: ContractGoal = {
      id: editingId && editingId !== 'new' ? editingId : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: goalTitle,
      metric,
      target: targetValue,
      ...(field ? {} : { current: Number.isNaN(currentValue) ? 0 : currentValue }),
    };
    const next = editingId === 'new' ? [...goals, goal] : goals.map((item) => (item.id === goal.id ? goal : item));
    if (await saveGoals(next)) setEditingId(null);
  };

  const removeGoal = async (id: string) => {
    if (confirmingDelete !== id) return setConfirmingDelete(id);
    if (await saveGoals(goals.filter((item) => item.id !== id))) setConfirmingDelete(null);
  };

  const scoutMetric = metric !== MANUAL;

  return (
    <div className="mt-8 space-y-8">
      <section className="space-y-3">
        <SectionTitle>Contrato</SectionTitle>
        {hasContract ? (
          <div className={`${panelClass} relative overflow-hidden p-5 sm:p-6`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className={labelClass}>Tipo de contrato</p>
                <p className="mt-1 text-sm font-black uppercase text-white">{athlete.contractLevel || '—'}</p>
              </div>
              <div>
                <p className={labelClass}>Início</p>
                <p className="mt-1 text-sm font-black text-white">{formatDate(athlete.contractStart) || '—'}</p>
              </div>
              <div>
                <p className={labelClass}>Término</p>
                <p className="mt-1 text-sm font-black text-white">{formatDate(athlete.contractEnd) || '—'}</p>
              </div>
              <div>
                <p className={labelClass}>Situação</p>
                <p className="mt-1 text-sm font-black text-white">
                  {daysLeft === null ? '—' : daysLeft < 0 ? 'Encerrado' : daysLeft === 0 ? 'Termina hoje' : `Faltam ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`}
                </p>
              </div>
            </div>

            {elapsedPercent !== null && (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className={labelClass}>Vigência do contrato</p>
                  <p className="text-[10px] font-black tracking-[0.12em] text-white">{elapsedPercent}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${elapsedPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-white/50 to-white"
                  />
                </div>
              </div>
            )}

            {athlete.contractLink && (
              <a
                href={athlete.contractLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-[9px] font-black uppercase tracking-[0.2em] text-white transition hover:border-primary hover:bg-primary hover:text-background"
              >
                <ScrollText className="h-3.5 w-3.5" />
                Abrir contrato
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ) : (
          <div className={`${panelClass} p-8 text-center`}>
            <p className={labelClass}>Sem contrato</p>
            <p className="mt-2 text-sm text-white/70">Nenhuma informação de contrato cadastrada para este atleta.</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle aside={goals.length > 0 ? `${doneCount} de ${goals.length} ${doneCount === 1 ? 'batida' : 'batidas'}` : undefined}>Metas do contrato</SectionTitle>

        {goals.length > 0 && (
          <div className={`${panelClass} relative overflow-hidden p-5 sm:p-6`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="grid grid-cols-3 gap-3 text-center">
              {[{ label: 'Metas', value: goals.length }, { label: 'Batidas', value: doneCount }, { label: 'Perto de bater', value: nearCount }].map((item) => (
                <div key={item.label}>
                  <p className="text-3xl font-black leading-none text-white">{item.value}</p>
                  <p className={`mt-2 ${labelClass}`}>{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <p className={labelClass}>Progresso geral</p>
              <p className="text-[10px] font-black tracking-[0.12em] text-white">{overallPercent}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-white/50 to-white"
              />
            </div>
          </div>
        )}

        {goals.length === 0 && editingId === null && (
          <div className={`${panelClass} p-8 text-center`}>
            <Target className="mx-auto h-6 w-6 text-on-surface-variant" />
            <p className={`mt-3 ${labelClass}`}>Sem metas</p>
            <p className="mt-2 text-sm text-white/70">Nenhuma meta cadastrada para este contrato.</p>
          </div>
        )}

        <div className="space-y-3">
          {progress.map(({ goal, value, percent, remaining, status, isPercent }) => {
            const done = status === 'done';
            const near = status === 'near';
            const field = SCOUT_FIELDS.find((item) => item.key === goal.metric);
            return (
              <div
                key={goal.id}
                className={`relative overflow-hidden rounded-3xl border p-4 sm:p-5 ${done ? 'border-primary/60 bg-gradient-to-b from-white/[0.12] to-white/[0.03] shadow-[0_12px_40px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]' : `${near ? 'border-white/30' : 'border-white/10'} bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`}`}
              >
                {done && <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />}
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${done ? 'border-primary bg-primary text-background' : 'border-white/10 bg-white/[0.04] text-white'}`}>
                    {done ? <Trophy className="h-4 w-4" /> : near ? <TrendingUp className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-black uppercase italic leading-tight text-white">{goal.title}</p>
                    <p className={`mt-1 ${labelClass}`}>{field ? `Scout · ${field.label}` : 'Acompanhamento manual'}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openForm(goal)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:border-primary hover:bg-primary hover:text-background"
                        aria-label="Editar meta"
                        title="Editar meta"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => removeGoal(goal.id)}
                        onBlur={() => setConfirmingDelete(null)}
                        className={`flex h-8 items-center justify-center rounded-full border text-[9px] font-black uppercase tracking-[0.16em] transition ${confirmingDelete === goal.id ? 'border-error bg-error px-3 text-white' : 'w-8 border-white/10 bg-white/[0.04] text-white/75 hover:border-error/60 hover:text-error'}`}
                        aria-label="Excluir meta"
                        title="Excluir meta"
                      >
                        {confirmingDelete === goal.id ? 'Confirmar' : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="text-3xl font-black leading-none text-white">
                    {formatNumber(value, isPercent)}
                    <span className="ml-2 text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">de {formatNumber(goal.target, isPercent)}</span>
                  </p>
                  <p className="text-lg font-black leading-none text-white">{percent}%</p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${done ? 'bg-primary shadow-[0_0_16px_rgba(255,255,255,0.7)]' : 'bg-gradient-to-r from-white/40 to-white'}`}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {done ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-background">
                      <Check className="h-3 w-3" /> Meta batida
                    </span>
                  ) : near ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Chegando perto da meta
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
                      Em andamento
                    </span>
                  )}
                  <p className="text-xs font-bold text-white/70">
                    {done
                      ? value > goal.target ? `Objetivo superado em ${formatNumber(value - goal.target, isPercent)}.` : 'Objetivo do contrato atingido.'
                      : near ? `Falta pouco: ${formatNumber(remaining, isPercent)} para bater a meta.` : `Faltam ${formatNumber(remaining, isPercent)} para a meta.`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {isAdmin && editingId !== null && (
          <form onSubmit={submit} className={`${panelClass} space-y-4 p-4 sm:p-5`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{editingId === 'new' ? 'Nova meta' : 'Editar meta'}</p>
            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <label className="block sm:col-span-2">
                <span className={labelClass}>Meta{scoutMetric ? '' : ' *'}</span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={scoutMetric ? 'Ex.: Marcar 10 gols na temporada' : 'Ex.: Convocação para a seleção de base'}
                  className={`mt-2 ${inputClass}`}
                  autoFocus
                />
              </label>
              <div className="sm:col-span-2">
                <span className={labelClass}>Acompanhar por</span>
                <div className="mt-2">
                  <SheetSelect
                    value={metric}
                    options={METRIC_OPTIONS}
                    onChange={(next) => setMetric(next || MANUAL)}
                    label="Acompanhar por"
                    className="h-[46px] w-full rounded-2xl border bg-white/[0.04] px-4 text-sm transition"
                  />
                </div>
                <p className="mt-2 text-xs text-white/60">
                  {scoutMetric
                    ? 'O progresso vem sozinho dos lançamentos de scout do atleta, dentro do período do contrato.'
                    : 'O progresso é o valor atual digitado aqui; atualize pelo lápis da meta.'}
                </p>
              </div>
              <label className="block">
                <span className={labelClass}>Objetivo *</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={target}
                  onInput={onlyNumber}
                  onChange={(event) => setTarget(event.target.value)}
                  placeholder="Ex.: 10"
                  className={`mt-2 ${inputClass}`}
                />
              </label>
              {!scoutMetric && (
                <label className="block">
                  <span className={labelClass}>Valor atual</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={current}
                    onInput={onlyNumber}
                    onChange={(event) => setCurrent(event.target.value)}
                    placeholder="Ex.: 4"
                    className={`mt-2 ${inputClass}`}
                  />
                </label>
              )}
            </div>
            {formError && <p className="text-xs font-bold text-error">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="h-10 rounded-full border border-white/15 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-full bg-primary px-6 text-[9px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.03] disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar meta'}
              </button>
            </div>
          </form>
        )}

        {isAdmin && editingId === null && (
          <button
            type="button"
            onClick={() => openForm()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:border-primary hover:bg-primary hover:text-background"
          >
            <Plus className="h-4 w-4" />
            Adicionar meta
          </button>
        )}
      </section>
    </div>
  );
};
