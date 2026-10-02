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
  stats: {
    tactical: number;
    physical: number;
    technical: number;
  };
}

export type View = 'login' | 'dashboard' | 'calendar' | 'scout' | 'negociados' | 'agenciados-negociados' | 'atletas-totais' | 'athletes' | 'sessions' | 'settings' | 'security' | 'recovery' | 'verification' | 'success';

export interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
}
