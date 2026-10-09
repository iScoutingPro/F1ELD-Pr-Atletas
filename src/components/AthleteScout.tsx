import React, { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ScoutEntry } from '../types';
import { scoutValue, sortScoutEntries } from '../scout';
import {
  GAMES_KEY, GAMES_LABEL, GENERAL_ICONS, HEADLINE_KEYS, SHEET_KEYS, SHEET_TILE_KEYS,
  TILE_TONES, TechnicalBlocks, TechnicalProfile, fieldOf, labelClass, panelClass,
} from './ScoutOverview';

const topLineClass = 'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent';
const format = (value: number) => value.toLocaleString('pt-BR');
// Nos quadros pequenos do scout geral os cartões aparecem com sigla, a pedido do usuário (o nome inteiro era cortado)
const TILE_LABELS: Record<string, string> = { yellowCards: 'Cartão AMA', redCards: 'Cartão VER' };



const SectionTitle = ({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <span className="h-4 w-0.5 rounded-full bg-primary" />
    <h3 className="text-base font-black uppercase tracking-[0.12em] text-primary underline decoration-2 underline-offset-8">{children}</h3>
    <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    {aside && <span className="text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant">{aside}</span>}
  </div>
);

// Scout do atleta, no mesmo desenho do resumo da aba "Scout": scout geral (o que existe em todo jogo), scout técnico
// (só quando algum jogo tem números além dos da súmula). O detalhe de cada partida saiu daqui a pedido do usuário.
// Recebe só os lançamentos do atleta; jogos do Calendário ficam no ícone Calendário
export const AthleteScout = ({ entries }: { entries: ScoutEntry[] }) => {
  // Tela à mostra: a inicial (cards), o scout geral (radar, antes "Perfil técnico") ou o scout técnico (ações gerais, ofensivas e defensivas).
  // As duas últimas abrem pelos botões de baixo da tela inicial
  const [screen, setScreen] = useState<'main' | 'general' | 'technical'>('main');
  const sorted = sortScoutEntries(entries);
  // Soma de cada número lançado; totais e percentuais são calculados sobre essa soma
  const totals: Record<string, number> = {};
  sorted.forEach((entry) => Object.entries(entry.stats).forEach(([key, value]) => { totals[key] = (totals[key] || 0) + value; }));
  const value = (key: string) => scoutValue(fieldOf(key), totals) || 0;

  if (sorted.length === 0) {
    return (
      <section className="mt-8 space-y-3">
        <SectionTitle>Scout</SectionTitle>
        <div className={`${panelClass} p-8 text-center`}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Sem números</p>
          <p className="mt-2 text-sm text-white/70">Nenhum número de scout cadastrado para este atleta.</p>
        </div>
      </section>
    );
  }

  const games = sorted.length;
  const gamesText = (count: number) => `${count} ${count === 1 ? 'jogo' : 'jogos'}`;
  // Jogos com algum número além dos da súmula (jogos com transmissão)
  const technicalCount = sorted.filter((entry) => Object.keys(entry.stats).some((key) => !SHEET_KEYS.has(key))).length;

  // Botão que troca a tela inicial pela tela pedida e volta; fica embaixo na tela inicial e, na tela aberta, no topo
  const screenButton = (target: 'general' | 'technical', title: string, openLabel: string) => (
    <button
      type="button"
      onClick={() => setScreen((current) => (current === target ? 'main' : target))}
      className={`${panelClass} relative flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 overflow-hidden px-5 py-5 text-left transition hover:bg-white/[0.06] sm:px-6`}
    >
      <div className={topLineClass} />
      <div className="min-w-0">
        <p className="text-base font-black uppercase italic tracking-tight text-white">{title}</p>
        <p className="mt-1 text-[10px] font-bold text-on-surface-variant">
          Jogos com transmissão · <span className="text-white">{technicalCount}</span> de <span className="text-white">{gamesText(games)}</span>
        </p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-background">
        {screen === target && <ArrowLeft className="h-3.5 w-3.5" />}
        {screen === target ? 'Voltar' : openLabel}
        {screen !== target && <ArrowRight className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
  const generalButton = screenButton('general', 'Scout geral', 'Ver scout geral');
  const technicalButton = screenButton('technical', 'Scout técnico', 'Ver scout técnico');

  return (
    <div className="mt-8 space-y-10">
      {screen === 'general' && generalButton}
      {screen === 'technical' && technicalButton}

      {/* Tela inicial: os cards e, embaixo, os botões que abrem o scout geral (radar) e o scout técnico */}
      {screen === 'main' && (
      <>
      <section className="space-y-4">
        <SectionTitle aside={gamesText(games)}>Scout geral</SectionTitle>
        <div className="grid grid-cols-2 gap-3 max-sm:[&>*:first-child]:col-span-2 sm:grid-cols-3 lg:grid-cols-5">
          {HEADLINE_KEYS.map((key) => {
            const Icon = GENERAL_ICONS[key];
            const isGames = key === GAMES_KEY;
            const total = isGames ? games : value(key);
            const perGame = total / games;
            return (
              <div key={key} className={`${panelClass} relative overflow-hidden p-4`}>
                <div className={topLineClass} />
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/[0.07] blur-2xl" />
                <Icon className="pointer-events-none absolute -bottom-5 -right-4 h-24 w-24 text-white/[0.04]" strokeWidth={1.5} />
                <div className="relative flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className={labelClass}>{isGames ? GAMES_LABEL : fieldOf(key).label}</p>
                </div>
                <p className="relative mt-4 text-4xl font-black italic leading-none tracking-tight text-white">{format(total)}</p>
                {/* Jogos relacionados não tem linha de baixo; o espaço é mantido para o número ficar na mesma altura dos outros */}
                <p className={`relative mt-2.5 text-xs font-bold text-on-surface-variant ${isGames ? 'invisible' : ''}`}>
                  {isGames ? (
                    '-'
                  ) : fieldOf(key).flag ? (
                    <><span className="font-black text-white">{Math.round(perGame * 100)}%</span> dos jogos</>
                  ) : (
                    <>Média de <span className="font-black text-white">{perGame.toLocaleString('pt-BR', { maximumFractionDigits: key === 'minutes' ? 0 : 2 })}</span> por jogo</>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SHEET_TILE_KEYS.map((key) => {
            const Icon = GENERAL_ICONS[key];
            const total = value(key);
            const share = Math.round((total / games) * 100);
            return (
              <div key={key} className={`${panelClass} relative overflow-hidden p-4`} title={`${fieldOf(key).label}: ${total} em ${gamesText(games)}`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${TILE_TONES[key]}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-2xl font-black italic leading-none text-white">{format(total)}</p>
                    <p className="mt-1.5 truncate text-[9px] font-black uppercase tracking-[0.16em] text-on-surface-variant">{TILE_LABELS[key] || fieldOf(key).label}</p>
                  </div>
                  <p className="ml-auto shrink-0 text-right text-[10px] font-black text-white/70">{share}%</p>
                </div>
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(share, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {technicalCount > 0 && (
        <div className="space-y-3">
          {generalButton}
          {technicalButton}
        </div>
      )}
      </>
      )}

      {screen === 'general' && <TechnicalProfile totals={totals} />}

      {screen === 'technical' && <TechnicalBlocks totals={totals} title={(text) => <SectionTitle>{text}</SectionTitle>} />}

    </div>
  );
};
