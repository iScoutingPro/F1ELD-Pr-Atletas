import { Game } from './types';

// Números do scout lançados por atleta em cada jogo. A chave é o que vai gravado em games.athlete_scouts;
// para incluir ou tirar um número basta alterar esta lista (não precisa mexer no banco)
export const SCOUT_FIELDS = [
  { key: 'goals', short: 'G', label: 'Gols' },
  { key: 'assists', short: 'A', label: 'Assistências' },
  { key: 'shots', short: 'FIN', label: 'Finalizações' },
  { key: 'shotsOnTarget', short: 'FG', label: 'Finalizações no gol' },
  { key: 'passesCompleted', short: 'PC', label: 'Passes certos' },
  { key: 'passesMissed', short: 'PE', label: 'Passes errados' },
  { key: 'tackles', short: 'DES', label: 'Desarmes' },
  { key: 'interceptions', short: 'INT', label: 'Interceptações' },
  { key: 'foulsCommitted', short: 'FC', label: 'Faltas cometidas' },
  { key: 'foulsSuffered', short: 'FS', label: 'Faltas sofridas' },
  { key: 'yellowCards', short: 'CA', label: 'Cartões amarelos' },
  { key: 'redCards', short: 'CV', label: 'Cartões vermelhos' },
  { key: 'saves', short: 'DEF', label: 'Defesas' },
  { key: 'goalsConceded', short: 'GS', label: 'Gols sofridos' },
] as const;

// Números só de goleiro: no perfil aparecem apenas para quem tem algum deles lançado
export const GOALKEEPER_FIELDS: string[] = ['saves', 'goalsConceded'];

// Scout do atleta num jogo; undefined quando nada foi lançado
export const scoutOf = (game: Game, athleteId: string) => {
  const scout = game.athleteScouts?.[athleteId];
  return scout && Object.keys(scout).length > 0 ? scout : undefined;
};
