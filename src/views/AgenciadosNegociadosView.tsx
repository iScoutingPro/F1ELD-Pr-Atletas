import React, { useState } from 'react';
import { Search, Users, TrendingUp, Shield, Disc } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Athlete } from '../types';

interface AgenciadosNegociadosViewProps {
  athletes: Athlete[];
  onSelectAthlete?: (athlete: Athlete) => void;
}

export const AgenciadosNegociadosView = ({ athletes, onSelectAthlete }: AgenciadosNegociadosViewProps) => {
  const [search, setSearch] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const combined = athletes.filter((athlete) => athlete.source === 'Captado' || athlete.status === 'In Club');

  const suggestions = combined.filter((athlete) =>
    `${athlete.name} ${athlete.lastName}`.toLowerCase().includes(search.toLowerCase()) &&
    search.length > 0
  );

  const selectAthlete = (athlete: Athlete) => {
    setSearch(`${athlete.name} ${athlete.lastName}`);
    setSelectedAthlete(athlete);
    setShowSuggestions(false);
    if (onSelectAthlete) {
      onSelectAthlete(athlete);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) {
      setSelectedAthlete(null);
      return;
    }

    const found = combined.find(
      (athlete) => `${athlete.name} ${athlete.lastName}`.toLowerCase() === search.toLowerCase()
    );

    if (found) {
      setSelectedAthlete(found);
      setShowSuggestions(false);
    }
  };

  const totalAthletes = combined.length || 1;
  const avgTactical = Math.round(
    combined.reduce((acc, athlete) => acc + athlete.stats.tactical, 0) / totalAthletes
  );
  const avgPhysical = Math.round(
    combined.reduce((acc, athlete) => acc + athlete.stats.physical, 0) / totalAthletes
  );
  const avgTechnical = Math.round(
    combined.reduce((acc, athlete) => acc + athlete.stats.technical, 0) / totalAthletes
  );

  const displayData = selectedAthlete ? {
    name: selectedAthlete.name,
    lastName: selectedAthlete.lastName,
    category: selectedAthlete.category,
    position: selectedAthlete.position,
    stats: selectedAthlete.stats,
    isAggregate: false,
  } : {
    name: 'ATLETAS',
    lastName: 'AGENCIADOS + NEGOCIADOS',
    category: 'PORTFÓLIO COMBINADO',
    position: 'MÉDIA GLOBAL',
    stats: { tactical: avgTactical, physical: avgPhysical, technical: avgTechnical },
    isAggregate: true,
  };

  return (
    <div className="pt-10 pb-12 px-6 max-w-7xl mx-auto space-y-12">
      <section className="max-w-2xl mx-auto relative">
        <form onSubmit={handleSearch} className="relative group z-[70]">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={search}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSuggestions(true);
              if (!e.target.value) setSelectedAthlete(null);
            }}
            placeholder="Pesquisar atleta..."
            className="w-full bg-surface-low border border-white/5 text-white pl-16 pr-6 py-6 rounded-2xl text-sm focus:ring-2 focus:ring-primary focus:bg-surface-high transition-all outline-none italic uppercase font-black tracking-widest"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSelectedAthlete(null); setShowSuggestions(false); }}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary uppercase tracking-widest"
            >
              Limpar
            </button>
          )}
        </form>

        <AnimatePresence>
          {showSuggestions && search.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 w-full mt-2 bg-surface-high border border-white/10 rounded-2xl overflow-hidden z-[70] shadow-2xl"
            >
              {suggestions.length > 0 ? (
                suggestions.map((athlete) => (
                  <button
                    key={athlete.id}
                    onClick={() => selectAthlete(athlete)}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-none"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                      <img src={athlete.image} alt={athlete.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white uppercase italic">{athlete.name} {athlete.lastName}</div>
                      <div className="flex items-center gap-2">
                        {athlete.clubLogo && (
                          <img src={athlete.clubLogo} alt={athlete.club} className="w-3 h-3 object-contain" referrerPolicy="no-referrer" />
                        )}
                        <div className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">{athlete.position} • {athlete.category}</div>
                      </div>
                    </div>
                    <div className="ml-auto">
                      {athlete.hasDvd ? <Disc className="w-4 h-4 text-primary" /> : <Disc className="w-4 h-4 text-white/10" />}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant italic">
                    Nenhum atleta encontrado
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="relative">
        <div className="absolute -left-4 top-0 w-1 h-24 bg-primary opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant mb-2">
          {displayData.isAggregate ? 'Visão consolidada' : 'Análise individual do atleta'}
        </p>
        <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-4 text-white italic uppercase">
          {displayData.name}<br /><span className="opacity-40">{displayData.lastName}</span>
        </h2>
        <div className="flex gap-4 items-center">
          <span className="px-3 py-1 bg-surface-high text-[10px] font-black uppercase tracking-widest text-primary rounded">{displayData.position}</span>
          <span className="px-3 py-1 bg-surface-high text-[10px] font-black uppercase tracking-widest text-on-surface-variant rounded">{displayData.category}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-surface-low p-8 rounded-3xl border border-white/5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-8 flex items-center gap-2">
            <div className="w-2 h-2 bg-primary" /> Métricas combinadas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { label: 'Tática', val: displayData.stats.tactical },
              { label: 'Física', val: displayData.stats.physical },
              { label: 'Técnica', val: displayData.stats.technical },
            ].map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="text-5xl font-black tracking-tighter text-white italic">{item.val}</div>
                <div className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">{item.label}</div>
                <div className="h-1 w-full bg-surface-highest rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} className="h-full bg-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-high p-8 rounded-3xl flex flex-col justify-between border border-white/10">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-6">Visão geral</h3>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <TrendingUp className="w-10 h-10 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-black italic uppercase leading-none text-primary">PORTFÓLIO</div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Agenciamento + negociação</div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/10">
            <p className="text-sm text-on-surface-variant leading-relaxed italic">Acompanhamento integrado de atletas agenciados e em processo de negociação.</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Atletas', val: combined.length.toString(), icon: Users },
          { label: 'Propostas', val: '12', icon: Shield },
          { label: 'Interesse', val: '91%', icon: TrendingUp },
          { label: 'Cobertura', val: '96%', icon: Disc },
        ].map((stat, index) => (
          <div key={index} className="bg-surface-low p-6 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-4">
              <stat.icon className="w-5 h-5 text-on-surface-variant" />
              <span className="text-2xl font-black text-white italic">{stat.val}</span>
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{stat.label}</h4>
          </div>
        ))}
      </section>
    </div>
  );
};
