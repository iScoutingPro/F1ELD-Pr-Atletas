import React from 'react';
import { LayoutGrid, Users, Search, BarChart3, Settings, Monitor } from 'lucide-react';
import { View, NavItem } from '../types';

interface BottomNavBarProps {
  activeView: View;
  setView: (v: View) => void;
  athleteCount: number;
}

export const BottomNavBar = ({ activeView, setView, athleteCount }: BottomNavBarProps) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'DASHBOARD', icon: LayoutGrid },
    { id: 'athletes', label: 'ATLETAS', icon: Users },
    { id: 'captacao', label: 'CAPTAÇÃO', icon: Search },
    { id: 'scout', label: 'SCOUT', icon: BarChart3 },
    { id: 'sessions', label: 'SESSÕES', icon: Monitor },
    { id: 'settings', label: 'AJUSTES', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 bg-background/90 backdrop-blur-2xl border-t border-white/5 h-20 flex justify-around items-center px-4 pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
              isActive ? 'text-white scale-110' : 'text-on-surface-variant opacity-60 hover:opacity-100'
            }`}
          >
            <div className={`p-2 rounded-xl transition-colors relative ${isActive ? 'bg-surface-high' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black tracking-widest uppercase notranslate" translate="no">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
