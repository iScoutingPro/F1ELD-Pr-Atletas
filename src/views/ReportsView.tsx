import React from 'react';
import { FileText, ChevronDown } from 'lucide-react';

export const ReportsView = () => (
  <div className="pt-24 pb-32 px-6 max-w-5xl mx-auto space-y-12">
    <div className="border-l-4 border-primary pl-4">
      <h2 className="text-4xl font-black tracking-tighter text-white leading-none italic uppercase">Relatórios</h2>
      <span className="font-bold uppercase tracking-widest text-[10px] text-on-surface-variant">Análise de Dados & Performance</span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { title: 'Mensal - Fevereiro', type: 'Performance', date: '01 Mar 2026' },
        { title: 'Scouting - Ricardo Silva', type: 'Tactical', date: '28 Fev 2026' },
        { title: 'Fisiológico - Gabriel S.', type: 'Medical', date: '25 Fev 2026' }
      ].map((report, i) => (
        <div key={i} className="bg-surface-low p-6 rounded-3xl border border-white/5 hover:bg-surface-high transition-all group cursor-pointer">
          <div className="w-12 h-12 rounded-2xl bg-surface-highest flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
            <FileText className="w-6 h-6 text-on-surface-variant group-hover:text-background" />
          </div>
          <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{report.type}</h4>
          <h3 className="text-xl font-black text-white italic uppercase leading-tight mb-4">{report.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase">{report.date}</span>
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white">
              <ChevronDown className="w-4 h-4 text-white -rotate-90" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
