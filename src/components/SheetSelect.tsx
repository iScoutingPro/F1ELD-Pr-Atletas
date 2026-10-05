import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';

// Compara nomes sem acento, sem diferença de maiúsculas e sem espaços sobrando
export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

export interface SheetOption {
  value: string;
  label: string;
}

interface SheetSelectProps {
  value: string;
  options: SheetOption[];
  onChange: (value: string) => void;
  // Mostra "Outra" no rodapé da lista
  onOther?: () => void;
  label: string;
  invalid?: boolean;
  className: string;
  // Texto do botão quando nada está escolhido
  placeholder?: string;
}

const PANEL_HEIGHT = 320;

// Lista suspensa da planilha, no visual do app (a lista nativa do navegador abria branca, com o texto branco).
// O painel é desenhado fora da tabela (createPortal, posição fixa) para não ser cortado pela rolagem lateral
export const SheetSelect = ({ value, options, onChange, onOther, label, invalid, className, placeholder = 'Selecione' }: SheetSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) => panelRef.current?.contains(target as Node) || buttonRef.current?.contains(target as Node);
    const onPointer = (event: Event) => { if (!inside(event.target)) setOpen(false); };
    const onResize = () => setOpen(false);
    document.addEventListener('mousedown', onPointer);
    // Rolar a planilha ou a página tira o painel do lugar: fecha (rolar a própria lista não)
    window.addEventListener('scroll', onPointer, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('scroll', onPointer, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const toggle = () => {
    if (!open && buttonRef.current) {
      setRect(buttonRef.current.getBoundingClientRect());
      setQuery('');
    }
    setOpen(!open);
  };

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const selected = options.find((option) => option.value === value);
  const term = normalize(query);
  const visible = term ? options.filter((option) => normalize(option.label).includes(term)) : options;
  // Abre para cima quando não cabe embaixo
  const openUp = rect ? window.innerHeight - rect.bottom < PANEL_HEIGHT && rect.top > window.innerHeight - rect.bottom : false;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selected?.label || label}
        className={`${className} flex items-center justify-between gap-2 ${open ? 'border-primary bg-white/10' : invalid ? 'border-error/60' : 'border-white/10 hover:border-white/25'}`}
      >
        <span className={`min-w-0 flex-1 truncate text-center ${selected ? 'font-bold text-white' : 'font-medium text-on-surface-variant'}`}>{selected?.label || placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180 text-primary' : 'text-on-surface-variant'}`} />
      </button>

      {open && rect && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            // Esc fecha só a lista, não a planilha
            if (event.key === 'Escape') {
              event.stopPropagation();
              event.nativeEvent.stopImmediatePropagation();
              setOpen(false);
              buttonRef.current?.focus();
            }
          }}
          style={{
            left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 240) - 8)),
            width: Math.max(rect.width, 240),
            ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
          }}
          className="fixed z-[80] overflow-hidden rounded-2xl border border-white/15 bg-[#101113] shadow-[0_24px_60px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <label className="relative block border-b border-white/10">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && visible.length > 0) pick(visible[0].value);
              }}
              placeholder="Pesquisar"
              className="w-full bg-transparent py-3 pl-10 pr-4 text-xs font-bold text-white outline-none placeholder:font-medium placeholder:text-on-surface-variant"
            />
          </label>
          <div className="max-h-60 overflow-y-auto p-1.5">
            {visible.length === 0 && <p className="px-3 py-4 text-center text-xs text-on-surface-variant">Nada encontrado</p>}
            {visible.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(option.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? 'bg-primary font-black text-background' : 'font-bold text-white/85 hover:bg-white/10 hover:text-white'}`}
                >
                  <span className="min-w-0 break-words">{option.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          {(onOther || value) && (
            <div className="flex items-center gap-1.5 border-t border-white/10 p-1.5">
              {onOther && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onOther(); }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/10"
                >
                  <Plus className="h-3.5 w-3.5" /> Outra
                </button>
              )}
              {value && (
                <button
                  type="button"
                  onClick={() => pick('')}
                  className="inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant transition hover:bg-white/10 hover:text-white"
                >
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
};
