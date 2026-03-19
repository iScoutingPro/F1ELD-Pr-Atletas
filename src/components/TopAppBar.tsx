import React from 'react';
import { ChevronLeft, Bell } from 'lucide-react';
import { Logo } from './Logo';

interface TopAppBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  onLogoClick?: () => void;
}

export const TopAppBar = ({ title, showBack, onBack, onLogoClick }: TopAppBarProps) => {
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
        <button className="p-2 hover:bg-surface-high rounded-full transition-colors relative">
          <Bell className="w-5 h-5 text-white" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
        </button>
      </div>
    </header>
  );
};
