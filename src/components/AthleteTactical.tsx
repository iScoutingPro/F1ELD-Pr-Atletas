import React, { useState } from 'react';
import { CalendarCheck, CalendarClock, ChevronDown, Clock, Trophy, ExternalLink, FileText, Hourglass, Pencil, Play, Plus, Presentation, Timer, Trash2, Users, X } from 'lucide-react';
import { Athlete, TacticalMaterial, TacticalMeeting, TacticalStatus } from '../types';
import { SheetSelect } from './SheetSelect';

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const labelClass = 'text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant';
const inputClass = 'h-[46px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-white outline-none transition placeholder:font-medium placeholder:text-on-surface-variant focus:border-primary';
const dateInputClass = `${inputClass} [color-scheme:dark] max-sm:min-h-[50px] max-sm:appearance-none`;
const iconButtonClass = 'flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:border-primary hover:bg-primary hover:text-background';
const selectClass = 'h-[46px] w-full rounded-2xl border bg-white/[0.04] px-4 text-sm transition';

// Opções ditadas pelo usuário
const MEETING_TYPES = ['Pré Jogo', 'Pós Jogo', 'Conteúdo Extra', 'Modelo de jogo'];
const STATUSES: TacticalStatus[] = ['Agendada', 'Concluída', 'Pendente'];
// Cores da etiqueta de status, ditadas pelo usuário: concluída verde, agendada amarela e pendente vermelha
const STATUS_TONES: Record<TacticalStatus, string> = {
  'Concluída': 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  Agendada: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  Pendente: 'border-error/40 bg-error/15 text-error',
};
const ANALYSTS =['Vitor Hugo', 'Lucas'];
const toOptions = (items: string[]) => items.map((item) => ({ value: item, label: item }));
const toggleIn = (list: string[], item: string) => (list.includes(item) ? list.filter((other) => other !== item) : [...list, item]);

// Campos do formulário além de data, horário, conteúdo, observações e materiais
const EMPTY_EXTRA = { matchDate: '', matchTime: '', round: '', match: '', competition: '', types: [] as string[], link: '', status: 'Agendada' as TacticalStatus, duration: '', analysts: [] as string[] };

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

// De onde é o link, para o cartão do material ("YouTube", "Google Drive" ou o endereço do site)
const sourceOf = (url: string) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (/youtu\.?be/.test(host)) return 'YouTube';
    if (/drive\.google|docs\.google/.test(host)) return 'Google Drive';
    if (host.includes('vimeo')) return 'Vimeo';
    return host;
  } catch {
    return '';
  }
};

// Título do cartão: os tipos da reunião; reunião sem tipo (as antigas) usa o conteúdo
const headlineOf = (meeting: TacticalMeeting) => (meeting.types?.length ? meeting.types.join(' · ') : meeting.title);
// Conteúdo abordado, mostrado num quadro como as observações; vazio quando já é o título do cartão
const contentOf = (meeting: TacticalMeeting) => (meeting.title !== headlineOf(meeting) ? meeting.title : '');

const countdown =(days: number) => (days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `Em ${days} dias`);

interface AthleteTacticalProps {
  athlete: Athlete;
  isAdmin: boolean;
  // Devolve true quando as reuniões foram gravadas
  onSaveMeetings: (meetings: TacticalMeeting[]) => Promise<boolean>;
}

// Acompanhamento tático do atleta (ícone Acompanhamento Tático do perfil): reuniões da consultoria, agendadas, pendentes e concluídas, com os vídeos e PDFs de cada uma
export const AthleteTactical = ({ athlete, isAdmin, onSaveMeetings }: AthleteTacticalProps) => {
  const meetings = athlete.tacticalMeetings || [];
  // null = formulário fechado; 'new' = reunião nova; senão o id da reunião em edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [materials, setMaterials] = useState<TacticalMaterial[]>([]);
  const [extra, setExtra] = useState(EMPTY_EXTRA);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  // Reuniões com o cartão aberto; todas começam fechadas, só com o resumo
  const [openIds, setOpenIds] = useState<string[]>([]);
  const setField = (changes: Partial<typeof EMPTY_EXTRA>) => setExtra((prev) => ({ ...prev, ...changes }));

  const today = todayKey();
  // Reunião antiga, sem status gravado, vale pela data (a de hoje ainda conta como agendada)
  const statusOf = (meeting: TacticalMeeting): TacticalStatus => meeting.status || (meeting.date >= today ? 'Agendada' : 'Concluída');
  const upcoming = meetings.filter((meeting) => statusOf(meeting) === 'Agendada').sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const pending = meetings.filter((meeting) => statusOf(meeting) === 'Pendente').sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const past = meetings.filter((meeting) => statusOf(meeting) === 'Concluída').sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  // Lista fixa de analistas; nome gravado fora dela continua aparecendo na reunião em edição, para poder ser desmarcado
  const analystOptions = toOptions(Array.from(new Set([...ANALYSTS, ...extra.analysts])));
  const videoCount = meetings.reduce((total, meeting) => total + meeting.materials.filter((item) => item.type === 'video').length, 0);
  const pdfCount = meetings.reduce((total, meeting) => total + meeting.materials.filter((item) => item.type === 'pdf').length, 0);

  const openForm = (meeting?: TacticalMeeting) => {
    setEditingId(meeting?.id || 'new');
    setDate(meeting?.date || '');
    setTime(meeting?.time || '');
    // Conteúdo que só repete os tipos (foi deixado em branco) volta em branco
    setTitle(meeting && meeting.title !== (meeting.types || []).join(' · ') ? meeting.title : '');
    setNotes(meeting?.notes || '');
    setMaterials(meeting?.materials.map((item) => ({ ...item })) || []);
    setExtra(meeting ? {
      matchDate: meeting.matchDate || '',
      matchTime: meeting.matchTime || '',
      round: meeting.round || '',
      match: meeting.match || '',
      competition: meeting.competition || '',
      types: meeting.types || [],
      link: meeting.link || '',
      status: statusOf(meeting),
      duration: meeting.duration ? String(meeting.duration) : '',
      analysts: meeting.analysts || [],
    } : EMPTY_EXTRA);
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
    const meetingTitle = title.trim() || extra.types.join(' · ');
    if (!meetingTitle) return setFormError('Escolha o tipo da reunião ou escreva o conteúdo.');
    // O campo Link saiu do formulário e do cartão a pedido do usuário; link já gravado numa reunião é mantido ao editar
    const link = toUrl(extra.link);
    const duration = Number(extra.duration);

    // Linha de material totalmente em branco é ignorada
    const filled = materials.filter((item) => item.title.trim() || item.url.trim());
    const cleaned = filled.map((item) => ({
      ...item,
      // O formulário não tem mais o nome do material: nome antigo é mantido, e sem nome vale o tipo
      title: item.title.trim() && !['Vídeo', 'PDF'].includes(item.title.trim()) ? item.title.trim() : item.type === 'video' ? 'Vídeo' : 'PDF',
      url: toUrl(item.url),
    }));
    if (cleaned.some((item) => !item.url)) return setFormError('Informe um link válido em cada vídeo ou PDF.');

    const meeting: TacticalMeeting = {
      id: editingId && editingId !== 'new' ? editingId : newId(),
      date,
      title: meetingTitle,
      materials: cleaned,
      status: extra.status,
      ...(time ? { time } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(extra.matchDate ? { matchDate: extra.matchDate } : {}),
      ...(extra.matchTime ? { matchTime: extra.matchTime } : {}),
      ...(extra.round.trim() ? { round: extra.round.trim() } : {}),
      ...(extra.match.trim() ? { match: extra.match.trim() } : {}),
      ...(extra.competition.trim() ? { competition: extra.competition.trim() } : {}),
      ...(extra.types.length ? { types: MEETING_TYPES.filter((type) => extra.types.includes(type)) } : {}),
      ...(link ? { link } : {}),
      ...(duration > 0 ? { duration } : {}),
      ...(extra.analysts.length ? { analysts: extra.analysts } : {}),
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
    const status = statusOf(meeting);
    const isUpcoming = status !== 'Concluída';
    const content = contentOf(meeting);
    const matchDate = meeting.matchDate ? toDate(meeting.matchDate) : null;
    const matchInfo = [
      { label: 'Partida', value: meeting.match },
      { label: 'Competição', value: meeting.competition },
      { label: 'Rodada', value: meeting.round },
      { label: 'Data da partida', value: [matchDate?.toLocaleDateString('pt-BR'), meeting.matchTime && `às ${meeting.matchTime.replace(':', 'h')}`].filter(Boolean).join(' ') },
    ].filter((item) => item.value);
    const days = meetingDate ? Math.round((meetingDate.getTime() - (toDate(today)?.getTime() || 0)) / DAY) : 0;
    const open = openIds.includes(meeting.id);
    const videos = meeting.materials.filter((item) => item.type === 'video');
    const pdfs = meeting.materials.filter((item) => item.type === 'pdf');
    const materialText = [
      videos.length > 0 && `${videos.length} ${videos.length === 1 ? 'vídeo' : 'vídeos'}`,
      pdfs.length > 0 && `${pdfs.length} ${pdfs.length === 1 ? 'PDF' : 'PDFs'}`,
    ].filter(Boolean).join(' · ');
    const analystLabel = (meeting.analysts?.length || 0) > 1 ? 'Analistas' : 'Analista';
    // Resumo do cartão fechado: sempre as mesmas quatro colunas; a que não tem dado fica com um traço
    const brief = [
      { label: 'Partida', value: meeting.match || meeting.competition, detail: meeting.match ? [meeting.competition, meeting.round && (/^\d+$/.test(meeting.round) ? `Rodada ${meeting.round}` : meeting.round)].filter(Boolean).join(' · ') : '', icon: Trophy },
      { label: 'Conteúdo abordado', value: content, detail: '', icon: Presentation },
      { label: analystLabel, value: meeting.analysts?.join(', '), detail: '', icon: Users },
      { label: 'Duração', value: meeting.duration ? `${meeting.duration} min` : '', detail: materialText, icon: Timer },
    ];
    // Cartão aberto: analista e duração, e os quadros de texto
    const people = [
      { label: analystLabel, value: meeting.analysts?.join(', '), icon: Users },
      { label: 'Duração', value: meeting.duration ? `${meeting.duration} min` : '', icon: Timer },
    ].filter((item) => item.value);
    const texts = [
      { label: 'Conteúdo abordado', value: content },
      { label: 'Observações', value: meeting.notes },
    ].filter((item) => item.value);
    return (
      <div
        key={meeting.id}
        className={`relative overflow-hidden rounded-3xl border transition ${highlight ? 'border-primary/60 bg-gradient-to-b from-white/[0.12] to-white/[0.03] shadow-[0_12px_40px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]' : 'border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/20'}`}
      >
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${highlight ? 'via-white' : 'via-white/30'} to-transparent`} />
        {highlight && <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/[0.08] blur-3xl" />}
        <div className="relative p-4 sm:p-6">
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className={`flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2 sm:w-16 ${highlight ? 'border-primary bg-primary text-background shadow-[0_8px_24px_rgba(255,255,255,0.18)]' : 'border-white/10 bg-white/[0.04] text-white'}`}>
            <span className="text-2xl font-black leading-none">{meetingDate ? String(meetingDate.getDate()).padStart(2, '0') : '—'}</span>
            <span className="mt-1 text-[9px] font-black uppercase tracking-[0.2em]">{meetingDate ? MONTHS[meetingDate.getMonth()] : ''}</span>
            <span className={`text-[9px] font-black tracking-[0.12em] ${highlight ? 'text-background/60' : 'text-on-surface-variant'}`}>{meetingDate?.getFullYear() || ''}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {status === 'Agendada' ? (
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${STATUS_TONES.Agendada}`}>
                  {highlight ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" /> : <CalendarClock className="h-3 w-3" />}
                  {/* Agendada com a data já passada não tem contagem */}
                  {days >= 0 ? countdown(days) : 'Agendada'}
                </span>
              ) : status === 'Pendente' ? (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${STATUS_TONES.Pendente}`}>
                  <Hourglass className="h-3 w-3" /> Pendente
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${STATUS_TONES['Concluída']}`}>
                  <CalendarCheck className="h-3 w-3" /> Concluída
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
            <p className={`mt-2 break-words font-black uppercase italic leading-tight tracking-tight text-white ${highlight ? 'text-lg sm:text-xl' : 'text-base'}`}>{headlineOf(meeting)}</p>
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

        {/* Fechado: faixa com quatro colunas fixas, para os cartões ficarem alinhados entre si */}
        {!open && (
          <div className="relative mt-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.03] max-lg:[&>*:nth-child(even)]:border-l max-lg:[&>*:nth-child(n+3)]:border-t lg:grid-cols-4 lg:[&>*:not(:first-child)]:border-l [&>*]:min-w-0 [&>*]:border-white/10">
            {brief.map(({ label, value, detail, icon: Icon }) => (
              <div key={label} className="p-3.5 sm:p-4">
                <p className={`flex items-center gap-1.5 ${labelClass}`}><Icon className="h-3 w-3 shrink-0" /> {label}</p>
                <p className={`mt-2 line-clamp-2 break-words text-sm font-black leading-snug ${value ? 'text-white' : 'text-white/25'}`}>{value || '—'}</p>
                {detail && <p className="mt-1 line-clamp-1 text-[10px] font-bold text-on-surface-variant">{detail}</p>}
              </div>
            ))}
          </div>
        )}

        {open && (
        <>
        {matchInfo.length > 0 && (
          <div className="relative mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-4 [&>*]:min-w-0">
            {matchInfo.map((item) => (
              <div key={item.label}>
                <p className={labelClass}>{item.label}</p>
                <p className="mt-1 break-words text-sm font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {people.length > 0 && (
          <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-3">
              {people.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className={labelClass}>{label}</p>
                    <p className="mt-1 break-words text-sm font-black text-white">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conteúdo e observações lado a lado no computador */}
        {texts.length > 0 && (
          <div className={`relative mt-5 grid gap-3 ${texts.length > 1 ? 'lg:grid-cols-2' : ''}`}>
            {texts.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className={labelClass}>{item.label}</p>
                <p className="mt-2 whitespace-pre-line break-words border-l-2 border-white/25 pl-3 text-sm leading-relaxed text-white/80">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {videos.length > 0 && (
          <div className="mt-5">
            <p className={labelClass}>{videos.length === 1 ? 'Vídeo' : 'Vídeos'}</p>
            {/* Faixa na largura toda do cartão; com mais de um vídeo, duas por linha no computador */}
            <div className={`mt-2 grid gap-3 ${videos.length > 1 ? 'lg:grid-cols-2' : ''}`}>
              {videos.map((video, index) => {
                const thumb = youtubeThumb(video.url);
                const source = sourceOf(video.url);
                // Material sem nome (o formulário não pede mais) é numerado quando há mais de um
                const name = video.title === 'Vídeo' && videos.length > 1 ? `Vídeo ${index + 1}` : video.title;
                return (
                  <a
                    key={video.id}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex min-h-[120px] items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d0f] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-white/40 hover:shadow-[0_18px_44px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] sm:min-h-[136px] sm:gap-6 sm:p-6"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    {thumb ? (
                      <>
                        {/* Capa do YouTube à direita, sumindo para a esquerda */}
                        <img src={thumb} alt="" loading="lazy" className="absolute inset-y-0 right-0 h-full w-full object-cover opacity-45 transition duration-700 group-hover:scale-105 group-hover:opacity-65 sm:w-2/3" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d0f] via-[#0c0d0f]/85 to-[#0c0d0f]/20" />
                      </>
                    ) : (
                      <>
                        {/* Link sem capa (Google Drive etc.): fundo desenhado, com brilho atrás do play e uma grade que some para a direita */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_50%,rgba(255,255,255,0.14),transparent_45%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(90deg,transparent,black_30%,black_70%,transparent)]" />
                        <div className="absolute -right-10 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full border border-white/[0.06]" />
                        <div className="absolute -right-2 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full border border-white/[0.05]" />
                      </>
                    )}

                    {/* Play com aros finos em volta */}
                    <span className="relative flex h-16 w-16 shrink-0 items-center justify-center sm:h-20 sm:w-20">
                      <span className="absolute inset-0 rounded-full border border-white/15 transition duration-500 group-hover:scale-110 group-hover:border-white/30" />
                      <span className="absolute inset-[7px] rounded-full border border-white/25 bg-white/[0.04] backdrop-blur-sm" />
                      <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-white to-zinc-300 text-background shadow-[0_8px_24px_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.15)] transition duration-300 group-hover:scale-110 sm:h-12 sm:w-12">
                        <Play className="ml-0.5 h-4 w-4 fill-current sm:h-5 sm:w-5" />
                      </span>
                    </span>

                    <div className="relative min-w-0 flex-1">
                      <p className={labelClass}>{source || 'Vídeo da reunião'}</p>
                      <p className="mt-1.5 break-words text-lg font-black uppercase italic leading-tight tracking-tight text-white sm:text-2xl">{name}</p>
                      <p className="mt-1.5 text-xs font-bold text-white/60">Material da reunião · abre em outra aba</p>
                    </div>

                    <span className="relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 text-[9px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-sm transition group-hover:border-primary group-hover:bg-primary group-hover:text-background max-sm:w-10 max-sm:justify-center max-sm:px-0">
                      <span className="max-sm:hidden">Assistir</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
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
              {pdfs.map((pdf, index) => (
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
                    <span className="block break-words text-xs font-black uppercase leading-tight text-white transition group-hover:text-background">{pdf.title === 'PDF' && pdfs.length > 1 ? `PDF ${index + 1}` : pdf.title}</span>
                    <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant transition group-hover:text-background/60">Abrir PDF</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-on-surface-variant transition group-hover:text-background" />
                </a>
              ))}
            </div>
          </div>
        )}

        {!isUpcoming && meeting.materials.length === 0 && <p className="mt-4 text-xs font-bold text-white/50">Nenhum vídeo ou PDF adicionado a esta reunião.</p>}
        </>
        )}
        </div>

        {/* Barra de baixo, na largura do cartão: abre e recolhe os detalhes */}
        <button
          type="button"
          onClick={() => setOpenIds((prev) => toggleIn(prev, meeting.id))}
          aria-expanded={open}
          className="group relative flex w-full items-center justify-center gap-2 border-t border-white/10 bg-white/[0.02] py-3.5 text-[9px] font-black uppercase tracking-[0.22em] text-white/70 transition hover:bg-primary hover:text-background"
        >
          {open ? 'Recolher' : 'Ver detalhes'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
    );
  };

  const timeline = (items: TacticalMeeting[], highlightFirst: boolean) => (
    <div className="space-y-3">{items.map((meeting, index) => renderMeeting(meeting, highlightFirst && index === 0))}</div>
  );

  // No topo vale a agendada mais próxima de hoje em diante; só com agendadas de data passada, a primeira delas
  const next = upcoming.find((meeting) => meeting.date >= today) || upcoming[0];
  const last = past[0];
  const nextDate = next ? toDate(next.date) : null;
  const nextDays = nextDate ? Math.round((nextDate.getTime() - (toDate(today)?.getTime() || 0)) / DAY) : 0;
  const summary = [
    { label: 'Concluídas', value: past.length, icon: CalendarCheck, tone: 'text-emerald-300' },
    { label: 'Agendadas', value: upcoming.length, icon: CalendarClock, tone: 'text-amber-300' },
    { label: 'Pendentes', value: pending.length, icon: Hourglass, tone: 'text-error' },
    // Vídeos e PDFs somados numa contagem só, a pedido do usuário
    { label: 'Materiais enviados', value: videoCount + pdfCount, icon: FileText, tone: '' },
  ];

  return (
    <div className="mt-8 space-y-8">
      <section className="space-y-3">
        <SectionTitle>Acompanhamento tático</SectionTitle>
        {/* Com o formulário aberto, o painel do topo e as contagens somem */}
        {editingId === null && (
        <>
        <div className={`${panelClass} relative overflow-hidden p-5 sm:p-6`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/[0.07] blur-3xl" />
          <Presentation className="pointer-events-none absolute -bottom-8 right-6 h-40 w-40 text-white/[0.03]" strokeWidth={1.25} />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary bg-primary text-background shadow-[0_8px_24px_rgba(255,255,255,0.18)]">
                <Presentation className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className={labelClass}>{next ? 'Próxima reunião' : 'Consultoria tática'}</p>
                <p className="mt-1.5 break-words text-xl font-black uppercase italic leading-tight tracking-tight text-white sm:text-2xl">
                  {next ? headlineOf(next) : meetings.length > 0 ? 'Nenhuma reunião agendada' : 'Nenhuma reunião cadastrada'}
                </p>
                {next ? (
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-on-surface-variant">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${STATUS_TONES.Agendada}`}>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
                      {nextDays >= 0 ? countdown(nextDays) : 'Agendada'}
                    </span>
                    <span className="text-white">{nextDate?.toLocaleDateString('pt-BR')}</span>
                    {next.time && <span>às {next.time.replace(':', 'h')}</span>}
                  </p>
                ) : last && (
                  <p className="mt-2 text-xs font-bold text-on-surface-variant">
                    Última reunião em <span className="text-white">{toDate(last.date)?.toLocaleDateString('pt-BR')}</span>
                  </p>
                )}
              </div>
            </div>
            {isAdmin && editingId === null && (
              <button
                type="button"
                onClick={() => openForm()}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[10px] font-black uppercase tracking-[0.2em] text-background shadow-[0_8px_24px_rgba(255,255,255,0.15)] transition hover:scale-[1.03] max-sm:w-full max-sm:justify-center"
              >
                <Plus className="h-4 w-4" />
                Adicionar reunião
              </button>
            )}
          </div>

        </div>

        {/* Contagens numa faixa só, em painel próprio, separado do painel de adicionar reunião */}
        <div className={`${panelClass} relative overflow-hidden px-2 py-5 sm:px-4`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="relative grid grid-cols-4 [&>*:not(:first-child)]:border-l [&>*]:min-w-0 [&>*]:border-white/10">
            {summary.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="px-1 text-center sm:px-3">
                <p className={`text-2xl font-black italic leading-none tracking-tight sm:text-4xl ${value ? 'text-white' : 'text-white/25'}`}>{value}</p>
                <p className={`mt-2.5 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] ${tone || 'text-on-surface-variant'} max-sm:text-[7px] max-sm:tracking-[0.1em]`}>
                  <Icon className="h-3 w-3 shrink-0 max-sm:hidden" /> {label}
                </p>
              </div>
            ))}
          </div>
        </div>
        </>
        )}

        {isAdmin && editingId !== null && (
          <form onSubmit={submit} className={`${panelClass} relative space-y-4 overflow-hidden p-4 sm:p-6`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white">
                {editingId === 'new' ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </span>
              <p className="text-sm font-black uppercase italic tracking-tight text-white">{editingId === 'new' ? 'Nova reunião' : 'Editar reunião'}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <label className="block">
                <span className={labelClass}>Data *</span>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`mt-2 ${dateInputClass}`} />
              </label>
              <label className="block">
                <span className={labelClass}>Horário</span>
                <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={`mt-2 ${dateInputClass}`} />
              </label>
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.7fr_1.3fr_1.3fr] [&>*]:min-w-0">
                <label className="block">
                  <span className={labelClass}>Data da partida</span>
                  <input type="date" value={extra.matchDate} onChange={(event) => setField({ matchDate: event.target.value })} className={`mt-2 ${dateInputClass}`} />
                </label>
                <label className="block">
                  <span className={labelClass}>Horário da partida</span>
                  <input type="time" value={extra.matchTime} onChange={(event) => setField({ matchTime: event.target.value })} className={`mt-2 ${dateInputClass}`} />
                </label>
                <label className="block">
                  <span className={labelClass}>Rodada</span>
                  <input type="text" value={extra.round} onChange={(event) => setField({ round: event.target.value })} placeholder="Ex.: 3" className={`mt-2 ${inputClass}`} />
                </label>
                <label className="block">
                  <span className={labelClass}>Partida</span>
                  <input type="text" value={extra.match} onChange={(event) => setField({ match: event.target.value })} placeholder="Mandante x Visitante" className={`mt-2 ${inputClass}`} />
                </label>
                <label className="block">
                  <span className={labelClass}>Competição</span>
                  <input type="text" value={extra.competition} onChange={(event) => setField({ competition: event.target.value })} placeholder="Ex.: Paulista Sub-17" className={`mt-2 ${inputClass}`} />
                </label>
              </div>
              <div className="sm:col-span-2">
                <span className={labelClass}>Tipo de reunião</span>
                <div className="mt-2">
                  <SheetSelect
                    value=""
                    multiple={extra.types}
                    onToggle={(type) => setField({ types: toggleIn(extra.types, type) })}
                    options={toOptions(MEETING_TYPES)}
                    onChange={() => undefined}
                    label="Tipo de reunião"
                    placeholder="Selecione um ou mais"
                    className={selectClass}
                  />
                </div>
              </div>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Conteúdo da reunião</span>
                <textarea
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  rows={3}
                  placeholder="O que foi (ou será) abordado na reunião"
                  className={`mt-2 ${inputClass} h-auto resize-y py-3 leading-relaxed`}
                />
              </label>
              <div>
                <span className={labelClass}>Status da reunião</span>
                <div className="mt-2">
                  <SheetSelect
                    value={extra.status}
                    options={toOptions(STATUSES)}
                    onChange={(next) => setField({ status: (next || 'Agendada') as TacticalStatus })}
                    label="Status da reunião"
                    className={selectClass}
                  />
                </div>
              </div>
              <label className="block">
                <span className={labelClass}>Duração da reunião (minutos)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={extra.duration}
                  onChange={(event) => setField({ duration: event.target.value.replace(/\D/g, '') })}
                  placeholder="Ex.: 45"
                  className={`mt-2 ${inputClass}`}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Observações</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Observações sobre a reunião"
                  className={`mt-2 ${inputClass} h-auto resize-y py-3 leading-relaxed`}
                />
              </label>
              <div className="sm:col-span-2">
                <span className={labelClass}>Analistas</span>
                <div className="mt-2">
                  <SheetSelect
                    value=""
                    multiple={extra.analysts}
                    onToggle={(name) => setField({ analysts: toggleIn(extra.analysts, name) })}
                    options={analystOptions}
                    onChange={() => undefined}
                    label="Analistas"
                    placeholder="Selecione um ou mais"
                    className={selectClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <span className={labelClass}>Vídeos e PDFs</span>
              <p className="mt-1 text-xs text-white/60">Cole o link de cada material (YouTube, Google Drive etc.). Dá para adicionar depois, editando a reunião.</p>
              <div className="mt-3 space-y-2">
                {materials.map((item) => (
                  <div key={item.id} className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:grid-cols-[auto_1fr_auto] sm:items-center [&>*]:min-w-0">
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
              {/* Um botão só: a linha entra como vídeo e o tipo é trocado na própria linha */}
              <button
                type="button"
                onClick={() => setMaterials((prev) => [...prev, { id: newId(), type: 'video', title: '', url: '' }])}
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-[9px] font-black uppercase tracking-[0.2em] text-white transition hover:border-primary hover:bg-primary hover:text-background"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar material
              </button>
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

      </section>

      {/* Sem reunião agendada a seção não aparece: o painel do topo já avisa */}
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <SectionTitle aside={`${upcoming.length} ${upcoming.length === 1 ? 'agendada' : 'agendadas'}`}>Próximas reuniões</SectionTitle>
          {timeline(upcoming, true)}
        </section>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <SectionTitle aside={`${pending.length} ${pending.length === 1 ? 'pendente' : 'pendentes'}`}>Reuniões pendentes</SectionTitle>
          {timeline(pending, false)}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <SectionTitle aside={`${past.length} ${past.length === 1 ? 'concluída' : 'concluídas'}`}>Reuniões concluídas</SectionTitle>
          {timeline(past, false)}
        </section>
      )}
    </div>
  );
};
