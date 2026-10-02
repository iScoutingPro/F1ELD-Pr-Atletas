import React from 'react';
import { ChevronLeft, LogOut } from 'lucide-react';
import { Logo } from './Logo';

interface TopAppBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  onLogoClick?: () => void;
  onLogout?: () => void;
}

export const TopAppBar = ({ title, showBack, onBack, onLogoClick, onLogout }: TopAppBarProps) => {
  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {showBack && onBack && (
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-surface-high rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>
        )}
        <button 
          onClick={onLogoClick}
          disabled={!onLogoClick}
          className={`flex items-center gap-3 transition-opacity ${onLogoClick ? 'hover:opacity-80 active:opacity-60 cursor-pointer' : 'cursor-default'}`}
        >
          <Logo variant="icon" className="w-8 h-8" />
          <div className="flex flex-col items-start">
            <span className="text-lg font-black italic tracking-tighter leading-none text-white">F1ELD</span>
            <span className="text-[8px] font-bold tracking-[0.2em] text-white/40 uppercase leading-none">Pró Atletas</span>
          </div>
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <button
          aria-label="Sair"
          onClick={onLogout ?? (() => window.location.reload())}
          className="p-2 rounded-full bg-red-500/10 border border-red-500/30 transition-colors hover:bg-red-500/20"
        >
          <LogOut className="w-5 h-5 text-red-400" />
        </button>
      </div>
    </header>
  );
};
