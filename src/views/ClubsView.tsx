import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Plus, Search, Shield, Trash2, Upload, X } from 'lucide-react';
import { Club, clubKey } from '../clubs';

// Clube a gravar: com id é edição; sem arquivo, o escudo atual é mantido
export interface ClubInput {
  id?: string;
  name: string;
  file?: File;
  // Clube que já vem no app, na primeira edição: o escudo atual (mantido quando não há arquivo novo) e o nome original
  logo?: string;
  replaces?: string;
}

interface ClubsViewProps {
  // Todos os clubes: os que já vêm no app e os cadastrados aqui
  clubs: Club[];
  // Devolvem true quando gravou, para a janela fechar
  onSave: (clubs: ClubInput[]) => Promise<boolean>;
  onDelete: (club: Club) => Promise<boolean>;
}

// O mesmo limite está no bucket, em supabase/clubs.sql
const MAX_LOGO_MB = 2;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const LOGO_ACCEPT = LOGO_TYPES.join(',');

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const labelClass = 'text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant';
const inputClass = 'w-full min-w-0 rounded-xl border border-white/10 bg-surface-high px-4 py-3 text-sm font-bold text-on-surface outline-none transition placeholder:font-medium placeholder:text-on-surface-variant/40 focus:border-white/60 focus:ring-2 focus:ring-white/15';
const primaryButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100';
const ghostButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:border-primary hover:bg-primary hover:text-background disabled:opacity-50';
const closeClass = 'absolute right-3 top-3 z-30 flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-error/40 bg-error/15 text-error transition hover:bg-error hover:text-white';

const fileProblem = (file: File) =>
  !LOGO_TYPES.includes(file.type) ? 'não é uma imagem aceita (PNG, JPG, WEBP ou SVG)'
    : file.size > MAX_LOGO_MB * 1024 * 1024 ? `passa de ${MAX_LOGO_MB} MB`
      : '';

const Modal = ({ onClose, wide, children }: { onClose: () => void; wide?: boolean; children: React.ReactNode }) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/65 px-2 py-4 backdrop-blur-sm sm:px-4 sm:py-8">
      <div
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} overflow-hidden rounded-[32px] border border-white/10 bg-[#17191c] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.8)] sm:p-8`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <button type="button" onClick={onClose} className={closeClass} aria-label="Fechar" title="Fechar">
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
};

const Crest = ({ logo, className }: { logo?: string; className: string }) => (
  // Placa clara atrás do escudo: escudo escuro (preto, azul-marinho) sumia no fundo do app
  <div className={`flex shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_30%,#ffffff_0%,#f4f4f5_45%,#d4d4d8_100%)] shadow-[0_14px_30px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.35),0_0_0_6px_rgba(255,255,255,0.05),inset_0_-6px_12px_rgba(0,0,0,0.12)] ${className}`}>
    {logo ? <img src={logo} alt="" className="h-[66%] w-[66%] object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]" /> : <Shield className="h-1/3 w-1/3 text-zinc-400" />}
  </div>
);

// Cadastro ou edição de um clube. Editar um clube que já vem no app cria o cadastro dele, que passa a valer no lugar
const ClubForm = ({ club, clubs, onSave, onClose }: { club?: Club; clubs: Club[]; onSave: (clubs: ClubInput[]) => Promise<boolean>; onClose: () => void }) => {
  const [name, setName] = useState(club?.name || '');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    event.target.value = '';
    if (!next) return;
    const problem = fileProblem(next);
    if (problem) return setError(`O arquivo ${problem}.`);
    setError('');
    setFile(next);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clubName = name.trim();
    if (!clubName) return setError('Escreva o nome do clube.');
    if (!file && !club?.logo) return setError('Escolha o escudo do clube.');
    const same = clubs.find((item) => clubKey(item.name) === clubKey(clubName));
    if (same && !same.builtin && same.id !== club?.id) return setError('Já existe um clube cadastrado com esse nome.');
    setSaving(true);
    const saved = await onSave([{ id: club?.id, name: clubName, file: file || undefined, ...(club && !club.id ? { logo: club.logo, replaces: club.name } : {}) }]);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <p className={labelClass}>{club ? 'Editar clube' : 'Novo clube'}</p>
          <h2 className="mt-2 text-2xl font-black uppercase italic leading-none text-white">{club ? club.name : 'Adicionar clube'}</h2>
        </div>
        <div className="flex items-center gap-4">
          <Crest logo={preview || club?.logo} className="h-24 w-24" />
          <div className="min-w-0 flex-1 space-y-2">
            <input type="file" ref={fileRef} className="hidden" accept={LOGO_ACCEPT} onChange={pick} />
            <button type="button" onClick={() => fileRef.current?.click()} className={ghostButton}>
              <Upload className="h-3.5 w-3.5" />
              {preview || club?.logo ? 'Trocar escudo' : 'Escolher escudo'}
            </button>
            <p className="text-xs font-medium text-on-surface-variant">PNG, JPG, WEBP ou SVG, até {MAX_LOGO_MB} MB. Fundo transparente fica melhor.</p>
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Nome do clube</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus={!club}
            className={inputClass}
            placeholder="Nome do clube"
          />
        </div>
        {error && <p className="text-xs font-bold text-error">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={`${primaryButton} flex-1`}>{saving ? 'Salvando...' : 'Salvar clube'}</button>
          <button type="button" onClick={onClose} className={ghostButton}>Cancelar</button>
        </div>
      </form>
    </Modal>
  );
};

export const ClubsView = ({ clubs, onSave, onDelete }: ClubsViewProps) => {
  const [query, setQuery] = useState('');
  // undefined = formulário fechado; null = clube novo; senão o clube em edição
  const [editing, setEditing] = useState<Club | null | undefined>(undefined);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const term = clubKey(query);
  const visible = term ? clubs.filter((club) => clubKey(club.name).includes(term)) : clubs;

  const remove = async (club: Club) => {
    const key = club.id || clubKey(club.name);
    if (confirmingDelete !== key) return setConfirmingDelete(key);
    if (await onDelete(club)) setConfirmingDelete(null);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-3 pb-12 pt-6 sm:px-6 sm:pt-10 lg:px-10" onClick={() => setConfirmingDelete(null)}>
      <div className={`${panelClass} relative overflow-hidden p-5 sm:p-7`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1 basis-48">
            <h1 className="text-3xl font-black uppercase italic leading-none tracking-tight text-white sm:text-4xl">Clubes</h1>
            <p className="mt-2 text-xs font-bold text-on-surface-variant">
              <span className="text-white">{clubs.length}</span> {clubs.length === 1 ? 'clube' : 'clubes'}
            </p>
          </div>
          <button type="button" onClick={() => setEditing(null)} className={primaryButton}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar clube
          </button>
        </div>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar clube"
          className={`${inputClass} pl-11`}
        />
      </label>

      {visible.length === 0 ? (
        <div className={`${panelClass} p-10 text-center`}>
          <p className={labelClass}>Sem clubes</p>
          <p className="mt-2 text-sm text-white/70">Nenhum clube com esse nome. Use "Adicionar clube" para cadastrar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 min-[1800px]:grid-cols-6">
          {visible.map((club) => (
            <div key={club.id || clubKey(club.name)} className={`${panelClass} group relative flex flex-col items-center overflow-hidden px-4 pb-4 pt-5 text-center transition duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_18px_40px_rgba(0,0,0,0.5)]`}>
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <div className="pointer-events-none absolute left-1/2 top-4 h-32 w-32 -translate-x-1/2 rounded-full bg-white/[0.07] blur-2xl transition group-hover:bg-white/[0.12]" />
              {/* No computador o lápis e a lixeira aparecem ao passar o mouse; no toque ficam sempre à mostra */}
              <div className={`absolute right-2 top-2 z-10 flex gap-1 transition lg:focus-within:opacity-100 lg:group-hover:opacity-100 ${confirmingDelete === (club.id || clubKey(club.name)) ? '' : 'lg:opacity-0'}`}>
                <button
                  type="button"
                  onClick={() => setEditing(club)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-on-surface-variant transition hover:border-primary hover:bg-primary hover:text-background"
                  aria-label={`Editar ${club.name}`}
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {(
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); remove(club); }}
                    className={`flex h-8 items-center justify-center rounded-full border transition ${confirmingDelete === (club.id || clubKey(club.name)) ? 'border-error bg-error px-3 text-[9px] font-black uppercase tracking-[0.14em] text-white' : 'w-8 border-white/10 bg-black/30 text-on-surface-variant hover:border-error/50 hover:text-error'}`}
                    aria-label={`Excluir ${club.name}`}
                    title="Excluir"
                  >
                    {confirmingDelete === (club.id || clubKey(club.name)) ? 'Confirmar' : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              <Crest logo={club.logo} className="relative mt-6 h-24 w-24 sm:h-28 sm:w-28" />
              <div className="mt-5 h-px w-10 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <p className="mt-3 w-full break-words text-sm font-black uppercase italic leading-tight tracking-tight text-white">{club.name}</p>
            </div>
          ))}
        </div>
      )}

      {editing !== undefined && <ClubForm club={editing || undefined} clubs={clubs} onSave={onSave} onClose={() => setEditing(undefined)} />}
    </div>
  );
};
