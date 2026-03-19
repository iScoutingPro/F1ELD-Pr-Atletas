
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
  birthDate?: string;
  age?: number;
  preferredFoot?: string;
  notes?: string;
  stats: {
    tactical: number;
    physical: number;
    technical: number;
  };
}

export const MOCK_ATHLETES: Athlete[] = [
  {
    id: '1',
    name: 'Ricardo',
    lastName: 'Silva',
    position: 'Meia',
    category: 'Sub-20',
    club: 'FC Porto',
    clubLogo: 'https://www.google.com/s2/favicons?domain=fcporto.pt&sz=128',
    status: 'In Club',
    rating: 'A+',
    image: 'https://picsum.photos/seed/ricardo/300/300',
    stats: { tactical: 88, physical: 92, technical: 84 }
  },
  {
    id: '2',
    name: 'Gabriel',
    lastName: 'Santos',
    position: 'Centroavante',
    category: 'Sub-20',
    club: 'SL Benfica',
    clubLogo: 'https://www.google.com/s2/favicons?domain=slbenfica.pt&sz=128',
    status: 'In Club',
    rating: 'B+',
    image: 'https://picsum.photos/seed/gabriel/300/300',
    stats: { tactical: 75, physical: 88, technical: 90 }
  },
  {
    id: '3',
    name: 'Lucas',
    lastName: 'Oliveira',
    position: 'Zagueiro',
    category: 'Profissional',
    club: 'None',
    status: 'Livre no Mercado',
    rating: 'A',
    image: 'https://picsum.photos/seed/lucas/300/300',
    stats: { tactical: 90, physical: 85, technical: 78 }
  },
  {
    id: '4',
    name: 'Enzo',
    lastName: 'Ferreira',
    position: 'Goleiro',
    category: 'Sub-17',
    club: 'Sporting CP',
    clubLogo: 'https://www.google.com/s2/favicons?domain=sporting.pt&sz=128',
    status: 'In Club',
    rating: 'A',
    image: 'https://picsum.photos/seed/enzo/300/300',
    stats: { tactical: 82, physical: 80, technical: 85 }
  },
  {
    id: '5',
    name: 'Vitor',
    lastName: 'Hugo',
    position: 'Zagueiro',
    category: 'Sub-20',
    club: 'None',
    status: 'Livre no Mercado',
    rating: 'B+',
    image: 'https://picsum.photos/seed/vitor/300/300',
    stats: { tactical: 78, physical: 85, technical: 72 }
  }
];
