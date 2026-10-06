import { LucideIcon } from 'lucide-react';

export interface Athlete {
  id: string;
  name: string;
  lastName: string;
  position: string;
  secondaryPosition?: string;
  category: string;
  club: string;
  clubLogo?: string;
  status: 'In Club' | 'Livre no Mercado';
  rating: string;
  image: string;
  naturalidade?: string;
  nacionalidade?: string;
  hasDualNationality?: boolean;
  secondNationality?: string;
  birthDate?: string;
  age?: number;
  preferredFoot?: string;
  weight?: number;
  height?: number;
  whatsappAthlete?: string;
  whatsappGuardian?: string;
  whatsappAgent?: string;
  hasAgent?: boolean;
  agentCompany?: string;
  agentName?: string;
  contractType?: 'Field' | 'Clube';
  contractLevel?: 'Profissional' | 'Amador';
  contractClub?: string;
  contractStart?: string;
  contractEnd?: string;
  contractLink?: string;
  contractGoals?: ContractGoal[];
  tacticalMeetings?: TacticalMeeting[];
  notes?: string;
  hasDvd?: boolean;
  dvdLink?: string;
  source: 'Captado' | 'Indicado';
  listType?: 'agenciados' | 'negociados';
  stats: {
    tactical: number;
    physical: number;
    technical: number;
  };
}

// Meta estipulada no contrato do atleta (ícone Contrato do perfil)
export interface ContractGoal {
  id: string;
  title: string;
  // 'manual' (o valor atual é digitado) ou a chave de um número do scout (SCOUT_FIELDS), somado dos lançamentos do atleta
  metric: string;
  target: number;
  // Só nas metas manuais
  current?: number;
}

// Vídeo ou PDF de uma reunião de acompanhamento tático; guardado como link, não há upload de arquivo
export interface TacticalMaterial {
  id: string;
  type: 'video' | 'pdf';
  title: string;
  url: string;
}

// Reunião da consultoria tática do atleta (ícone Acompanhamento Tático do perfil); agendada ou realizada conforme a data
export interface TacticalMeeting {
  id: string;
  // AAAA-MM-DD
  date: string;
  // HH:MM
  time?: string;
  title: string;
  notes?: string;
  materials: TacticalMaterial[];
}

export interface Game {
  id: string;
  date: string;
  time?: string;
  home: string;
  away: string;
  venue?: string;
  category?: string;
  competition?: string;
  // Texto livre: número da rodada ou a fase (ex.: "3", "Semi-Final")
  round?: string;
  athleteIds: string[];
  // Minutos jogados por atleta neste jogo (id do atleta -> minutos); quem não tem minutos lançados fica de fora
  athleteMinutes: Record<string, number>;
  // Scout antigo, lançado por jogo; não é mais usado (o scout agora fica em ScoutEntry), só é mantido como está no banco
  athleteScouts?: Record<string, Record<string, number>>;
}

// Um lançamento de scout: um atleta numa partida. Pode nascer de um jogo do Calendário (gameId), mas guarda os próprios dados
export interface ScoutEntry {
  id: string;
  athleteId: string;
  // Jogo do Calendário de onde a linha veio; vazio quando foi lançada à mão. Serve só para o jogo não voltar como pendente
  gameId?: string;
  year: string;
  analyst: string;
  team: string;
  // Texto livre, como na planilha (ex.: "03.01 às 13h00")
  matchDate: string;
  competition: string;
  round: string;
  match: string;
  // Número do scout -> valor; as chaves estão em SCOUT_FIELDS (src/scout.ts)
  stats: Record<string, number>;
  createdAt?: string;
}

export type ScoutEntryInput = Omit<ScoutEntry, 'id' | 'createdAt'>;

export type View ='login' | 'dashboard' | 'calendar' | 'scout' | 'lancar-scout' | 'negociados' | 'agenciados-negociados' | 'atletas-totais' | 'athletes' | 'sessions' | 'settings' | 'security' | 'recovery' | 'verification' | 'success';

export interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
}
