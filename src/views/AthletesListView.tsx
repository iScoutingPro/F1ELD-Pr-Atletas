import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, Disc } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Athlete } from '../types';

const CATEGORIES = ['Profissional', 'Sub-20', 'Sub-17', 'Sub-15', 'Sub-14', 'Sub-13', 'Sub-12', 'Sub-11', 'Sub-10'];
const POSITIONS = ['Goleiro', 'Lateral Esquerdo', 'Lateral Direito', 'Zagueiro', 'Volante', 'Meia', 'Extremo', 'Centroavante'];

interface AthletesListViewProps {
  athletes: Athlete[];
  onSelectAthlete: (athlete: Athlete) => void;
  onAddAthlete?: () => void;
  title?: string;
  subtitle?: string;
}

export const AthletesListView = ({ athletes, onSelectAthlete, onAddAthlete, title = 'Atletas Agenciados', subtitle = 'com atletas captados' }: AthletesListViewProps) => {
  const [nameSearch, setNameSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [positionSearch, setPositionSearch] = useState('');
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [showPositionSuggestions, setShowPositionSuggestions] = useState(false);

  const filteredAthletes = athletes.filter(athlete => {
    const fullName = `${athlete.name} ${athlete.lastName}`.toLowerCase();
    const matchesName = fullName.includes(nameSearch.toLowerCase());
    const matchesCategory = athlete.category.toLowerCase().includes(categorySearch.toLowerCase());
    const matchesPosition = athlete.position.toLowerCase().includes(positionSearch.toLowerCase());
    return matchesName && matchesCategory && matchesPosition;
  });

  const nameSuggestions = athletes.filter(a => 
    `${a.name} ${a.lastName}`.toLowerCase().includes(nameSearch.toLowerCase()) &&
    nameSearch.length > 0 &&
    `${a.name} ${a.lastName}`.toLowerCase() !== nameSearch.toLowerCase()
  ).slice(0, 5);

  const categorySuggestions = CATEGORIES.filter(c => 
    c.toLowerCase().includes(categorySearch.toLowerCase()) && 
    categorySearch.length > 0 &&
    c.toLowerCase() !== categorySearch.toLowerCase()
  );

  const positionSuggestions = POSITIONS.filter(p => 
    p.toLowerCase().includes(positionSearch.toLowerCase()) && 
    positionSearch.length > 0 &&
    p.toLowerCase() !== positionSearch.toLowerCase()
  );

  return (
    <div className="pt-24 pb-32 px-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-end justify-between">
        <div className="border-l-4 border-primary pl-4">
          <h2 className="text-4xl font-black tracking-tighter text-white leading-none italic uppercase">{title}</h2>
          <span className="font-bold uppercase tracking-widest text-[10px] text-on-surface-variant">{subtitle}</span>
        </div>
        {onAddAthlete && (
          <button onClick={onAddAthlete} className="p-4 bg-primary text-background rounded-2xl hover:scale-105 transition-all shadow-xl">
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Pesquisar por Nome do Atleta..."
            value={nameSearch}
            onChange={(e) => { setNameSearch(e.target.value); setShowNameSuggestions(true); }}
            onFocus={() => setShowNameSuggestions(true)}
            onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
            className="w-full bg-surface-low border border-white/5 text-white pl-12 pr-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none"
          />
          <AnimatePresence>
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 w-full mt-2 bg-surface-high border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl"
              >
                {nameSuggestions.map((athlete) => (
                  <button key={athlete.id} onClick={() => setNameSearch(`${athlete.name} ${athlete.lastName}`)} className="w-full px-6 py-3 flex items-center gap-3 text-left hover:bg-primary group/item border-b border-white/5 last:border-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                      <img src={athlete.image} alt={athlete.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-white group-hover/item:text-background">{athlete.name} {athlete.lastName}</div>
                      <div className="text-[8px] font-bold text-on-surface-variant uppercase group-hover/item:text-background/60">{athlete.position} • {athlete.category}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Filtrar por Categoria..."
              value={categorySearch}
              onChange={(e) => { setCategorySearch(e.target.value); setShowCategorySuggestions(true); }}
              onFocus={() => setShowCategorySuggestions(true)}
              onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
              className="w-full bg-surface-low border border-white/5 text-white pl-12 pr-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none"
            />
            <AnimatePresence>
              {showCategorySuggestions && categorySuggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 w-full mt-2 bg-surface-high border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl">
                  {categorySuggestions.map((suggestion) => (
                    <button key={suggestion} onClick={() => setCategorySearch(suggestion)} className="w-full px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary hover:text-background border-b border-white/5 last:border-0">{suggestion}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Filtrar por Posição..."
              value={positionSearch}
              onChange={(e) => { setPositionSearch(e.target.value); setShowPositionSuggestions(true); }}
              onFocus={() => setShowPositionSuggestions(true)}
              onBlur={() => setTimeout(() => setShowPositionSuggestions(false), 200)}
              className="w-full bg-surface-low border border-white/5 text-white pl-12 pr-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none"
            />
            <AnimatePresence>
              {showPositionSuggestions && positionSuggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 w-full mt-2 bg-surface-high border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl">
                  {positionSuggestions.map((suggestion) => (
                    <button key={suggestion} onClick={() => setPositionSearch(suggestion)} className="w-full px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary hover:text-background border-b border-white/5 last:border-0">{suggestion}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAthletes.map((athlete) => (
          <div key={athlete.id} onClick={() => onSelectAthlete(athlete)} className="bg-surface-low p-4 rounded-3xl border border-white/5 flex items-center gap-6 group hover:bg-surface-high transition-all cursor-pointer">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10">
              <img src={athlete.image} alt={athlete.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-black text-primary uppercase">{athlete.category}</span>
                    <span className="text-[8px] text-white/20">•</span>
                    <span className="text-[8px] font-bold text-on-surface-variant uppercase">{athlete.position}</span>
                  </div>
                  <h4 className="text-xl font-black text-white uppercase italic leading-none">{athlete.name}<br/><span className="opacity-40">{athlete.lastName}</span></h4>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${athlete.hasDvd ? 'bg-primary/10 border border-primary/20' : 'bg-error/5 border border-error/10 opacity-40'}`}>
                    {athlete.hasDvd ? (
                      <Disc className="w-6 h-6 text-primary animate-pulse-slow" />
                    ) : (
                      <div className="relative">
                        <Disc className="w-6 h-6 text-error/60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-7 h-0.5 bg-error/40 rotate-45 rounded-full" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-[8px] font-black text-on-surface-variant uppercase tracking-[0.2em] mt-2 italic">DVD</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {athlete.clubLogo ? (
                    <img src={athlete.clubLogo} alt={athlete.club} className="w-4 h-4 object-contain" />
                  ) : (
                    <div className={`w-1.5 h-1.5 rounded-full ${athlete.status === 'In Club' ? 'bg-primary' : 'bg-error'}`} />
                  )}
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{athlete.club && athlete.club !== 'None' && athlete.club !== 'Livre no Mercado' ? athlete.club : 'Sem Clube'}</span>
                </div>
                <MoreVertical className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
