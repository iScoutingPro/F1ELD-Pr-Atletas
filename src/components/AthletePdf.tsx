import React, { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, Check, Download, Eye, FileText, ListOrdered, Loader2, LucideIcon, MessageCircle, Presentation, ScrollText, Share2, Shield, Target, User, Video } from 'lucide-react';
import { Athlete, Game, ScoutEntry } from '../types';
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
  scoutGames: ListOrdered,
  games: CalendarDays,
  tactical: Presentation,
  contract: ScrollText,
  goals: Target,
};

const GROUPS: { title: string; keys: PdfSectionKey[] }[] = [
  { title: 'Perfil', keys: ['personal', 'sports', 'dvd', 'contacts'] },
  { title: 'Desempenho', keys: ['scoutTotals', 'scoutGames', 'games', 'tactical'] },
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

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

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
  games: Game[];
}

// PDF do atleta (ícone PDF do perfil): o usuário escolhe as seções e gera um documento para encaminhar
export const AthletePdf = ({ athlete, entries, games }: AthletePdfProps) => {
  const [selected, setSelected] = useState<PdfSectionKey[]>(readStored);
  const [working, setWorking] = useState(false);
  const [ready, setReady] = useState<ReadyPdf | null>(null);
  const [error, setError] = useState('');

  // O endereço do arquivo gerado é liberado quando outro é gerado ou a aba é fechada
  useEffect(() => () => {
    if (ready) URL.revokeObjectURL(ready.url);
  }, [ready]);

  const fullName = `${athlete.name} ${athlete.lastName || ''}`.trim();
  const upcomingGames = games.filter((game) => game.athleteIds.includes(athlete.id) && game.date >= todayKey()).length;
  const meetings = athlete.tacticalMeetings?.length || 0;
  const goals = athlete.contractGoals?.length || 0;
  const hasContract = Boolean(athlete.contractLevel || athlete.contractStart || athlete.contractEnd || athlete.contractLink);

  // O que cada seção leva para o documento, com os dados deste atleta
  const details: Record<PdfSectionKey, string> = {
    personal: 'Nome, nascimento, nacionalidade e cidade',
    sports: 'Clube, categoria e posições',
    dvd: athlete.hasDvd ? (athlete.dvdLink ? 'Link do DVD para abrir' : 'Possui DVD, sem link') : 'Atleta sem DVD',
    contacts: 'WhatsApp do atleta e do responsável',
    scoutTotals: entries.length ? `Soma de ${plural(entries.length, 'jogo', 'jogos')}` : 'Sem scout lançado',
    scoutGames: entries.length ? `${plural(entries.length, 'jogo', 'jogos')} em detalhe` : 'Sem scout lançado',
    games: upcomingGames ? plural(upcomingGames, 'jogo', 'jogos') : 'Sem jogos cadastrados',
    tactical: meetings ? `${plural(meetings, 'reunião', 'reuniões')}, com vídeos e PDFs` : 'Sem reuniões',
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
      const { blob, fileName, pages } = await buildAthletePdf({ athlete, sections: selected, entries, games });
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

  return (
    <div className="mt-8 space-y-6">
      <div className={`${panelClass} relative overflow-hidden p-5 sm:p-6`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary bg-primary text-background">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black uppercase italic leading-none tracking-tight text-white">Relatório em PDF</p>
              <p className="mt-2 text-xs text-white/70">Escolha o que entra no documento. Foto, nome, posição, clube, idade, altura, peso e pé dominante entram sempre.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => choose(ALL_KEYS)} className={ghostButtonClass}>Marcar tudo</button>
            <button type="button" onClick={() => choose([])} className={ghostButtonClass}>Limpar</button>
          </div>
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
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? 'border-primary/60 bg-gradient-to-b from-white/[0.12] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]' : 'border-white/10 bg-white/[0.02] hover:border-white/30'}`}
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

            {/* Miniatura do documento: cabeçalho e as seções escolhidas, na ordem em que saem no PDF */}
            <div className="mx-auto mt-4 w-full max-w-[13rem] overflow-hidden rounded-lg bg-primary shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-2 bg-background p-3">
                <img src={athlete.image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-primary" />
                <div className="min-w-0">
                  <p className="text-[6px] font-black uppercase tracking-[0.2em] text-white/50">Relatório do atleta</p>
                  <p className="mt-0.5 break-words text-[10px] font-black uppercase italic leading-tight text-white">{fullName}</p>
                </div>
              </div>
              <div className="min-h-[9.5rem] space-y-2 p-3">
                {chosen.map((section, index) => (
                  <div key={section.key} className="flex items-center gap-1.5">
                    <span className="text-[7px] font-black text-background/40">{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-[7.5px] font-black uppercase tracking-[0.06em] text-background">{section.label}</span>
                    <span className="h-px flex-1 bg-background/15" />
                  </div>
                ))}
                {chosen.length === 0 && <p className="pt-8 text-center text-[8px] font-bold uppercase tracking-[0.1em] text-background/50">Só o cabeçalho do atleta</p>}
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

          {ready && (
            <div className="relative overflow-hidden rounded-3xl border border-primary/60 bg-gradient-to-b from-white/[0.12] to-white/[0.03] p-4 shadow-[0_12px_40px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary bg-primary text-background">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.06em] text-white">PDF pronto</p>
                  <p className="mt-1 break-words text-[11px] leading-tight text-on-surface-variant">
                    {ready.file.name} · {plural(ready.pages, 'página', 'páginas')} · {Math.max(1, Math.round(ready.file.size / 1024))} KB
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {canShare && (
                  <button
                    type="button"
                    onClick={share}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-[10px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.02]"
                  >
                    <Share2 className="h-4 w-4" />
                    Compartilhar
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <a href={ready.url} download={ready.file.name} className={ghostButtonClass}>
                    <Download className="h-3.5 w-3.5" />
                    Baixar
                  </a>
                  <a href={ready.url} target="_blank" rel="noopener noreferrer" className={ghostButtonClass}>
                    <Eye className="h-3.5 w-3.5" />
                    Abrir
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
