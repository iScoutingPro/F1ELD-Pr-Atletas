import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, CheckCircle2 } from 'lucide-react';

export const RecoveryView = ({ onSend, onBack }: { onSend: (email: string) => Promise<void> | void; onBack: () => void }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setError('');

    if (!email.trim()) {
      setError('Informe o e-mail cadastrado.');
      return;
    }

    setLoading(true);

    try {
      await onSend(email);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar as instruções.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 kinetic-monolith">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-12">
        <div className="space-y-4">
          <h2 className="text-primary font-black text-5xl tracking-tighter leading-tight uppercase italic">RECUPERAR<br/>ACESSO</h2>
          <p className="text-on-surface-variant text-sm italic">Insira o e-mail associado à sua conta.</p>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-on-surface-variant ml-1">E-MAIL CADASTRADO</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 bg-surface-high rounded-xl px-6 text-white outline-none focus:ring-2 focus:ring-primary"
              placeholder="atleta@pro.com"
              type="email"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
            />
          </div>
          {error && <p className="text-error text-[10px] font-black uppercase tracking-widest text-center">{error}</p>}
          <button onClick={handleSend} disabled={loading} className="w-full h-14 bg-primary text-background font-black uppercase tracking-widest rounded-xl disabled:opacity-60">
            {loading ? 'ENVIANDO...' : 'ENVIAR INSTRUÇÕES'}
          </button>
          <button onClick={onBack} className="w-full text-on-surface-variant font-black text-[10px] uppercase tracking-widest hover:text-white">VOLTAR AO LOGIN</button>
        </div>
      </motion.div>
    </div>
  );
};

export const VerificationView = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-6 kinetic-monolith">
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center space-y-12">
      <div className="relative mx-auto w-24 h-24">
        <div className="absolute inset-0 bg-primary opacity-10 blur-3xl rounded-full" />
        <div className="relative w-full h-full bg-surface-high rounded-3xl flex items-center justify-center shadow-2xl">
          <Mail className="w-10 h-10 text-primary" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-background" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h1 className="text-white font-black text-4xl tracking-tighter uppercase italic">VERIFIQUE SEU E-MAIL</h1>
        <p className="text-on-surface-variant text-sm mx-auto italic">Enviamos um link de recuperação para o endereço informado. Verifique também a caixa de spam.</p>
      </div>
      <button onClick={onBack} className="w-full h-14 bg-primary text-background font-black text-sm tracking-widest uppercase rounded-xl">VOLTAR AO LOGIN</button>
    </motion.div>
  </div>
);
