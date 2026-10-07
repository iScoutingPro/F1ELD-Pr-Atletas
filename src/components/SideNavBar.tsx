import React from 'react';
import { LayoutGrid, Users, CalendarRange, ClipboardList, Shield, LogOut, ChevronRight, Bell } from 'lucide-react';
import { View, NavItem } from '../types';
import { Logo } from './Logo';

interface SideNavBarProps {
  activeView: View;
  setView: (v: View) => void;
  isAdmin?: boolean;
  onLogout: () => void;
  onToggleNotifications?: () => void;
  notificationsOpen?: boolean;
  unreadNotifications?: number;
}

// Menu lateral fixo à esquerda: faixa só de ícones em telas pequenas, com os nomes a partir de `lg`
export const SideNavBar = ({ activeView, setView, isAdmin, onLogout, onToggleNotifications, notificationsOpen = false, unreadNotifications = 0 }: SideNavBarProps) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    // Agenciados e Negociados não têm mais aba própria: ficam em Atletas Totais, pelo filtro de lista
    { id: 'atletas-totais', label: 'Carteira de Atletas', icon: Users },
    { id: 'calendar', label: 'Calendário', icon: CalendarRange },
    // Lançamento do scout: só aparece para administradores
    ...(isAdmin ? [{ id: 'lancar-scout' as View, label: 'Scout', icon: ClipboardList }] : []),
    // Cadastro de clubes (nome e escudo): só aparece para administradores
    ...(isAdmin ? [{ id: 'clubes' as View, label: 'Clubes', icon: Shield }] : []),
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-16 flex-col overflow-hidden border-r border-white/10 bg-[#0d0e10] shadow-[20px_0_60px_rgba(0,0,0,0.55)] lg:w-80">
      {/* Brilho suave no topo e fio de luz na borda direita */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 via-primary/[0.03] to-transparent" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent" />

      <button
        type="button"
        onClick={() => setView('dashboard')}
        aria-label="Ir para o Dashboard"
        className="relative flex h-20 shrink-0 items-center justify-center gap-4 px-3 transition-opacity hover:opacity-80 active:opacity-60 lg:h-28 lg:justify-start lg:px-8"
      >
        <Logo variant="icon" className="h-9 w-9 shrink-0 lg:h-12 lg:w-12" />
        <div className="hidden flex-col items-start lg:flex">
          <span className="text-3xl font-black italic leading-none tracking-tighter text-white">F1ELD</span>
          <span className="mt-1.5 text-[10px] font-bold uppercase leading-none tracking-[0.42em] text-white/45">Pró Atletas</span>
        </div>
      </button>

      <div className="relative mx-3 h-px shrink-0 bg-gradient-to-r from-transparent via-white/15 to-transparent lg:mx-8" />

      <nav className="relative flex-1 space-y-2 overflow-y-auto px-2 py-6 lg:px-5 lg:py-8">
        <p className="mb-4 hidden px-3 text-[11px] font-bold uppercase tracking-[0.35em] text-white/30 lg:block">Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex w-full items-center justify-center gap-4 rounded-2xl border p-1.5 text-left transition-all duration-300 lg:justify-start lg:px-3 lg:py-3 ${
                isActive
                  ? 'border-white/15 bg-gradient-to-r from-white/[0.14] to-white/[0.03] text-white shadow-[0_10px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'border-transparent text-on-surface-variant hover:border-white/5 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 lg:h-11 lg:w-11 ${
                  isActive
                    ? 'bg-primary text-background shadow-[0_6px_20px_rgba(255,255,255,0.18)]'
                    : 'bg-white/5 ring-1 ring-inset ring-white/5 group-hover:bg-white/10'
                }`}
              >
                <Icon className="h-[18px] w-[18px] lg:h-5 lg:w-5" strokeWidth={isActive ? 2.4 : 2} />
              </span>
              <span
                className={`notranslate hidden min-w-0 flex-1 text-sm uppercase tracking-[0.12em] lg:block ${isActive ? 'font-black' : 'font-semibold'}`}
                translate="no"
              >
                {item.label}
              </span>
              <ChevronRight
                className={`hidden h-4 w-4 shrink-0 transition-all duration-300 lg:block ${
                  isActive ? 'text-white/70' : '-translate-x-1 text-white/0 group-hover:translate-x-0 group-hover:text-white/40'
                }`}
              />
            </button>
          );
        })}
      </nav>

      <div className="relative mx-3 h-px shrink-0 bg-gradient-to-r from-transparent via-white/15 to-transparent lg:mx-8" />

      <div className="relative shrink-0 space-y-2 p-2 lg:p-5">
        {/* A central de notificações do painel fica recolhida e abre por este sino */}
        <button
          type="button"
          onClick={onToggleNotifications}
          title="Notificações"
          aria-label="Notificações"
          aria-expanded={notificationsOpen}
          className={`group flex w-full items-center justify-center gap-4 rounded-2xl border p-1.5 text-left transition-all duration-300 lg:justify-start lg:px-3 lg:py-3 ${
            notificationsOpen
              ? 'border-white/15 bg-gradient-to-r from-white/[0.14] to-white/[0.03] text-white shadow-[0_10px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]'
              : 'border-transparent text-on-surface-variant hover:border-white/5 hover:bg-white/[0.04] hover:text-white'
          }`}
        >
          <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 lg:h-11 lg:w-11 ${notificationsOpen ? 'bg-primary text-background shadow-[0_6px_20px_rgba(255,255,255,0.18)]' : 'bg-white/5 ring-1 ring-inset ring-white/5 group-hover:bg-white/10'}`}>
            <Bell className="h-[18px] w-[18px] lg:h-5 lg:w-5" strokeWidth={notificationsOpen ? 2.4 : 2} />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#0d0e10] bg-primary px-1 text-[9px] font-black leading-none text-background lg:h-5 lg:min-w-5 lg:text-[10px]">{unreadNotifications}</span>
            )}
          </span>
          <span className={`hidden min-w-0 flex-1 text-sm uppercase tracking-[0.12em] lg:block ${notificationsOpen ? 'font-black' : 'font-semibold'}`}>Notificações</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          title="Sair"
          aria-label="Sair"
          className="group flex w-full items-center justify-center gap-4 rounded-2xl border border-transparent p-1.5 text-red-400 transition-all duration-300 hover:border-red-500/20 hover:bg-red-500/10 lg:justify-start lg:px-3 lg:py-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 lg:h-11 lg:w-11">
            <LogOut className="h-[18px] w-[18px] lg:h-5 lg:w-5" />
          </span>
          <span className="hidden text-sm font-semibold uppercase tracking-[0.12em] lg:block">Sair</span>
        </button>
      </div>
    </aside>
  );
};
