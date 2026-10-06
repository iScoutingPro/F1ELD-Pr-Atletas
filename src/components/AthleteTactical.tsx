import React, { useState } from 'react';
import { CalendarCheck, CalendarClock, Clock, ExternalLink, FileText, Pencil, Play, Plus, Presentation, Trash2, X } from 'lucide-react';
import { Athlete, TacticalMaterial, TacticalMeeting } from '../types';

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const labelClass = 'text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant';
const inputClass = 'h-[46px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-white outline-none transition placeholder:font-medium placeholder:text-on-surface-variant focus:border-primary';
const dateInputClass = `${inputClass} [color-scheme:dark] max-sm:min-h-[50px] max-sm:appearance-none`;
const iconButtonClass = 'flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:border-primary hover:bg-primary hover:text-background';

const DAY = 86400000;
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const SectionTitle = ({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <span className="h-4 w-0.5 rounded-full bg-primary" />
    <h3 className="text-base font-black uppercase tracking-[0.12em] text-primary underline decoration-2 underline-offset-8">{children}</h3>
    <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    {aside && <span className="text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant">{aside}</span>}
  </div>
);

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toDate = (value: string) => {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const sortKey = (meeting: TacticalMeeting) => `${meeting.date} ${meeting.time || ''}`;

// Só aceita endereço http(s); texto sem protocolo (ex.: "youtu.be/abc") ganha https://. Devolve vazio quando não é um link
const toUrl = (text: string) => {
  const value = text.trim();
  if (!value) return '';
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return url.hostname.includes('.') ? url.toString() : '';
  } catch {
    return '';
  }
};

// Capa do vídeo quando o link é do YouTube; nos outros casos o cartão fica sem imagem
const youtubeThumb = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : '';
};

const countdown = (days: number) => (days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `Em ${days} dias`);

interface AthleteTacticalProps {
  athlete: Athlete;
  isAdmin: boolean;
  // Devolve true quando as reuniões foram gravadas
  onSaveMeetings: (meetings: TacticalMeeting[]) => Promise<boolean>;
}

// Acompanhamento tático do atleta (ícone Acompanhamento Tático do perfil): reuniões da consultoria, agendadas e realizadas, com os vídeos e PDFs de cada uma
export const AthleteTactical = ({ athlete, isAdmin, onSaveMeetings }: AthleteTacticalProps) => {
  const meetings = athlete.tacticalMeetings || [];
  // null = formulário fechado; 'new' = reunião nova; senão o id da reunião em edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [materials, setMaterials] = useState<TacticalMaterial[]>([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // Reunião de hoje ainda conta como agendada
  const today = todayKey();
  const upcoming = meetings.filter((meeting) => meeting.date >= today).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const past = meetings.filter((meeting) => meeting.date < today).sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  const videoCount = meetings.reduce((total, meeting) => total + meeting.materials.filter((item) => item.type === 'video').length, 0);
  const pdfCount = meetings.reduce((total, meeting) => total + meeting.materials.filter((item) => item.type === 'pdf').length, 0);

  const openForm = (meeting?: TacticalMeeting) => {
    setEditingId(meeting?.id || 'new');
    setDate(meeting?.date || '');
    setTime(meeting?.time || '');
    setTitle(meeting?.title || '');
    setNotes(meeting?.notes || '');
    setMaterials(meeting?.materials.map((item) => ({ ...item })) || []);
    setFormError('');
    setConfirmingDelete(null);
  };

  const saveMeetings = async (next: TacticalMeeting[]) => {
    setSaving(true);
    const saved = await onSaveMeetings(next);
    setSaving(false);
    return saved;
  };

  const updateMaterial = (id: string, changes: Partial<TacticalMaterial>) =>
    setMaterials((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!date) return setFormError('Informe a data da reunião.');
    if (!title.trim()) return setFormError('Escreva o tema da reunião.');

    // Linha de material totalmente em branco é ignorada
    const filled = materials.filter((item) => item.title.trim() || item.url.trim());
    const cleaned = filled.map((item) => ({
      ...item,
      title: item.title.trim() || (item.type === 'video' ? 'Vídeo' : 'PDF'),
      url: toUrl(item.url),
    }));
    if (cleaned.some((item) => !item.url)) return setFormError('Informe um link válido em cada vídeo ou PDF.');

    const meeting: TacticalMeeting = {
      id: editingId && editingId !== 'new' ? editingId : newId(),
      date,
      title: title.trim(),
      materials: cleaned,
      ...(time ? { time } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    const next = editingId === 'new' ? [...meetings, meeting] : meetings.map((item) => (item.id === meeting.id ? meeting : item));
    if (await saveMeetings(next)) setEditingId(null);
  };

  const removeMeeting = async (id: string) => {
    if (confirmingDelete !== id) return setConfirmingDelete(id);
    if (await saveMeetings(meetings.filter((item) => item.id !== id))) setConfirmingDelete(null);
  };

  const renderMeeting = (meeting: TacticalMeeting, highlight: boolean) => {
    const meetingDate = toDate(meeting.date);
    const isUpcoming = meeting.date >= today;
    const days = meetingDate ? Math.round((meetingDate.getTime() - (toDate(today)?.getTime() || 0)) / DAY) : 0;
    const videos = meeting.materials.filter((item) => item.type === 'video');
    const pdfs = meeting.materials.filter((item) => item.type === 'pdf');
    return (
      <div
        key={meeting.id}
        className={`relative overflow-hidden rounded-3xl border p-4 sm:p-5 ${highlight ? 'border-primary/60 bg-gradient-to-b from-white/[0.12] to-white/[0.03] shadow-[0_12px_40px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]' : 'border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'}`}
      >
        {highlight && <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2 sm:w-16 ${highlight ? 'border-primary bg-primary text-background' : 'border-white/10 bg-white/[0.04] text-white'}`}>
            <span className="text-2xl font-black leading-none">{meetingDate ? String(meetingDate.getDate()).padStart(2, '0') : '—'}</span>
            <span className="mt-1 text-[9px] font-black uppercase tracking-[0.2em]">{meetingDate ? MONTHS[meetingDate.getMonth()] : ''}</span>
            <span className={`text-[9px] font-black tracking-[0.12em] ${highlight ? 'text-background/60' : 'text-on-surface-variant'}`}>{meetingDate?.getFullYear() || ''}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {isUpcoming ? (
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${highlight ? 'bg-primary text-background' : 'border border-white/30 bg-white/10 text-white'}`}>
                  {highlight && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-background" />}
                  {countdown(days)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
                  <CalendarCheck className="h-3 w-3" /> Realizada
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 ${labelClass}`}>
                {meetingDate?.toLocaleDateString('pt-BR', { weekday: 'long' })}
                {meeting.time && (
                  <>
                    <Clock className="ml-1 h-3 w-3" /> {meeting.time.replace(':', 'h')}
                  </>
                )}
              </span>
            </div>
            <p className="mt-2 break-words text-base font-black uppercase italic leading-tight text-white">{meeting.title}</p>
          </div>

          {isAdmin && (
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={() => openForm(meeting)} className={iconButtonClass} aria-label="Editar reunião" title="Editar reunião">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => removeMeeting(meeting.id)}
                onBlur={() => setConfirmingDelete(null)}
                className={`flex h-8 items-center justify-center rounded-full border text-[9px] font-black uppercase tracking-[0.16em] transition ${confirmingDelete === meeting.id ? 'border-error bg-error px-3 text-white' : 'w-8 border-white/10 bg-white/[0.04] text-white/75 hover:border-error/60 hover:text-error'}`}
                aria-label="Excluir reunião"
                title="Excluir reunião"
              >
                {confirmingDelete === meeting.id ? 'Confirmar' : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>

        {meeting.notes && <p className="mt-4 whitespace-pre-line break-words text-sm leading-relaxed text-white/75">{meeting.notes}</p>}

        {videos.length > 0 && (
          <div className="mt-5">
            <p className={labelClass}>{videos.length === 1 ? 'Vídeo' : 'Vídeos'}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {videos.map((video) => {
                const thumb = youtubeThumb(video.url);
                return (
                  <a
                    key={video.id}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_12px_30px_rgba(255,255,255,0.12)]"
                  >
                    <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-white/[0.1] to-white/[0.02]">
                      {thumb && <img src={thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition group-hover:opacity-90" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-background shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition group-hover:scale-110">
                        <Play className="ml-0.5 h-5 w-5 fill-current" />
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <p className="min-w-0 flex-1 break-words text-xs font-black uppercase leading-tight text-white">{video.title}</p>
                      <ExternalLink className="h-3 w-3 shrink-0 text-on-surface-variant transition group-hover:text-white" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {pdfs.length > 0 && (
          <div className="mt-5">
            <p className={labelClass}>{pdfs.length === 1 ? 'PDF' : 'PDFs'}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {pdfs.map((pdf) => (
                <a
                  key={pdf.id}
                  href={pdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-primary hover:bg-primary hover:text-background"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white transition group-hover:border-background/20 group-hover:bg-background/10 group-hover:text-background">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-xs font-black uppercase leading-tight text-white transition group-hover:text-background">{pdf.title}</span>
                    <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant transition group-hover:text-background/60">Abrir PDF</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-on-surface-variant transition group-hover:text-background" />
                </a>
              ))}
            </div>
          </div>
        )}

        {!isUpcoming && meeting.materials.length === 0 && <p className="mt-4 text-xs font-bold text-white/50">Nenhum vídeo ou PDF adicionado a esta reunião.</p>}
      </div>
    );
  };

  return (
    <div className="mt-8 space-y-8">
      <section className="space-y-3">
        <SectionTitle>Acompanhamento tático</SectionTitle>
        <div className={`${panelClass} relative overflow-hidden p-5 sm:p-6`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <div className="grid grid-cols-2 gap-y-5 text-center sm:grid-cols-4">
            {[{ label: 'Realizadas', value: past.length }, { label: 'Agendadas', value: upcoming.length }, { label: 'Vídeos', value: videoCount }, { label: 'PDFs', value: pdfCount }].map((item) => (
              <div key={item.label}>
                <p className="text-3xl font-black leading-none text-white">{item.value}</p>
                <p className={`mt-2 ${labelClass}`}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {isAdmin && editingId === null && (
          <button
            type="button"
            onClick={() => openForm()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:border-primary hover:bg-primary hover:text-background"
          >
            <Plus className="h-4 w-4" />
            Adicionar reunião
          </button>
        )}

        {isAdmin && editingId !== null && (
          <form onSubmit={submit} className={`${panelClass} space-y-4 p-4 sm:p-5`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{editingId === 'new' ? 'Nova reunião' : 'Editar reunião'}</p>
            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <label className="block">
                <span className={labelClass}>Data *</span>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`mt-2 ${dateInputClass}`} />
              </label>
              <label className="block">
                <span className={labelClass}>Horário</span>
                <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={`mt-2 ${dateInputClass}`} />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Tema da reunião *</span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex.: Posicionamento sem a bola"
                  className={`mt-2 ${inputClass}`}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Resumo</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="O que foi (ou será) trabalhado na reunião"
                  className={`mt-2 ${inputClass} h-auto resize-y py-3 leading-relaxed`}
                />
              </label>
            </div>

            <div>
              <span className={labelClass}>Vídeos e PDFs</span>
              <p className="mt-1 text-xs text-white/60">Cole o link de cada material (YouTube, Google Drive etc.). Dá para adicionar depois, editando a reunião.</p>
              <div className="mt-3 space-y-2">
                {materials.map((item) => (
                  <div key={item.id} className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:grid-cols-[auto_1fr_1.4fr_auto] sm:items-center [&>*]:min-w-0">
                    <div className="flex h-[46px] rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                      {([{ type: 'video', label: 'Vídeo' }, { type: 'pdf', label: 'PDF' }] as const).map((option) => (
                        <button
                          key={option.type}
                          type="button"
                          onClick={() => updateMaterial(item.id, { type: option.type })}
                          className={`flex-1 rounded-xl px-4 text-[9px] font-black uppercase tracking-[0.18em] transition ${item.type === option.type ? 'bg-primary text-background' : 'text-white/70 hover:text-white'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) => updateMaterial(item.id, { title: event.target.value })}
                      placeholder="Nome do material"
                      aria-label="Nome do material"
                      className={inputClass}
                    />
                    <input
                      type="url"
                      inputMode="url"
                      value={item.url}
                      onChange={(event) => updateMaterial(item.id, { url: event.target.value })}
                      placeholder="Link (https://...)"
                      aria-label="Link do material"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setMaterials((prev) => prev.filter((other) => other.id !== item.id))}
                      className={`${iconButtonClass} justify-self-end hover:border-error/60 hover:bg-transparent hover:text-error`}
                      aria-label="Remover material"
                      title="Remover material"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {([{ type: 'video', label: 'Adicionar vídeo', icon: Play }, { type: 'pdf', label: 'Adicionar PDF', icon: FileText }] as const).map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMaterials((prev) => [...prev, { id: newId(), type, title: '', url: '' }])}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-[9px] font-black uppercase tracking-[0.2em] text-white transition hover:border-primary hover:bg-primary hover:text-background"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {formError && <p className="text-xs font-bold text-error">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="h-10 rounded-full border border-white/15 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-full bg-primary px-6 text-[9px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.03] disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar reunião'}
              </button>
            </div>
          </form>
        )}

        {meetings.length === 0 && editingId === null && (
          <div className={`${panelClass} p-8 text-center`}>
            <Presentation className="mx-auto h-6 w-6 text-on-surface-variant" />
            <p className={`mt-3 ${labelClass}`}>Sem reuniões</p>
            <p className="mt-2 text-sm text-white/70">Nenhuma reunião de acompanhamento tático cadastrada para este atleta.</p>
          </div>
        )}
      </section>

      {meetings.length > 0 && (
        <section className="space-y-3">
          <SectionTitle aside={upcoming.length > 0 ? `${upcoming.length} ${upcoming.length === 1 ? 'agendada' : 'agendadas'}` : undefined}>Próximas reuniões</SectionTitle>
          {upcoming.length > 0 ? (
            <div className="space-y-3">{upcoming.map((meeting, index) => renderMeeting(meeting, index === 0))}</div>
          ) : (
            <div className={`${panelClass} p-6 text-center`}>
              <CalendarClock className="mx-auto h-6 w-6 text-on-surface-variant" />
              <p className="mt-3 text-sm text-white/70">Nenhuma reunião agendada no momento.</p>
            </div>
          )}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <SectionTitle aside={`${past.length} ${past.length === 1 ? 'realizada' : 'realizadas'}`}>Reuniões realizadas</SectionTitle>
          <div className="space-y-3">{past.map((meeting) => renderMeeting(meeting, false))}</div>
        </section>
      )}
    </div>
  );
};
