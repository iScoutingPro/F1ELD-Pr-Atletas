import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderUp, Pencil, Plus, Search, Shield, Trash2, Upload, X } from 'lucide-react';
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

// "sao-paulo_fc.png" vira "sao paulo fc": o nome do arquivo é o ponto de partida do nome do clube
const nameFromFile = (file: File) =>
  file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b(logo|escudo|brasao)\b/gi, '').replace(/\s+/g, ' ').trim();

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
  <div className={`flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] ${className}`}>
    {logo ? <img src={logo} alt="" className="h-[70%] w-[70%] object-contain" /> : <Shield className="h-1/3 w-1/3 text-white/30" />}
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

interface BulkRow {
  key: string;
  file: File;
  name: string;
  preview: string;
}

// Conferência dos escudos enviados de uma vez: cada arquivo vira um clube, com o nome tirado do nome do arquivo
const BulkForm = ({ files, clubs, onSave, onClose }: { files: File[]; clubs: Club[]; onSave: (clubs: ClubInput[]) => Promise<boolean>; onClose: () => void }) => {
  const skipped = useMemo(() => files.filter((file) => fileProblem(file)), [files]);
  const [rows, setRows] = useState<BulkRow[]>(() =>
    files.filter((file) => !fileProblem(file)).map((file, index) => ({ key: `${index}-${file.name}`, file, name: nameFromFile(file), preview: URL.createObjectURL(file) })));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const previews = useRef(rows.map((row) => row.preview));
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const existing = useMemo(() => new Map(clubs.map((club) => [clubKey(club.name), club])), [clubs]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (rows.length === 0) return setError('Nenhum escudo para enviar.');
    if (rows.some((row) => !row.name.trim())) return setError('Escreva o nome de todos os clubes.');
    const keys = rows.map((row) => clubKey(row.name));
    if (new Set(keys).size !== keys.length) return setError('Há dois escudos com o mesmo nome de clube. Corrija ou remova um deles.');
    setSaving(true);
    // Nome que já existe: o escudo novo substitui o do clube
    const saved = await onSave(rows.map((row) => ({ id: existing.get(clubKey(row.name))?.id, name: row.name.trim(), file: row.file })));
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <Modal onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <p className={labelClass}>Enviar escudos</p>
          <h2 className="mt-2 text-2xl font-black uppercase italic leading-none text-white">Confira os nomes</h2>
          <p className="mt-3 text-sm text-white/70">O nome de cada clube veio do nome do arquivo. Corrija o que estiver errado antes de salvar.</p>
        </div>
        {skipped.length > 0 && (
          <p className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-xs font-bold text-error">
            {skipped.length === 1 ? '1 arquivo ficou de fora' : `${skipped.length} arquivos ficaram de fora`} por não ser imagem aceita ou passar de {MAX_LOGO_MB} MB: {skipped.map((file) => file.name).join(', ')}
          </p>
        )}
        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {rows.map((row) => {
            const match = existing.get(clubKey(row.name));
            return (
              <div key={row.key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
                <Crest logo={row.preview} className="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(event) => setRows((prev) => prev.map((item) => (item.key === row.key ? { ...item, name: event.target.value } : item)))}
                    className={inputClass}
                    placeholder="Nome do clube"
                    aria-label={`Nome do clube do arquivo ${row.file.name}`}
                  />
                  <p className="mt-1 truncate pl-1 text-[11px] font-medium text-on-surface-variant">
                    {row.file.name}{match ? ' · já existe: o escudo será substituído' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((item) => item.key !== row.key))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-on-surface-variant transition hover:border-error/50 hover:text-error"
                  aria-label={`Tirar ${row.file.name} da lista`}
                  title="Tirar da lista"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          {rows.length === 0 && <p className="py-8 text-center text-sm text-white/60">Nenhum escudo na lista.</p>}
        </div>
        {error && <p className="text-xs font-bold text-error">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving || rows.length === 0} className={`${primaryButton} flex-1`}>
            {saving ? 'Enviando...' : rows.length === 1 ? 'Salvar 1 clube' : `Salvar ${rows.length} clubes`}
          </button>
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
  const [bulkFiles, setBulkFiles] = useState<File[] | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const term = clubKey(query);
  const visible = term ? clubs.filter((club) => clubKey(club.name).includes(term)) : clubs;
  const customCount = clubs.filter((club) => !club.builtin).length;

  const pickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length > 0) setBulkFiles(files);
  };

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
            <p className={labelClass}>Nome e escudo</p>
            <h1 className="mt-1 text-3xl font-black uppercase italic leading-none tracking-tight text-white sm:text-4xl">Clubes</h1>
            <p className="mt-2 text-xs font-bold text-on-surface-variant">
              <span className="text-white">{clubs.length}</span> clubes · <span className="text-white">{customCount}</span> {customCount === 1 ? 'cadastrado por você' : 'cadastrados por você'}
            </p>
          </div>
          <input type="file" ref={filesRef} className="hidden" accept={LOGO_ACCEPT} multiple onChange={pickFiles} />
          {/* Escolher a pasta inteira: o atributo não existe nos tipos do React */}
          <input type="file" ref={folderRef} className="hidden" multiple onChange={pickFiles} {...({ webkitdirectory: '' } as object)} />
          <button type="button" onClick={() => folderRef.current?.click()} className={`${ghostButton} max-sm:hidden`}>
            <FolderUp className="h-3.5 w-3.5" />
            Enviar pasta
          </button>
          <button type="button" onClick={() => filesRef.current?.click()} className={ghostButton}>
            <Upload className="h-3.5 w-3.5" />
            Enviar escudos
          </button>
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1800px]:grid-cols-6">
          {visible.map((club) => (
            <div key={club.id || clubKey(club.name)} className={`${panelClass} group relative flex flex-col items-center gap-3 p-4 text-center`}>
              <span className={`absolute left-3 top-3 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] ${club.builtin ? 'border-white/10 text-on-surface-variant' : 'border-white/30 bg-white/10 text-white'}`}>
                {club.builtin ? 'Padrão' : 'Cadastrado'}
              </span>
              <div className="absolute right-2 top-2 flex gap-1">
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
              <Crest logo={club.logo} className="mt-7 h-20 w-20 sm:h-24 sm:w-24" />
              <p className="w-full break-words text-sm font-black uppercase italic leading-tight text-white">{club.name}</p>
            </div>
          ))}
        </div>
      )}

      {editing !== undefined && <ClubForm club={editing || undefined} clubs={clubs} onSave={onSave} onClose={() => setEditing(undefined)} />}
      {bulkFiles && <BulkForm files={bulkFiles} clubs={clubs} onSave={onSave} onClose={() => setBulkFiles(null)} />}
    </div>
  );
};
