import React from 'react';
import { motion } from 'motion/react';
import { Search, Users, Disc } from 'lucide-react';
import { Athlete } from '../types';

interface CaptacaoViewProps {
  athletes: Athlete[];
  onSelectAthlete?: (athlete: Athlete) => void;
}

export const CaptacaoView = ({ athletes, onSelectAthlete }: CaptacaoViewProps) => {
  const captados = athletes.filter(a => a.source === 'Captado' || !a.source);
  const indicados = athletes.filter(a => a.source === 'Indicado');

  return (
    <div className="pt-10 pb-12 px-6 max-w-7xl mx-auto space-y-12">
      <div className="border-l-4 border-primary pl-4">
        <h2 className="text-4xl font-black tracking-tighter text-white leading-none italic uppercase">CAPTAÇÃO</h2>
        <span className="font-bold uppercase tracking-widest text-[10px] text-on-surface-variant">gestão de origem dos atletas</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* COLUNA CAPTADOS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white italic uppercase leading-none">CAPTADOS</h3>
              <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Identificados pelo Scout</p>
            </div>
            <div className="ml-auto bg-surface-high px-3 py-1 rounded-full text-[10px] font-black text-white">{captados.length}</div>
          </div>
          
          <div className="grid gap-3">
            {captados.map(athlete => (
              <motion.div 
                key={athlete.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelectAthlete?.(athlete)}
                className="bg-surface-low p-4 rounded-2xl border border-white/5 flex items-center gap-4 group hover:bg-surface-high transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                  <img src={athlete.image} alt={athlete.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[7px] font-black text-primary uppercase">{athlete.category}</span>
                    <span className="text-[7px] text-white/20">•</span>
                    <span className="text-[7px] font-bold text-on-surface-variant uppercase truncate">{athlete.position}</span>
                  </div>
                  <h4 className="text-xs font-black text-white uppercase italic truncate leading-none">
                    {athlete.name} <span className="opacity-40">{athlete.lastName}</span>
                  </h4>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${athlete.hasDvd ? 'bg-primary/10 border border-primary/20' : 'bg-white/5 opacity-20'}`}>
                  <Disc className={`w-4 h-4 ${athlete.hasDvd ? 'text-primary' : 'text-on-surface-variant'}`} />
                </div>
              </motion.div>
            ))}
            {captados.length === 0 && (
              <p className="text-center py-12 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] italic">Nenhum atleta captado</p>
            )}
          </div>
        </section>

        {/* COLUNA INDICADOS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-surface-high flex items-center justify-center border border-white/10">
              <Users className="w-5 h-5 text-on-surface-variant" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white italic uppercase leading-none">INDICADOS</h3>
              <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Recomendações Externas</p>
            </div>
            <div className="ml-auto bg-surface-high px-3 py-1 rounded-full text-[10px] font-black text-white">{indicados.length}</div>
          </div>

          <div className="grid gap-3">
            {indicados.map(athlete => (
              <motion.div 
                key={athlete.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelectAthlete?.(athlete)}
                className="bg-surface-low p-4 rounded-2xl border border-white/5 flex items-center gap-4 group hover:bg-surface-high transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                  <img src={athlete.image} alt={athlete.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[7px] font-black text-primary uppercase">{athlete.category}</span>
                    <span className="text-[7px] text-white/20">•</span>
                    <span className="text-[7px] font-bold text-on-surface-variant uppercase truncate">{athlete.position}</span>
                  </div>
                  <h4 className="text-xs font-black text-white uppercase italic truncate leading-none">
                    {athlete.name} <span className="opacity-40">{athlete.lastName}</span>
                  </h4>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${athlete.hasDvd ? 'bg-primary/10 border border-primary/20' : 'bg-white/5 opacity-20'}`}>
                  <Disc className={`w-4 h-4 ${athlete.hasDvd ? 'text-primary' : 'text-on-surface-variant'}`} />
                </div>
              </motion.div>
            ))}
            {indicados.length === 0 && (
              <p className="text-center py-12 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] italic">Nenhum atleta indicado</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
