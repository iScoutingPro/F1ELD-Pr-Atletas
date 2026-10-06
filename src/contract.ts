import { Athlete, ContractGoal, ScoutEntry } from './types';
import { SCOUT_FIELDS, scoutValue } from './scout';

// A partir deste percentual a meta aparece como "chegando perto"
export const NEAR_PERCENT = 80;

export const formatNumber = (value: number, percent?: boolean) =>
  `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${percent ? '%' : ''}`;

// Data da partida do lançamento ("2026" + "03.01 às 13h00") no formato "2026-01-03"; vazio quando não dá para reconhecer
const entryDateKey = (entry: ScoutEntry) => {
  const date = entry.matchDate.match(/(\d{1,2})[./](\d{1,2})/);
  return date && /^\d{4}$/.test(entry.year.trim()) ? `${entry.year.trim()}-${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}` : '';
};

export interface GoalProgress {
  goal: ContractGoal;
  value: number;
  percent: number;
  remaining: number;
  status: 'done' | 'near' | 'progress';
  isPercent: boolean;
}

// Progresso de cada meta do contrato (usado no ícone Contrato do perfil e no PDF do atleta)
export const contractGoalProgress = (athlete: Athlete, entries: ScoutEntry[]): GoalProgress[] => {
  // Soma do scout dentro da vigência do contrato; lançamento sem data reconhecível entra na conta
  const startKey = athlete.contractStart?.slice(0, 10) || '';
  const endKey = athlete.contractEnd?.slice(0, 10) || '';
  const totals: Record<string, number> = {};
  entries.forEach((entry) => {
    const key = entryDateKey(entry);
    if (key && ((startKey && key < startKey) || (endKey && key > endKey))) return;
    Object.entries(entry.stats).forEach(([stat, value]) => { totals[stat] = (totals[stat] || 0) + value; });
  });

  return (athlete.contractGoals || []).map((goal) => {
    const field = SCOUT_FIELDS.find((item) => item.key === goal.metric);
    const value = field ? scoutValue(field, totals) || 0 : goal.current || 0;
    const percent = goal.target > 0 ? Math.max(0, Math.min(100, Math.round((value / goal.target) * 100))) : 0;
    const status = goal.target > 0 && value >= goal.target ? 'done' : percent >= NEAR_PERCENT ? 'near' : 'progress';
    return { goal, value, percent, remaining: Math.max(0, goal.target - value), status, isPercent: Boolean(field?.percent) };
  });
};
