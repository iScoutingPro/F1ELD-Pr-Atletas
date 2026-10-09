import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';

// Compara nomes sem acento, sem diferença de maiúsculas e sem espaços sobrando
export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

export interface SheetOption {
  value: string;
  label: string;
  // Miniatura à esquerda do nome (escudo do clube)
  image?: string;
}

interface SheetSelectProps {
  value: string;
  options: SheetOption[];
  onChange: (value: string) => void;
  // Mostra "Outra" no rodapé da lista
  onOther?: () => void;
  // Texto desse botão ("Outra" quando não informado)
  otherLabel?: string;
  label: string;
  invalid?: boolean;
  className: string;
  // Texto do botão quando nada está escolhido
  placeholder?: string;
  // Escolha de várias opções: os valores marcados; clicar marca ou desmarca (onToggle) e a lista continua aberta
  multiple?: string[];
  onToggle?: (value: string) => void;
  // Com a busca sem resultado igual, oferece criar uma opção com o texto digitado
  onCreate?: (label: string) => void;
}

const PANEL_HEIGHT = 320;

// Lista suspensa da planilha, no visual do app (a lista nativa do navegador abria branca, com o texto branco).
// O painel é desenhado fora da tabela (createPortal, posição fixa) para não ser cortado pela rolagem lateral
export const SheetSelect = ({ value, options, onChange, onOther, otherLabel = 'Outra', label, invalid, className, placeholder = 'Selecione', multiple, onToggle, onCreate }: SheetSelectProps) => {
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
  // Lista com miniaturas: quem não tem imagem ganha o mesmo espaço, para os nomes ficarem alinhados
  const hasImages = options.some((option) => option.image);
  const term = normalize(query);
  const visible = term ? options.filter((option) => normalize(option.label).includes(term)) : options;
  const isActive = (option: SheetOption) => (multiple ? multiple.includes(option.value) : option.value === value);
  const choose = (next: string) => (multiple ? onToggle?.(next) : pick(next));
  const buttonText = multiple ? multiple.map((item) => options.find((option) => option.value === item)?.label || item).join(', ') : selected?.label || '';
  const canCreate = Boolean(onCreate && term && !options.some((option) => normalize(option.label) === term));
  const create = () => {
    onCreate?.(query.trim().replace(/\s+/g, ' '));
    setQuery('');
  };
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
        title={buttonText || label}
        className={`${className} flex items-center justify-between gap-2 ${open ? 'border-primary bg-white/10' : invalid ? 'border-error/60' : 'border-white/10 hover:border-white/25'}`}
      >
        {selected?.image && <img src={selected.image} alt="" className="h-6 w-6 shrink-0 object-contain" />}
        <span className={`min-w-0 flex-1 truncate ${hasImages ? 'text-left' : 'text-center'} ${buttonText ? 'font-bold text-white' : 'font-medium text-on-surface-variant'}`}>{buttonText || placeholder}</span>
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
                if (event.key !== 'Enter') return;
                // Dentro de um formulário, Enter não pode enviar o formulário
                event.preventDefault();
                if (canCreate) create();
                else if (visible.length > 0) choose(visible[0].value);
              }}
              placeholder={onCreate ? 'Pesquisar ou digitar um nome' : 'Pesquisar'}
              className="w-full bg-transparent py-3 pl-10 pr-4 text-xs font-bold text-white outline-none placeholder:font-medium placeholder:text-on-surface-variant"
            />
          </label>
          <div className="max-h-60 overflow-y-auto p-1.5">
            {visible.length === 0 && !canCreate && <p className="px-3 py-4 text-center text-xs text-on-surface-variant">Nada encontrado</p>}
            {visible.map((option) => {
              const active = isActive(option);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(option.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? 'bg-primary font-black text-background' : 'font-bold text-white/85 hover:bg-white/10 hover:text-white'}`}
                >
                  {hasImages && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                      {option.image && <img src={option.image} alt="" loading="lazy" className="h-6 w-6 object-contain" />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 break-words">{option.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
            {canCreate && (
              <button
                type="button"
                onClick={create}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 break-words">Adicionar "{query.trim()}"</span>
              </button>
            )}
          </div>
          {(onOther || value) && (
            <div className="flex items-center gap-1.5 border-t border-white/10 p-1.5">
              {onOther && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onOther(); }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/10"
                >
                  <Plus className="h-3.5 w-3.5" /> {otherLabel}
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
