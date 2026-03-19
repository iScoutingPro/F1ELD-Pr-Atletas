import React from 'react';
import { motion } from 'motion/react';
import { Lock, Eye, CheckCircle2 } from 'lucide-react';

export const SecurityView = ({ onComplete }: { onComplete: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-6 kinetic-monolith">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center space-y-12">
      <div className="relative mx-auto w-24 h-24">
        <div className="absolute inset-0 bg-primary opacity-10 blur-3xl rounded-full" />
        <div className="relative w-full h-full rounded-3xl border border-white/10 flex items-center justify-center bg-surface-high shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <Lock className="w-8 h-8 text-background" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h1 className="text-white font-black text-5xl tracking-tighter uppercase italic leading-none">ALTERAR SENHA</h1>
      </div>
      <div className="space-y-4">
        <div className="relative">
          <input type="password" placeholder="Senha Atual" className="w-full bg-surface-high text-white px-6 py-5 rounded-2xl text-sm" />
          <Eye className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
        </div>
        <div className="relative">
          <input type="password" placeholder="Nova Senha" className="w-full bg-surface-high text-white px-6 py-5 rounded-2xl text-sm" />
          <Eye className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
        </div>
      </div>
      <div className="space-y-4">
        <button onClick={onComplete} className="w-full py-5 bg-primary text-background font-black text-sm rounded-2xl uppercase tracking-widest shadow-2xl">SALVAR</button>
      </div>
    </motion.div>
  </div>
);

export const SuccessView = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-6 kinetic-monolith">
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md text-center space-y-12">
      <div className="relative mx-auto w-24 h-24">
        <div className="absolute inset-0 bg-primary opacity-20 blur-3xl rounded-full" />
        <div className="relative w-full h-full rounded-full border border-white/10 flex items-center justify-center bg-surface-high shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-background" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h1 className="text-white font-black text-5xl tracking-tighter uppercase italic leading-none">SUCESSO</h1>
      </div>
      <button onClick={onBack} className="w-full py-5 bg-primary text-background font-black text-sm rounded-2xl uppercase tracking-widest shadow-2xl">VOLTAR</button>
    </motion.div>
  </div>
);
