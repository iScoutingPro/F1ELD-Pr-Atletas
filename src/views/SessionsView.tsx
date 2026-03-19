import React, { useState, useMemo } from 'react';
import { FileText, Video, ChevronDown, ChevronUp, Lock, Search, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Athlete } from '../types';

interface Session {
  id: string;
  date: string;
  status: 'COMPLETED' | 'REVIEW' | 'LOCKED';
  title: string;
  description: string;
}

interface MonthGroup {
  number: string;
  name: string;
  sessions: Session[];
  isOpen: boolean;
  isLocked?: boolean;
}

interface SessionsViewProps {
  athletes: Athlete[];
}

export const SessionsView = ({ athletes }: SessionsViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredAthletes = useMemo(() => {
    if (!searchTerm) return [];
    return athletes.filter(a => 
      `${a.name} ${a.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [searchTerm, athletes]);

  const [groups, setGroups] = useState<MonthGroup[]>([
    {
      number: '01',
      name: 'JANEIRO',
      isOpen: true,
      sessions: [
        {
          id: '1',
          date: 'JAN 14, 2026',
          status: 'COMPLETED',
          title: 'Sessão 1 - Análise Tática',
          description: 'Deep dive into offensive transition patterns and defensive spacing optimization based on last week\'s performance data.'
        },
        {
          id: '2',
          date: 'JAN 28, 2026',
          status: 'REVIEW',
          title: 'Sessão 2 - Reunião Técnica',
          description: 'Strategic alignment session regarding next month\'s competition cycle and physical load management.'
        }
      ]
    },
    {
      number: '02',
      name: 'FEVEREIRO',
      isOpen: false,
      sessions: []
    },
    {
      number: '03',
      name: 'MARÇO',
      isOpen: false,
      isLocked: true,
      sessions: []
    }
  ]);

  const toggleGroup = (index: number) => {
    if (groups[index].isLocked) return;
    const newGroups = [...groups];
    newGroups[index].isOpen = !newGroups[index].isOpen;
    setGroups(newGroups);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-32 font-sans overflow-x-hidden">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">CONSULTANCY JOURNEY</span>
          <div className="flex items-end justify-between">
            <h1 className="text-7xl font-black italic tracking-tighter leading-none mt-2">2026</h1>
            <div className="bg-[#1A1A1A] px-4 py-2 rounded-xl flex items-center gap-2 mb-1">
              <span className="text-xl font-black italic tracking-tighter">85%</span>
              <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase mt-0.5">COMPLETE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Athlete Search */}
      <div className="mb-8 relative z-50">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          <input 
            type="text"
            placeholder="PESQUISAR ATLETA..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full bg-[#141414] border border-white/5 rounded-2xl h-14 pl-12 pr-4 text-sm font-bold tracking-widest focus:ring-2 focus:ring-white/10 transition-all outline-none"
          />
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showDropdown && filteredAthletes.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl"
            >
              {filteredAthletes.map(athlete => (
                <button
                  key={athlete.id}
                  onClick={() => {
                    setSelectedAthlete(athlete);
                    setSearchTerm(`${athlete.name} ${athlete.lastName}`);
                    setShowDropdown(false);
                  }}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none text-left"
                >
                  <img src={athlete.image} alt={athlete.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                  <div>
                    <div className="text-sm font-bold">{athlete.name} {athlete.lastName}</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{athlete.category} • {athlete.club}</div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Athlete Card */}
      <AnimatePresence>
        {selectedAthlete && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-3xl border border-white/10 relative overflow-hidden group shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-[80px] rounded-full -mr-24 -mt-24" />
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="relative">
                <img src={selectedAthlete.image} alt={selectedAthlete.name} className="w-24 h-24 rounded-2xl object-cover border-2 border-white/20 shadow-xl" />
                <div className="absolute -bottom-2 -right-2 bg-primary text-background p-1.5 rounded-lg shadow-lg">
                  <User className="w-4 h-4" />
                </div>
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase">{selectedAthlete.name} {selectedAthlete.lastName}</h2>
                  <span className="bg-white/10 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">{selectedAthlete.category}</span>
                </div>
                
                <div className="flex flex-wrap gap-4 text-[10px] font-black tracking-widest text-white/40 uppercase">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {selectedAthlete.position}
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <img src={selectedAthlete.clubLogo} className="w-4 h-4 object-contain opacity-60" alt="" />
                    {selectedAthlete.club}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline Groups */}
      <div className="space-y-4">
        {groups.map((group, idx) => (
          <div key={group.name} className="space-y-4">
            {/* Month Header */}
            <button 
              onClick={() => toggleGroup(idx)}
              className={`w-full bg-[#141414] rounded-2xl p-6 flex items-center justify-between border border-white/5 transition-all
                ${group.isLocked ? 'opacity-50 grayscale' : 'hover:border-white/10 active:scale-[0.99]'}
              `}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl font-black italic tracking-tighter text-white/20">{group.number}</span>
                <span className="text-xl font-black tracking-widest uppercase">{group.name}</span>
              </div>
              {group.isLocked ? (
                <Lock className="w-5 h-5 text-white/20" />
              ) : (
                group.isOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />
              )}
            </button>

            {/* Monthly Sessions Timeline */}
            <AnimatePresence>
              {group.isOpen && !group.isLocked && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative ml-8 pl-10 space-y-8 py-4">
                    {/* Vertical Line */}
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white/5" />

                    {group.sessions.map((session) => (
                      <div key={session.id} className="relative">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[40px] top-12 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-4 border-[#0A0A0A]" />
                        
                        {/* Session Card */}
                        <div className="bg-[#141414] rounded-2xl p-6 space-y-4 border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/40 tracking-widest">{session.date}</span>
                            <span className={`text-[10px] font-black px-3 py-1 rounded-md tracking-widest
                              ${session.status === 'COMPLETED' ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}
                            `}>
                              {session.status}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="text-xl font-black italic tracking-tight">{session.title}</h3>
                            <p className="text-sm text-white/60 leading-relaxed font-medium line-clamp-3">
                              {session.description}
                            </p>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button className="flex-1 bg-[#222222] hover:bg-[#2A2A2A] text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                              <FileText className="w-4 h-4" />
                              <span className="text-[10px] font-black tracking-widest uppercase">PDF</span>
                            </button>
                            <button className="flex-1 bg-[#222222] hover:bg-[#2A2A2A] text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                              <Video className="w-4 h-4" />
                              <span className="text-[10px] font-black tracking-widest uppercase">VIDEO</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};
