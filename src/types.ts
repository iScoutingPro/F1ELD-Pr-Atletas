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

export interface Game {
  id: string;
  date: string;
  time?: string;
  home: string;
  away: string;
  venue?: string;
  category?: string;
  competition?: string;
  athleteIds: string[];
  // Minutos jogados por atleta neste jogo (id do atleta -> minutos); quem não tem minutos lançados fica de fora
  athleteMinutes: Record<string, number>;
  // Scout antigo, lançado por jogo; não é mais usado (o scout agora fica em ScoutEntry), só é mantido como está no banco
  athleteScouts?: Record<string, Record<string, number>>;
}

// Um lançamento de scout: um atleta numa partida. Não depende dos jogos do Calendário
export interface ScoutEntry {
  id: string;
  athleteId: string;
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
