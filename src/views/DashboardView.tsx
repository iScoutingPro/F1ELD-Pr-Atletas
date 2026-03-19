import React from 'react';
import { motion } from 'motion/react';
import { Users, TrendingUp, Search, ShieldCheck, FileText } from 'lucide-react';
import { Athlete } from '../types';
import { Logo } from '../components/Logo';

interface DashboardViewProps {
  athletes: Athlete[];
  onAthletesClick?: () => void;
  activities?: any[];
}

const getTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Agora';
  if (diffInMinutes < 60) return `Há ${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Há ${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `Há ${diffInDays}d`;
};

export const DashboardView = ({ athletes, onAthletesClick, activities = [] }: DashboardViewProps) => {
  const totalAthletes = athletes.length;
  const inClubCount = athletes.filter(a => a.status === 'In Club').length;
  const inClubPercentage = totalAthletes > 0 ? Math.round((inClubCount / totalAthletes) * 100) : 0;
  
  const captadosCount = athletes.filter(a => a.source === 'Captado' || !a.source).length;
  const indicadosCount = athletes.filter(a => a.source === 'Indicado').length;
  const freeCount = totalAthletes - inClubCount;

  return (
    <div className="pt-24 pb-32 px-6 max-w-5xl mx-auto space-y-12">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Atletas Agenciados', val: totalAthletes.toString(), icon: Users, clickable: true, useLogo: true },
          { label: 'Taxa de Clube', val: `${inClubPercentage}%`, icon: TrendingUp },
          { label: 'Atletas Captados', val: captadosCount.toString(), icon: Search },
          { label: 'Atletas Indicados', val: indicadosCount.toString(), icon: Users }
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={stat.clickable ? onAthletesClick : undefined}
            className={`bg-surface-low p-6 rounded-2xl border border-white/5 relative overflow-hidden group transition-all ${stat.clickable ? 'cursor-pointer hover:bg-surface-high hover:border-primary/30' : ''}`}
          >
            <div className="absolute -right-4 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
              {stat.useLogo ? (
                <Logo variant="minimal" className="w-24 h-12" />
              ) : (
                stat.icon && <stat.icon className="w-16 h-16" />
              )}
            </div>
            <div className="relative z-10">
              <div className="text-3xl font-black tracking-tighter text-white italic leading-none mb-1">{stat.val}</div>
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant">{stat.label}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-8">
        <div className="border-l-4 border-primary pl-4">
          <h2 className="text-4xl font-black tracking-tighter text-white leading-none italic uppercase">F1ELD no Mercado</h2>
        </div>

        <div className="bg-surface-low p-10 rounded-[2rem] border border-white/5 space-y-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-white italic uppercase leading-none">Atletas Empregados</h3>
              <p className="text-[12px] font-bold text-on-surface-variant tracking-[0.3em] uppercase">Performance de Agenciamento</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-black text-primary italic leading-none">{inClubPercentage}</span>
              <span className="text-2xl font-black text-primary/40 italic">%</span>
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="h-4 w-full bg-surface-highest rounded-full overflow-hidden p-1">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${inClubPercentage}%` }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-primary rounded-full shadow-[0_0_30px_rgba(0,255,0,0.4)] relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </motion.div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{inClubCount} Atletas</span>
                  <span className="text-[8px] font-bold text-on-surface-variant uppercase">Empregados</span>
                </div>
                <div className="flex flex-col border-l border-white/10 pl-8">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest text-opacity-50">{freeCount} Atletas</span>
                  <span className="text-[8px] font-bold text-on-surface-variant uppercase">Disponíveis</span>
                </div>
                <div className="flex flex-col border-l border-white/10 pl-8">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest italic">85%</span>
                  <span className="text-[8px] font-bold text-on-surface-variant uppercase">Meta Empregados</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-2">
          <div className="w-2 h-2 bg-primary" /> Atividades Recentes
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {activities.length > 0 ? (
            activities.map((item, i) => {
              const Icon = item.type === 'DVD' ? FileText : (item.type === 'SCOUT' ? FileText : ShieldCheck);
              return (
                <div key={item.id || i} className="bg-surface-low p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-surface-high transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-highest flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${item.type === 'CONTRATO' ? 'text-primary' : 'text-on-surface-variant'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-primary tracking-widest uppercase">{item.type}</span>
                        <span className="text-[8px] text-white/20">•</span>
                        <span className="text-[8px] font-bold text-on-surface-variant uppercase">{getTimeAgo(item.created_at)}</span>
                      </div>
                      <h4 className="text-sm font-black text-white uppercase italic">{item.title}</h4>
                      {item.subtitle && <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">{item.subtitle}</p>}
                    </div>
                  </div>
                  {item.club_logo && (
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 mb-1">
                        <img src={item.club_logo} alt={item.club} className="w-4 h-4 object-contain transition-all" referrerPolicy="no-referrer" />
                        <div className="text-[10px] font-black text-white italic">{item.club}</div>
                      </div>
                      <div className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">Destino</div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-surface-low p-12 rounded-2xl border border-white/5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant italic">
                Nenhuma atividade recente registrada
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
