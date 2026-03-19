import React from 'react';
import { Users, Bell, Lock, Share2, ChevronDown, LogOut } from 'lucide-react';

interface SettingsViewProps {
  onLogout: () => void;
}

export const SettingsView = ({ onLogout }: SettingsViewProps) => (
  <div className="pt-24 pb-32 px-6 max-w-2xl mx-auto space-y-12">
    <div className="border-l-4 border-primary pl-4">
      <h2 className="text-4xl font-black tracking-tighter text-white leading-none italic uppercase">Configurações</h2>
      <span className="font-bold uppercase tracking-widest text-[10px] text-on-surface-variant">Preferências do Sistema</span>
    </div>

    <div className="space-y-4">
      {[
        { icon: Users, label: 'Perfil da Agência', desc: 'Gerencie informações da F1ELD // ISC_PRO' },
        { icon: Bell, label: 'Notificações', desc: 'Alertas de mercado e novos relatórios' },
        { icon: Lock, label: 'Segurança', desc: 'Alterar senha e autenticação em duas etapas' },
        { icon: Share2, label: 'Integrações', desc: 'Conecte-se com plataformas de scouting' }
      ].map((item, i) => (
        <div key={i} className="bg-surface-low p-6 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-surface-high transition-all cursor-pointer group">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-surface-highest flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <item.icon className="w-6 h-6 text-on-surface-variant group-hover:text-primary" />
            </div>
            <div>
              <h4 className="text-lg font-black text-white italic uppercase leading-none mb-1">{item.label}</h4>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{item.desc}</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-white/20 -rotate-90 group-hover:text-white" />
        </div>
      ))}
    </div>

    <button onClick={onLogout} className="w-full p-6 bg-error/10 border border-error/20 rounded-2xl flex items-center justify-center gap-4 hover:bg-error hover:text-white transition-all group">
      <LogOut className="w-6 h-6 text-error group-hover:text-white" />
      <span className="text-sm font-black uppercase tracking-[0.2em] text-error group-hover:text-white">Encerrar Sessão</span>
    </button>
  </div>
);
