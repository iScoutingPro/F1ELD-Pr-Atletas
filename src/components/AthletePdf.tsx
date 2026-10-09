import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, Check, Download, Eye, FileText, LineChart, Loader2, LucideIcon, MessageCircle, Presentation, ScrollText, Share2, Shield, Target, User, Video, X } from 'lucide-react';
import { Athlete, ScoutEntry } from '../types';
import { PDF_SECTIONS, PdfSectionKey, buildAthletePdf } from '../pdf';

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const labelClass = 'text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant';
const ghostButtonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.2em] text-white transition hover:border-primary hover:bg-primary hover:text-background';

// A escolha das seções fica guardada no navegador, para o próximo PDF já abrir do mesmo jeito
const STORAGE_KEY = 'fieldpro_pdf_sections_v1';
const DEFAULT_SECTIONS: PdfSectionKey[] = ['personal', 'sports', 'dvd', 'scoutTotals'];
const ALL_KEYS = PDF_SECTIONS.map((section) => section.key);

const ICONS: Record<PdfSectionKey, LucideIcon> = {
  personal: User,
  sports: Shield,
  dvd: Video,
  contacts: MessageCircle,
  scoutTotals: BarChart3,
  scoutTechnical: LineChart,
  tactical: Presentation,
  contract: ScrollText,
  goals: Target,
};

const GROUPS: { title: string; keys: PdfSectionKey[] }[] = [
  { title: 'Perfil', keys: ['personal', 'sports', 'dvd', 'contacts'] },
  { title: 'Desempenho', keys: ['scoutTotals', 'scoutTechnical', 'tactical'] },
  { title: 'Contrato', keys: ['contract', 'goals'] },
];

const labelOf = (key: PdfSectionKey) => PDF_SECTIONS.find((section) => section.key === key)?.label || '';

const readStored = (): PdfSectionKey[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(stored)) return ALL_KEYS.filter((key) => stored.includes(key));
  } catch {
    // Navegador sem acesso ao armazenamento: vale a escolha padrão
  }
  return DEFAULT_SECTIONS;
};

// Números que existem em todo jogo (súmula); qualquer outro indica jogo com scout técnico
const SHEET_KEYS = new Set(['starter', 'bench', 'subIn', 'subOut', 'minutes', 'goals', 'yellowCards', 'redCards']);

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

interface ReadyPdf {
  url: string;
  file: File;
  pages: number;
}

interface AthletePdfProps {
  athlete: Athlete;
  // Lançamentos de scout do atleta
  entries: ScoutEntry[];
}

// PDF do atleta (ícone PDF do perfil): o usuário escolhe as seções e gera um documento para encaminhar
export const AthletePdf = ({ athlete, entries }: AthletePdfProps) => {
  const [selected, setSelected] = useState<PdfSectionKey[]>(readStored);
  const [working, setWorking] = useState(false);
  const [ready, setReady] = useState<ReadyPdf | null>(null);
  const [error, setError] = useState('');

  // Janela da pré-visualização: abre sozinha quando o PDF fica pronto e fecha pelo "X", clicando fora ou com Esc
  const [showPreview, setShowPreview] = useState(false);

  // O endereço do arquivo gerado é liberado quando outro é gerado ou a aba é fechada
  useEffect(() => () => {
    if (ready) URL.revokeObjectURL(ready.url);
  }, [ready]);

  useEffect(() => {
    setShowPreview(Boolean(ready));
  }, [ready]);

  // Esc fecha só a pré-visualização, não o perfil do atleta que está por baixo
  useEffect(() => {
    if (!showPreview) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      setShowPreview(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [showPreview]);

  const fullName = `${athlete.name} ${athlete.lastName || ''}`.trim();
  const technicalGames = entries.filter((entry) => Object.keys(entry.stats).some((key) => !SHEET_KEYS.has(key))).length;
  const meetings = athlete.tacticalMeetings?.length || 0;
  const goals = athlete.contractGoals?.length || 0;
  const hasContract = Boolean(athlete.contractLevel || athlete.contractStart || athlete.contractEnd || athlete.contractLink || athlete.contractFile);

  // O que cada seção leva para o documento, com os dados deste atleta
  const details: Record<PdfSectionKey, string> = {
    personal: 'Nome, nascimento, nacionalidade e cidade',
    sports: 'Clube, categoria e posições',
    dvd: athlete.hasDvd ? (athlete.dvdLink ? 'Link do DVD para abrir' : 'Possui DVD, sem link') : 'Atleta sem DVD',
    contacts: 'WhatsApp do atleta e do responsável',
    scoutTotals: entries.length ? `Jogos, minutagem, titular, reserva e gols de ${plural(entries.length, 'jogo', 'jogos')}` : 'Sem scout lançado',
    scoutTechnical: technicalGames ? `Aproveitamento e ações de ${plural(technicalGames, 'jogo', 'jogos')}` : 'Sem scout técnico lançado',
    tactical: meetings ? `${plural(meetings, 'reunião', 'reuniões')}, com situação, conteúdo e materiais` : 'Sem reuniões',
    contract: hasContract ? 'Tipo, início, término e situação' : 'Sem contrato cadastrado',
    goals: goals ? `${plural(goals, 'meta', 'metas')} com o progresso` : 'Sem metas',
  };

  // Mudar a escolha descarta o PDF já gerado, que não vale mais
  const choose = (next: PdfSectionKey[]) => {
    setSelected(next);
    setReady(null);
    setError('');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sem armazenamento, a escolha vale só para esta vez
    }
  };

  const toggle = (key: PdfSectionKey) =>
    choose(selected.includes(key) ? selected.filter((item) => item !== key) : ALL_KEYS.filter((item) => item === key || selected.includes(item)));

  const generate = async () => {
    setWorking(true);
    setError('');
    try {
      const { blob, fileName, pages } = await buildAthletePdf({ athlete, sections: selected, entries });
      const file = new File([blob], fileName, { type: 'application/pdf' });
      setReady({ url: URL.createObjectURL(file), file, pages });
    } catch (cause) {
      console.error('Erro ao gerar o PDF do atleta:', cause);
      setError('Não foi possível gerar o PDF. Tente de novo.');
    }
    setWorking(false);
  };

  const canShare = Boolean(ready && typeof navigator.canShare === 'function' && navigator.canShare({ files: [ready.file] }));

  const share = async () => {
    if (!ready) return;
    try {
      await navigator.share({ files: [ready.file], title: ready.file.name });
    } catch (cause) {
      // Fechar a janela de compartilhar sem escolher nada não é erro
      if ((cause as Error)?.name === 'AbortError') return;
      console.error('Erro ao compartilhar o PDF do atleta:', cause);
      setError('Não foi possível compartilhar. Use "Baixar" e envie o arquivo.');
    }
  };

  const chosen = PDF_SECTIONS.filter((section) => selected.includes(section.key));

  // Nome, páginas e tamanho do PDF gerado (na faixa "PDF pronto" e no topo da pré-visualização)
  const fileInfo = ready && (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary bg-primary text-background">
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black uppercase italic tracking-tight text-white">Pré-visualização</p>
        <p className="mt-1 break-words text-[11px] leading-tight text-on-surface-variant">
          {ready.file.name} · {plural(ready.pages, 'página', 'páginas')} · {Math.max(1, Math.round(ready.file.size / 1024))} KB
        </p>
      </div>
    </div>
  );

  return (
    <div className="mt-8 space-y-6">
      <div className={`${panelClass} relative overflow-hidden p-5 sm:p-6`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/[0.07] blur-3xl" />
        <FileText className="pointer-events-none absolute -bottom-8 right-6 h-40 w-40 text-white/[0.03]" strokeWidth={1.25} />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary bg-primary text-background shadow-[0_8px_24px_rgba(255,255,255,0.18)]">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className={labelClass}>Documento para encaminhar</p>
              <p className="mt-1.5 text-xl font-black uppercase italic leading-none tracking-tight text-white sm:text-2xl">Relatório em PDF</p>
              <p className="mt-2 text-xs text-white/70">Escolha o que entra no documento. Foto, nome, posição, clube, idade, altura, peso e pé dominante entram sempre.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => choose(ALL_KEYS)} className={ghostButtonClass}>Marcar tudo</button>
            <button type="button" onClick={() => choose([])} className={ghostButtonClass}>Limpar</button>
          </div>
        </div>
        {/* Quantas seções de cada grupo estão marcadas */}
        <div className="relative mt-5 grid grid-cols-3 border-t border-white/10 pt-4 [&>*:not(:first-child)]:border-l [&>*]:min-w-0 [&>*]:border-white/10">
          {GROUPS.map((group) => {
            const count = group.keys.filter((key) => selected.includes(key)).length;
            return (
              <div key={group.title} className="px-2 text-center">
                <p className="text-2xl font-black italic leading-none tracking-tight text-white">
                  <span className={count ? '' : 'text-white/25'}>{count}</span>
                  <span className="ml-1 text-xs not-italic text-on-surface-variant">de {group.keys.length}</span>
                </p>
                <p className={`mt-2 ${labelClass}`}>{group.title}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title} className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="h-4 w-0.5 rounded-full bg-primary" />
                <h3 className="text-base font-black uppercase tracking-[0.12em] text-primary underline decoration-2 underline-offset-8">{group.title}</h3>
                <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {group.keys.map((key) => {
                  const Icon = ICONS[key];
                  const active = selected.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(key)}
                      aria-pressed={active}
                      className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 ${active ? 'border-primary/60 bg-gradient-to-b from-white/[0.12] to-white/[0.03] shadow-[0_10px_28px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.18)]' : 'border-white/10 bg-white/[0.02] hover:border-white/30'}`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${active ? 'border-primary bg-primary text-background' : 'border-white/10 bg-white/[0.04] text-white/60'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs font-black uppercase leading-tight tracking-[0.06em] ${active ? 'text-white' : 'text-white/70'}`}>{labelOf(key)}</span>
                        <span className="mt-1 block text-[11px] leading-tight text-on-surface-variant">{details[key]}</span>
                      </span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${active ? 'border-primary bg-primary text-background' : 'border-white/20'}`}>
                        {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className={`${panelClass} p-4`}>
            <div className="flex items-center justify-between">
              <p className={labelClass}>Documento</p>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white">{selected.length} de {ALL_KEYS.length} seções</p>
            </div>

            {/* Miniatura do documento, no desenho do PDF: capa escura, faixa de destaque e as seções escolhidas, numeradas na ordem em que saem */}
            <div className="mx-auto mt-4 w-full max-w-[14rem] overflow-hidden rounded-lg bg-white shadow-[0_22px_50px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.12)]">
              <div className="relative overflow-hidden bg-[#0d0e10] p-3">
                <span className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full border border-white/10" />
                <span className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full border border-white/10" />
                <p className="relative flex items-center gap-1 text-[5.5px] font-black uppercase tracking-[0.2em] text-white"><span className="h-1 w-1 bg-white" />Relatório do atleta</p>
                <div className="relative mt-2 flex items-center gap-2">
                  {athlete.image
                    ? <img src={athlete.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white ring-offset-1 ring-offset-[#0d0e10]" />
                    : <span className="h-10 w-10 shrink-0 rounded-full bg-white/10 ring-1 ring-white" />}
                  <div className="min-w-0">
                    <p className="break-words text-[10px] font-black uppercase italic leading-tight text-white">{fullName}</p>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {[athlete.position, athlete.category].filter(Boolean).map((tag, index) => (
                        <span key={tag} className={`rounded-full px-1.5 py-px text-[5px] font-black uppercase tracking-[0.1em] ${index === 0 ? 'bg-white text-[#0d0e10]' : 'border border-white/30 text-white'}`}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="relative mt-2.5 grid grid-cols-4 gap-px rounded border border-white/15 bg-white/[0.04] px-1 py-1.5">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="space-y-0.5 px-1">
                      <span className="block h-px w-3 bg-white/30" />
                      <span className="block h-1 w-4 rounded-sm bg-white/80" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="min-h-[10rem] space-y-2 p-3">
                {chosen.map((section, index) => (
                  <div key={section.key} className="flex items-center gap-1.5">
                    <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] bg-[#0d0e10] text-[5px] font-black text-white">{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-[7.5px] font-black uppercase tracking-[0.06em] text-[#0d0e10]">{section.label}</span>
                    <span className="h-px flex-1 bg-black/15" />
                  </div>
                ))}
                {chosen.length === 0 && <p className="pt-8 text-center text-[8px] font-bold uppercase tracking-[0.1em] text-black/50">Só a capa do atleta</p>}
              </div>
              <div className="flex items-center justify-between border-t border-black/10 px-3 py-1.5">
                <span className="h-px w-16 bg-black/20" />
                <span className="rounded-full bg-[#0d0e10] px-1.5 py-px text-[5px] font-black text-white">1 / …</span>
              </div>
            </div>

            <button
              type="button"
              onClick={generate}
              disabled={working}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[10px] font-black uppercase tracking-[0.2em] text-background shadow-[0_8px_24px_rgba(255,255,255,0.14)] transition hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {working ? 'Gerando...' : ready ? 'Gerar de novo' : 'Gerar PDF'}
            </button>
            {error && <p className="mt-3 text-center text-xs font-bold text-error">{error}</p>}
          </div>

        </div>
      </div>

      {/* PDF gerado: depois de fechar a pré-visualização, esta faixa deixa abrir de novo */}
      {ready && (
        <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-3xl border border-primary/60 bg-gradient-to-b from-white/[0.1] to-white/[0.02] p-4 shadow-[0_12px_40px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.18)] sm:p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          {fileInfo}
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[10px] font-black uppercase tracking-[0.2em] text-background shadow-[0_8px_24px_rgba(255,255,255,0.14)] transition hover:scale-[1.02] max-sm:w-full"
          >
            <Eye className="h-4 w-4" />
            Ver pré-visualização
          </button>
        </div>
      )}

      {/* Pré-visualização numa janela própria, por cima do perfil: o PDF para conferir e, embaixo, baixar e compartilhar */}
      {ready && showPreview && createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-6" onClick={() => setShowPreview(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pré-visualização do PDF do atleta"
            onClick={(event) => event.stopPropagation()}
            className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#17191c] shadow-[0_30px_80px_rgba(0,0,0,0.8)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute right-3 top-3 z-30 flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-error/40 bg-error/15 text-error transition hover:bg-error/25"
              aria-label="Fechar pré-visualização"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="p-4 pr-16 sm:p-5 sm:pr-16">{fileInfo}</div>

            <div className="min-h-0 flex-1 border-y border-white/10 bg-black/40 p-2 sm:p-3">
              <iframe
                key={ready.url}
                src={`${ready.url}#toolbar=0&navpanes=0&view=FitH`}
                title="Pré-visualização do PDF do atleta"
                className="h-full w-full rounded-xl bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <p className="text-xs text-white/70 max-sm:hidden">Confira o documento. Para mudar algo, feche, altere as seções e gere de novo.</p>
              <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
              <a href={ready.url} download={ready.file.name} className={`${ghostButtonClass} h-11 px-6 max-sm:flex-1`}>
                <Download className="h-3.5 w-3.5" />
                Baixar
              </a>
              {canShare && (
                <button
                  type="button"
                  onClick={share}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[10px] font-black uppercase tracking-[0.2em] text-background shadow-[0_8px_24px_rgba(255,255,255,0.14)] transition hover:scale-[1.02] max-sm:flex-1"
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </button>
              )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
