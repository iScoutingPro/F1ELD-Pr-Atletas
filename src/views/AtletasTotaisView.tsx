import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, ChevronDown, FileText, LucideIcon, MapPin, Plus, Search, Shield, SlidersHorizontal, Users, Video, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Athlete } from '../types';
import { findCountry } from '../countries';
import { CountryFlag } from '../components/CountrySelect';
import { Logo } from '../components/Logo';

interface AtletasTotaisViewProps {
  athletes: Athlete[];
  onSelectAthlete?: (athlete: Athlete) => void;
  // Só para admin: abre o cadastro na lista escolhida na pergunta do botão "Adicionar atleta"
  onAddAthlete?: (list: ListType) => void;
  // Filtro de lista com que a aba abre (os cards do painel abrem já em Agenciados ou Negociados)
  initialListFilter?: ListFilter;
}

type ListType = 'agenciados' | 'negociados';
export type ListFilter = 'todos' | ListType | 'dvd';

// Um cartão da tela: o atleta e as listas em que ele aparece
interface Entry {
  athlete: Athlete;
  lists: ListType[];
}

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_80px_-40px_rgba(0,0,0,0.9)]';
const labelClass = 'text-[9px] font-black uppercase tracking-[0.24em] text-on-surface-variant/70';
// Rótulos dentro do cartão do atleta, um pouco maiores que os dos painéis
const cardLabelClass = 'text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant/70';
const fieldClass = 'w-full rounded-2xl border border-white/10 bg-black/30 text-xs font-bold text-on-surface outline-none transition focus:border-primary/60 focus:bg-black/40';

const LIST_FILTERS: { id: ListFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'agenciados', label: 'Agenciados' },
  { id: 'negociados', label: 'Negociados' },
  { id: 'dvd', label: 'Com DVD' },
];

const formatDate = (value?: string) => {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

const isExpired = (value?: string) => {
  const time = value ? new Date(`${value.slice(0, 10)}T00:00:00`).getTime() : NaN;
  return !Number.isNaN(time) && time < Date.now();
};

const listOf = (athlete: Athlete): ListType => athlete.listType || 'agenciados';
const inBoth = (entry: Entry) => entry.lists.length > 1;
const matchesList = (entry: Entry, filter: ListFilter) =>
  filter === 'todos' || (filter === 'dvd' ? !!entry.athlete.hasDvd : entry.lists.includes(filter));
const listLabel = (entry: Entry) =>
  inBoth(entry) ? 'Agenciado + Negociado' : entry.lists[0] === 'negociados' ? 'Negociado' : 'Agenciado';
const fullName = (athlete: Athlete) => `${athlete.name} ${athlete.lastName || ''}`.trim();
const clubOf = (athlete: Athlete) =>
  athlete.club && athlete.club !== 'None' && athlete.club !== 'Livre no Mercado' ? athlete.club : 'Sem Clube';

// Profissional primeiro, depois Sub-20, Sub-17... em ordem decrescente
const categoryRank = (category: string) => {
  const match = /(\d+)/.exec(category);
  return match ? 100 - Number(match[1]) : -1;
};

// As listas são independentes no banco: o mesmo atleta cadastrado nas duas (mesmo nome completo
// e mesma data de nascimento) vira um cartão só, com o cadastro de Agenciados como principal
export const buildEntries = (athletes: Athlete[]): Entry[] => {
  const groups = new Map<string, Athlete[]>();
  athletes.forEach(athlete => {
    const key = `${fullName(athlete).toLowerCase().replace(/\s+/g, ' ')}|${(athlete.birthDate || '').slice(0, 10)}`;
    groups.set(key, [...(groups.get(key) || []), athlete]);
  });

  const entries: Entry[] = [];
  groups.forEach(group => {
    const agenciado = group.find(a => listOf(a) === 'agenciados');
    const negociado = group.find(a => listOf(a) === 'negociados');
    if (agenciado && negociado) {
      entries.push({ athlete: agenciado, lists: ['agenciados', 'negociados'] });
    } else {
      group.forEach(athlete => entries.push({ athlete, lists: [listOf(athlete)] }));
    }
  });
  return entries;
};

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const FilterSelect = ({ value, onChange, placeholder, options, className = '' }: { value: string; onChange: (value: string) => void; placeholder: string; options: string[]; className?: string }) => (
  <div className={`relative ${className}`}>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} appearance-none py-3.5 pl-4 pr-10`}>
      <option value="" className="bg-surface-high">{placeholder}</option>
      {options.map(option => (
        <option key={option} value={option} className="bg-surface-high">{option}</option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
  </div>
);

const Detail = ({ icon: Icon, label, muted, className = '', children }: { icon: LucideIcon; label: string; muted?: boolean; className?: string; children: React.ReactNode }) => (
  <div className={`min-w-0 ${className}`}>
    <p className={`${cardLabelClass} flex items-center gap-1.5`}>
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </p>
    <div className={`mt-0.5 flex min-w-0 items-center gap-1.5 text-sm font-bold ${muted ? 'text-on-surface-variant/45' : 'text-on-surface'}`}>
      {children}
    </div>
  </div>
);

// Marca da lista ao lado do nome: Field para Agenciados, Cosmopolitano Sports para Negociados
// sizeClass troca o tamanho (a pergunta do "Adicionar atleta" usa uma marca maior que a do cartão)
const ListLogo: React.FC<{ list: ListType; sizeClass?: string }> = ({ list, sizeClass = 'h-12 w-[68px] rounded-xl p-1 sm:h-16 sm:w-[104px]' }) => (
  <span
    title={list === 'negociados' ? 'Cosmopolitano Sports' : 'Field'}
    className={`flex shrink-0 items-center justify-center border border-white/10 bg-black/30 ${sizeClass}`}
  >
    {list === 'negociados' ? (
      <img src="/assets/cosmopolitano.png" alt="Cosmopolitano Sports" className="h-full w-full object-contain brightness-0 invert" />
    ) : (
      <Logo variant="minimal" className="h-full w-full" />
    )}
  </span>
);

const AthleteCard: React.FC<{ entry: Entry; index: number; onSelect?: (athlete: Athlete) => void }> = ({ entry, index, onSelect }) => {
  const { athlete } = entry;
  const country = findCountry(athlete.nacionalidade);
  const secondCountry = athlete.hasDualNationality ? findCountry(athlete.secondNationality) : undefined;
  const club = clubOf(athlete);
  const expired = isExpired(athlete.contractEnd);
  const contractEnd = formatDate(athlete.contractEnd);
  const hasContract = !!(athlete.contractLevel || athlete.contractType);

  const stats = [
    { label: 'Idade', value: athlete.age ? String(athlete.age) : '', unit: 'anos' },
    { label: 'Altura', value: athlete.height ? (athlete.height / 100).toFixed(2).replace('.', ',') : '', unit: 'm' },
    { label: 'Peso', value: athlete.weight ? String(athlete.weight).replace('.', ',') : '', unit: 'kg' },
    { label: 'Pé', value: athlete.preferredFoot || '', unit: '' },
  ];

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 10) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onSelect?.(athlete)}
      // No celular a foto fica ao lado do nome e a faixa de números e os detalhes ocupam a largura toda, embaixo
      className={`${panelClass} group relative grid w-full grid-cols-[6rem_minmax(0,1fr)] grid-rows-[auto_1fr] overflow-hidden text-left sm:grid-cols-[9rem_minmax(0,1fr)] transition duration-500 hover:-translate-y-1 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_40px_90px_-40px_rgba(255,255,255,0.22)]`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/[0.05] blur-3xl transition duration-500 group-hover:bg-white/[0.09]" />

      <div className="relative overflow-hidden bg-surface-high sm:row-span-2">
        {athlete.image ? (
          <img
            src={athlete.image}
            alt={athlete.name}
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/[0.08] to-transparent text-6xl font-black italic text-white/15">
            {athlete.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/10" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 p-2 sm:flex-row sm:items-end sm:justify-between sm:gap-2 sm:p-2.5">
          <span className="max-w-full truncate text-[10px] font-black uppercase tracking-[0.12em] text-white sm:text-[11px] sm:tracking-[0.2em]">{athlete.category || 'Sem categoria'}</span>
          <div className="flex shrink-0 items-center gap-1">
            {country && <CountryFlag country={country} className="h-3.5 w-5 ring-1 ring-white/20" />}
            {secondCountry && <CountryFlag country={secondCountry} className="h-3.5 w-5 ring-1 ring-white/20" />}
          </div>
        </div>
      </div>

      <div className="relative min-w-0 p-3 sm:px-3.5 sm:pb-0 sm:pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-background shadow-[0_6px_20px_-6px_rgba(255,255,255,0.5)]">
            {listLabel(entry)}
          </span>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-on-surface-variant transition duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-background">
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-3 sm:mt-2">
          <h3 className="min-w-0 text-xl font-black uppercase italic leading-[0.95] tracking-tighter text-white sm:text-[1.375rem]">
            <span className="block truncate">{athlete.name}</span>
            {athlete.lastName && (
              <span className="block truncate bg-gradient-to-r from-white/60 to-white/20 bg-clip-text pr-1 text-transparent">{athlete.lastName}</span>
            )}
          </h3>
          <div className="flex shrink-0 grow flex-col items-center justify-center gap-1.5 sm:flex-row">
            {entry.lists.map(list => <ListLogo key={list} list={list} />)}
          </div>
        </div>
        <p className="mt-1.5 truncate text-[11px] sm:mt-1 font-black uppercase tracking-[0.22em] text-on-surface-variant">
          <span className="text-primary">{athlete.position || 'Sem posição'}</span>
          {athlete.secondaryPosition && <span> · {athlete.secondaryPosition}</span>}
        </p>
      </div>

      <div className="relative col-span-2 min-w-0 px-3 pb-3 sm:col-span-1 sm:col-start-2 sm:px-3.5">
        <div className="grid grid-cols-4 divide-x divide-white/10 border-y border-white/10 py-2 sm:mt-2 sm:py-1.5">
          {stats.map(({ label, value, unit }) => (
            <div key={label} className="min-w-0 px-2 text-center first:pl-0 last:pr-0">
              <p className="truncate text-lg font-black italic leading-none tracking-tight text-white">
                {value || <span className="text-on-surface-variant/30">—</span>}
                {value && unit && <span className="ml-0.5 text-[9px] font-black uppercase not-italic tracking-[0.1em] text-on-surface-variant">{unit}</span>}
              </p>
              <p className={`${cardLabelClass} mt-1`}>{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:mt-2 sm:gap-y-1.5">
          <Detail icon={Shield} label="Clube Atual">
            {athlete.clubLogo && <img src={athlete.clubLogo} alt="" className="h-4 w-4 shrink-0 object-contain" referrerPolicy="no-referrer" />}
            <span className="truncate">{club}</span>
          </Detail>
          <Detail icon={MapPin} label="Cidade/Estado" muted={!athlete.naturalidade}>
            <span className="truncate">{athlete.naturalidade || 'Não informado'}</span>
          </Detail>
          {/* No celular o contrato vai para a última linha, na largura toda, para a data não ser cortada */}
          <Detail icon={FileText} label="Contrato" muted={!hasContract} className="order-last col-span-2 sm:order-none sm:col-span-1">
            <span className="truncate">
              {athlete.contractLevel || (athlete.contractType ? 'Cadastrado' : 'Sem contrato')}
              {contractEnd && (
                <span className={`ml-1.5 text-xs ${expired ? 'text-error' : 'text-on-surface-variant'}`}>
                  · {expired ? 'encerrado em' : 'até'} {contractEnd}
                </span>
              )}
            </span>
          </Detail>
          <Detail icon={Video} label="DVD">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${athlete.hasDvd ? 'bg-primary shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-error'}`} />
            <span className={`truncate ${athlete.hasDvd ? '' : 'text-error'}`}>{athlete.hasDvd ? 'Possui DVD' : 'Não possui'}</span>
          </Detail>
        </div>
      </div>
    </motion.button>
  );
};

const ADD_OPTIONS: { list: ListType; label: string; brand: string }[] = [
  { list: 'agenciados', label: 'Atleta Agenciado', brand: 'F1eld' },
  { list: 'negociados', label: 'Atleta Negociado', brand: 'Cosmopolitano' },
];

// Pergunta do botão "Adicionar atleta": a lista escolhida aqui é a lista em que o atleta é cadastrado
const AddAthleteDialog: React.FC<{ onPick: (list: ListType) => void; onClose: () => void }> = ({ onPick, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-athlete-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-surface-low shadow-[0_30px_80px_rgba(0,0,0,0.8)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          title="Fechar"
          className="absolute right-3 top-3 z-30 flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-error/40 bg-error/15 text-error transition hover:bg-error hover:text-white active:bg-error active:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 pb-5 pt-8 sm:px-10 sm:pb-10 sm:pt-10">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-on-surface-variant/70 sm:text-xs">Adicionar atleta</p>
          <h3 id="add-athlete-title" className="mt-3 pr-10 text-2xl font-black uppercase italic leading-tight tracking-tighter text-white sm:text-4xl">
            O atleta é agenciado ou negociado?
          </h3>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5">
            {ADD_OPTIONS.map(({ list, label, brand }) => (
              <button
                key={list}
                type="button"
                onClick={() => onPick(list)}
                className="group flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-black/30 px-3 py-6 text-center sm:gap-6 sm:px-6 sm:py-10 transition duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-white/[0.06]"
              >
                <ListLogo list={list} sizeClass="h-16 w-[104px] rounded-2xl p-1.5 sm:h-28 sm:w-[190px] sm:p-3" />
                <span>
                  <span className="block text-xs font-black uppercase tracking-[0.12em] text-white sm:text-lg">{label}</span>
                  <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.24em] text-on-surface-variant/70 sm:mt-2 sm:text-xs">{brand}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const AtletasTotaisView = ({ athletes, onSelectAthlete, onAddAthlete, initialListFilter = 'todos' }: AtletasTotaisViewProps) => {
  const [search, setSearch] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>(initialListFilter);
  const [askingList, setAskingList] = useState(false);
  const [category, setCategory] = useState('');
  const [position, setPosition] = useState('');

  const categories = useMemo(
    () => unique(athletes.map(a => a.category)).sort((a, b) => categoryRank(a) - categoryRank(b)),
    [athletes]
  );
  const positions = useMemo(
    () => unique(athletes.map(a => a.position)).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [athletes]
  );

  const entries = useMemo(() => buildEntries(athletes), [athletes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries
      .filter(entry => {
        const { athlete } = entry;
        return matchesList(entry, listFilter) &&
          (!category || athlete.category === category) &&
          (!position || athlete.position === position) &&
          (!term || fullName(athlete).toLowerCase().includes(term) || clubOf(athlete).toLowerCase().includes(term));
      })
      .sort((a, b) => fullName(a.athlete).localeCompare(fullName(b.athlete), 'pt-BR'));
  }, [entries, search, listFilter, category, position]);

  const summary = [
    { label: 'Atletas', value: entries.length },
    { label: 'Agenciados', value: entries.filter(e => e.lists.includes('agenciados')).length },
    { label: 'Negociados', value: entries.filter(e => e.lists.includes('negociados')).length },
    { label: 'Com DVD', value: entries.filter(e => e.athlete.hasDvd).length },
  ];

  // Contagem mostrada em cada botão de lista no celular (no computador ela fica na faixa do topo)
  const listCounts: Record<ListFilter, number> = {
    todos: summary[0].value,
    agenciados: summary[1].value,
    negociados: summary[2].value,
    dvd: summary[3].value,
  };
  // Categoria e posição ficam recolhidas no celular, atrás do botão ao lado da busca
  const [showFilters, setShowFilters] = useState(false);
  const selectCount = (category ? 1 : 0) + (position ? 1 : 0);

  const hasFilters = !!search || listFilter !== 'todos' || !!category || !!position;
  const clearFilters = () => {
    setSearch('');
    setListFilter('todos');
    setCategory('');
    setPosition('');
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pb-12 pt-6 sm:px-6 sm:pt-10 lg:px-10 space-y-3 sm:space-y-6">
      {/* Celular: só o título e o contador, para os cartões aparecerem logo; as contagens vão nos botões de lista */}
      <div className="flex items-end justify-between gap-3 sm:hidden">
        <h2 className="text-2xl font-black uppercase italic leading-none tracking-tighter text-white">
          Carteira{' '}
          <span className="bg-gradient-to-r from-white/70 to-white/15 bg-clip-text pr-2 text-transparent">de Atletas</span>
        </h2>
        <div className="flex shrink-0 items-center gap-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-on-surface-variant">
            <span className="text-primary">{filtered.length}</span> de {entries.length}
          </p>
          {onAddAthlete && (
            <button
              type="button"
              onClick={() => setAskingList(true)}
              aria-label="Adicionar atleta"
              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-xl bg-primary text-background"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`${panelClass} relative hidden overflow-hidden sm:block`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-white/[0.09] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-8 sm:py-5">
          <div>
            <p className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.34em] text-on-surface-variant">
              <span className="h-px w-6 bg-primary" />
              Agenciados e negociados
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase italic leading-none tracking-tighter text-white sm:text-3xl md:text-4xl">
              Carteira{' '}
              <span className="bg-gradient-to-r from-white/70 to-white/15 bg-clip-text pr-2 text-transparent">de Atletas</span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant backdrop-blur">
              Exibindo <span className="text-primary">{filtered.length}</span> de {entries.length}
            </div>
            {onAddAthlete && (
              <button
                type="button"
                onClick={() => setAskingList(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-background shadow-[0_8px_24px_rgba(255,255,255,0.14)] transition hover:scale-[1.03]"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar atleta
              </button>
            )}
          </div>
        </div>

        <div className="relative grid grid-cols-4 gap-px border-t border-white/10 bg-white/10">
          {summary.map(({ label, value }) => (
            <div key={label} className="bg-background/80 px-1 py-3 text-center backdrop-blur sm:px-8 sm:py-3.5 sm:text-left">
              <p className="text-xl font-black italic leading-none tracking-tighter text-white sm:text-2xl">
                {String(value).padStart(2, '0')}
              </p>
              <p className="mt-1 text-[8px] font-black uppercase tracking-[0.06em] text-on-surface-variant/70 sm:text-[9px] sm:tracking-[0.24em]">{label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* No celular o painel some: ficam a busca, o botão que abre categoria e posição e os botões de lista em grade 2×2 */}
      <section className={`${panelClass} space-y-2 max-sm:rounded-none max-sm:border-0 max-sm:bg-none max-sm:shadow-none sm:space-y-3 sm:p-4`}>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant sm:left-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou clube..."
              className={`${fieldClass} py-3 pl-11 pr-10 text-sm text-white placeholder:text-on-surface-variant/50 sm:py-4 sm:pl-12 sm:pr-12`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-on-surface-variant transition hover:text-primary sm:right-4"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            aria-label="Filtrar por categoria e posição"
            aria-expanded={showFilters}
            className={`relative flex w-12 shrink-0 items-center justify-center rounded-2xl border transition sm:hidden ${showFilters || selectCount > 0 ? 'border-primary bg-primary text-background' : 'border-white/10 bg-black/30 text-on-surface-variant'}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {selectCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-primary text-[9px] font-black text-background">{selectCount}</span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-[auto_1fr_1fr]">
          <FilterSelect value={category} onChange={setCategory} placeholder="Todas as categorias" options={categories} className={`sm:order-2 sm:block ${showFilters ? '' : 'hidden'}`} />
          <FilterSelect value={position} onChange={setPosition} placeholder="Todas as posições" options={positions} className={`sm:order-3 sm:block ${showFilters ? '' : 'hidden'}`} />
          <div className="grid grid-cols-2 gap-1.5 sm:order-1 sm:flex sm:gap-0 sm:overflow-x-auto sm:rounded-2xl sm:border sm:border-white/10 sm:bg-black/30 sm:p-1">
            {LIST_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setListFilter(id)}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] transition duration-300 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:border sm:flex-1 sm:px-4 sm:py-2.5 sm:tracking-[0.18em] ${listFilter === id ? 'border-primary bg-primary text-background shadow-[0_8px_24px_-8px_rgba(255,255,255,0.6)]' : 'border-white/10 text-on-surface-variant hover:text-white'}`}
              >
                {label}
                <span className="ml-1.5 opacity-60 sm:hidden">{listCounts[id]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {filtered.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2 min-[1800px]:grid-cols-3">
          {filtered.map((entry, index) => (
            <AthleteCard key={entry.athlete.id} entry={entry} index={index} onSelect={onSelectAthlete} />
          ))}
        </section>
      ) : (
        <section className={`${panelClass} flex flex-col items-center gap-4 px-6 py-20 text-center`}>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
            <Users className="h-6 w-6 text-on-surface-variant" />
          </div>
          <div>
            <p className="text-lg font-black uppercase italic tracking-tight text-white">Nenhum atleta encontrado</p>
            <p className="mt-1 text-sm font-bold text-on-surface-variant">
              {hasFilters ? 'Ajuste a busca ou os filtros para ver outros atletas.' : 'Ainda não há atletas cadastrados.'}
            </p>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full bg-primary px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.03]"
            >
              Limpar filtros
            </button>
          )}
        </section>
      )}

      {askingList && onAddAthlete && (
        <AddAthleteDialog
          onClose={() => setAskingList(false)}
          onPick={(list) => {
            setAskingList(false);
            onAddAthlete(list);
          }}
        />
      )}
    </div>
  );
};
