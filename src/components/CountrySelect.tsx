import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRIES, Country, findCountry, flagUrl } from '../countries';

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const CountryFlag = ({ country, className = 'h-4 w-6' }: { country: Country; className?: string }) => (
  <img src={flagUrl(country)} alt="" className={`${className} shrink-0 rounded-[3px] object-cover`} />
);

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  className: string;
  countries?: Country[];
  align?: 'left' | 'right';
}

export const CountrySelect = ({ value, onChange, className, countries = COUNTRIES, align = 'left' }: CountrySelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = findCountry(value);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const term = normalize(query.trim());
  const filtered = term
    ? countries.filter(c => normalize(c.name).includes(term) || c.code.toLowerCase().includes(term))
    : countries;

  const select = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
    }
    if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      select(filtered[0].code);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`${className} flex items-center gap-3 text-left`}>
        {selected ? (
          <>
            <CountryFlag country={selected} />
            <span className="shrink-0">{selected.code}</span>
            <span className="min-w-0 flex-1 truncate font-medium text-on-surface-variant">{selected.name}</span>
          </>
        ) : (
          <span className={`min-w-0 flex-1 truncate ${value ? '' : 'font-medium text-on-surface-variant/40'}`}>{value || 'Selecione'}</span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-on-surface-variant transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-30 mt-2 w-72 min-w-full max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-white/10 bg-surface-high shadow-[0_16px_40px_rgba(0,0,0,0.6)]`}>
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-on-surface-variant" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-sm font-bold text-on-surface outline-none placeholder:font-medium placeholder:text-on-surface-variant/40"
              placeholder="Digite o país ou a sigla"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {value && !term && (
              <li>
                <button type="button" onClick={() => select('')} className="w-full px-4 py-2.5 text-left text-sm font-medium text-on-surface-variant transition hover:bg-white/10">
                  Limpar seleção
                </button>
              </li>
            )}
            {filtered.map(country => (
              <li key={country.code}>
                <button
                  type="button"
                  onClick={() => select(country.code)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-bold transition hover:bg-white/10 ${country.code === selected?.code ? 'bg-white/10 text-primary' : 'text-on-surface'}`}
                >
                  <CountryFlag country={country} />
                  <span className="w-9 shrink-0">{country.code}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-on-surface-variant">{country.name}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm font-medium text-on-surface-variant">Nenhum país encontrado.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
