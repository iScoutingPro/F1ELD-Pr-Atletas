import { ScoutEntry } from './types';

// Dados da partida de cada lançamento de scout (texto livre, como na planilha do usuário)
export const SCOUT_INFO_FIELDS = [
  { key: 'year', label: 'Ano' },
  { key: 'analyst', label: 'Analista' },
  { key: 'team', label: 'Equipe do Atleta' },
  { key: 'matchDate', label: 'Data/Horário da Partida' },
  { key: 'competition', label: 'Competição' },
  { key: 'round', label: 'Rodada' },
  { key: 'match', label: 'Partida' },
] as const;

export type ScoutInfoKey = typeof SCOUT_INFO_FIELDS[number]['key'];

type Stats = Record<string, number>;

// Soma das parcelas; undefined quando nenhuma foi lançada
const sum = (...keys: string[]) => (stats: Stats) =>
  keys.some((key) => stats[key] !== undefined) ? keys.reduce((total, key) => total + (stats[key] || 0), 0) : undefined;

// Percentual de acerto (certos sobre o total), arredondado; undefined quando o total é zero
const pct = (ok: string, ...others: string[]) => (stats: Stats) => {
  const total = sum(ok, ...others)(stats);
  return total ? Math.round(((stats[ok] || 0) / total) * 100) : undefined;
};

export interface ScoutField {
  key: string;
  label: string;
  // Marcação de 0 ou 1 (no perfil aparece só o nome, sem o número)
  flag?: boolean;
  // Coluna calculada pelo app a partir das outras (totais e percentuais): não é digitada nem gravada
  calc?: (stats: Stats) => number | undefined;
  percent?: boolean;
}

// Números do scout de cada lançamento, na ordem das colunas da planilha do usuário. A chave é o que vai gravado em
// scout_entries.stats; para incluir ou tirar um número basta alterar esta lista (não precisa mexer no banco)
export const SCOUT_FIELDS: ScoutField[] = [
  { key: 'starter', label: 'Titular', flag: true },
  { key: 'bench', label: 'Reserva', flag: true },
  { key: 'subIn', label: 'Entrou', flag: true },
  { key: 'subOut', label: 'Saiu', flag: true },
  { key: 'minutes', label: 'Minutagem' },
  { key: 'goals', label: 'Gols' },
  { key: 'assists', label: 'Assistência' },
  { key: 'preAssists', label: 'Pré Assistência' },
  { key: 'goalParticipations', label: 'Part. em Gol' },
  { key: 'actionsOk', label: 'Ações Bem Suc.' },
  { key: 'actionsBad', label: 'Ações Mal Suc.' },
  { key: 'actionsTotal', label: 'Ações Totais', calc: sum('actionsOk', 'actionsBad') },
  { key: 'actionsPct', label: '% das Ações', calc: pct('actionsOk', 'actionsBad'), percent: true },
  { key: 'passesCompleted', label: 'Passes Certos' },
  { key: 'passesMissed', label: 'Passes Errados' },
  { key: 'passesTotal', label: 'Passes Totais', calc: sum('passesCompleted', 'passesMissed') },
  { key: 'passesPct', label: '% Passes', calc: pct('passesCompleted', 'passesMissed'), percent: true },
  { key: 'longPassesCompleted', label: 'Passe Longo Certo' },
  { key: 'longPassesMissed', label: 'Passe Longo Errado' },
  { key: 'longPassesTotal', label: 'Totais de Passe Longo', calc: sum('longPassesCompleted', 'longPassesMissed') },
  { key: 'longPassesPct', label: '% Passes Longo', calc: pct('longPassesCompleted', 'longPassesMissed'), percent: true },
  { key: 'shotsOnTarget', label: 'Finalizações Certas' },
  { key: 'shotsOff', label: 'Finalizações Fora' },
  { key: 'shotsBlocked', label: 'Finalizações Bloq.' },
  { key: 'shotsTotal', label: 'Finalizações Totais', calc: sum('shotsOnTarget', 'shotsOff', 'shotsBlocked') },
  { key: 'shotsPct', label: '% de Finalização', calc: pct('shotsOnTarget', 'shotsOff', 'shotsBlocked'), percent: true },
  { key: 'crossesCompleted', label: 'Cruzamentos Certos' },
  { key: 'crossesMissed', label: 'Cruzamentos Errados' },
  { key: 'crossesTotal', label: 'Cruzamentos Totais', calc: sum('crossesCompleted', 'crossesMissed') },
  { key: 'crossesPct', label: '% de Cruzamentos', calc: pct('crossesCompleted', 'crossesMissed'), percent: true },
  { key: 'dribbledPast', label: 'Dribles Sofridos' },
  { key: 'ballLosses', label: 'Perda da Bola' },
  { key: 'tackles', label: 'Desarme' },
  { key: 'tacklesIncomplete', label: 'Desarme Inc.' },
  { key: 'interceptions', label: 'Interceptações' },
  { key: 'dribblesCompleted', label: 'Dribles Certos' },
  { key: 'dribblesMissed', label: 'Dribles Errados' },
  { key: 'dribblesTotal', label: 'Dribles Totais', calc: sum('dribblesCompleted', 'dribblesMissed') },
  { key: 'dribblesPct', label: '% de Dribles', calc: pct('dribblesCompleted', 'dribblesMissed'), percent: true },
  { key: 'foulsCommitted', label: 'Faltas Cometidas' },
  { key: 'foulsSuffered', label: 'Faltas Sofridas' },
  { key: 'yellowCards', label: 'Cartão Amarelo' },
  { key: 'redCards', label: 'Cartão Vermelho' },
  { key: 'aerialDefWon', label: 'Duelo Aéreo Def Vencido' },
  { key: 'aerialDefLost', label: 'Duelo Aéreo Def Perdido' },
  { key: 'aerialOffWon', label: 'Duelo Aéreo Ofensivo Vencido' },
  { key: 'aerialOffLost', label: 'Duelo Aéreo Ofensivo Perdido' },
  { key: 'offsides', label: 'Impedimentos' },
];

// Valor de um número do scout: o lançado ou, nas colunas calculadas, a conta sobre os lançados
export const scoutValue = (field: ScoutField, stats: Stats) => (field.calc ? field.calc(stats) : stats[field.key]);

// Texto do valor para a tela (percentual com "%"); vazio quando não há valor
export const formatScoutValue = (field: ScoutField, stats: Stats) => {
  const value = scoutValue(field, stats);
  return value === undefined ? '' : `${value}${field.percent ? '%' : ''}`;
};

// Chave de ordenação por data da partida: ano + "dd.mm às 13h00" (texto livre); sem data reconhecível, vale a ordem de lançamento
const sortKey = (entry: ScoutEntry) => {
  const date = entry.matchDate.match(/(\d{1,2})[./](\d{1,2})/);
  const time = entry.matchDate.match(/(\d{1,2})\s*[h:]\s*(\d{2})/i);
  const day = date ? `${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}` : '00-00';
  const hour = time ? `${time[1].padStart(2, '0')}:${time[2]}` : '00:00';
  return `${entry.year.padStart(4, '0')}-${day} ${hour} ${entry.createdAt || ''}`;
};

// Mês da partida no formato "2026-01" (ano da coluna Ano + mês da data); vazio quando o ano ou a data não são reconhecidos
export const scoutMonthKey = (entry: ScoutEntry) => {
  const date = entry.matchDate.match(/(\d{1,2})[./](\d{1,2})/);
  const month = date ? Number(date[2]) : 0;
  return /^\d{4}$/.test(entry.year.trim()) && month >= 1 && month <= 12 ? `${entry.year.trim()}-${String(month).padStart(2, '0')}` : '';
};

// Lançamentos da partida mais recente para a mais antiga
export const sortScoutEntries = (entries: ScoutEntry[]) =>
  [...entries].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
