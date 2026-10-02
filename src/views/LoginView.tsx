import React, { useState } from 'react';
import { Users, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';

interface LoginViewProps {
  onLogin: () => void;
  onForgot: () => void;
}

export const LoginView = ({ onLogin, onForgot }: LoginViewProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!supabase) {
      setErrorMsg('Supabase não configurado. Verifique as variáveis de ambiente.');
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (authError) {
      setErrorMsg(authError.message === 'Email not confirmed' 
        ? 'E-mail não confirmado. Verifique sua caixa de entrada.' 
        : authError.message);
      setTimeout(() => setErrorMsg(''), 5000);
      setLoading(false);
      return;
    }

    if (data.session) {
      window.localStorage.setItem('fieldpro_authenticated_v1', 'true');
      onLogin();
    }

    setLoading(false);
  };

  // Nota: cadastro via UI removido — retenho apenas login

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 kinetic-monolith">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[620px] flex flex-col items-center"
      >
        <div className="mb-14">
          <Logo className="w-72" />
        </div>

        <div className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-black tracking-widest text-on-surface-variant uppercase ml-1">Username</label>
            <div className="relative">
              <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-on-surface-variant" />
              <input 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-high border-none text-white h-16 pl-16 pr-6 rounded-xl focus:ring-2 focus:ring-primary transition-all placeholder:text-white/20 text-lg" 
                placeholder="atleta@pro.com" 
                type="text"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black tracking-widest text-on-surface-variant uppercase ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-on-surface-variant" />
              <input 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-high border-none text-white h-16 pl-16 pr-16 rounded-xl focus:ring-2 focus:ring-primary transition-all placeholder:text-white/20 text-lg" 
                placeholder="••••••••" 
                type={showPassword ? 'text' : 'password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {errorMsg && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-error text-[10px] font-black uppercase tracking-widest text-center px-4"
              >
                {errorMsg}
              </motion.p>
            )}
          </AnimatePresence>

          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-primary text-background h-16 rounded-xl font-black text-base tracking-[0.2em] uppercase hover:opacity-90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50"
          >
            {loading ? 'CARREGANDO...' : 'ENTRAR'}
          </button>

          <div className="flex flex-col items-center space-y-8">
            <button 
              onClick={onForgot}
              className="text-sm font-black tracking-widest text-on-surface-variant uppercase hover:text-white transition-colors border-b border-transparent hover:border-white pb-1"
            >
              trocar a senha de login
            </button>

            <div className="w-full pt-8 border-t border-white/5">
              <div className="w-full flex justify-center items-center gap-1">
                <span className="text-[16px] text-on-surface-variant font-black tracking-widest">F1eld</span>
                <span className="text-[16px] text-on-surface-variant font-black tracking-widest">Pró</span>
                <span className="text-[16px] text-on-surface-variant font-black tracking-widest">Atletas - Attiva Sports</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
