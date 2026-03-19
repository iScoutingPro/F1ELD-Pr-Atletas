import React, { useState } from 'react';
import { Users, Lock } from 'lucide-react';
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
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (authError) {
      setErrorMsg(authError.message === 'Email not confirmed' 
        ? 'E-mail não confirmado. Verifique sua caixa de entrada.' 
        : authError.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setErrorMsg('');
    const { error: authError } = await supabase.auth.signUp({
      email: username,
      password: password,
    });

    if (authError) {
      setErrorMsg(authError.message);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      alert('Cadastro realizado! Verifique seu e-mail para confirmar (verifique também a pasta de SPAM).');
      setIsRegistering(false);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 kinetic-monolith">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] flex flex-col items-center"
      >
        <div className="mb-12">
          <Logo className="w-48" />
        </div>

        <div className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black tracking-widest text-on-surface-variant uppercase ml-1">Username</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-high border-none text-white h-14 pl-12 pr-4 rounded-xl focus:ring-2 focus:ring-primary transition-all placeholder:text-white/10" 
                placeholder="atleta@pro.com" 
                type="text"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black tracking-widest text-on-surface-variant uppercase ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-high border-none text-white h-14 pl-12 pr-4 rounded-xl focus:ring-2 focus:ring-primary transition-all placeholder:text-white/10" 
                placeholder="••••••••" 
                type="password"
              />
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
            onClick={isRegistering ? handleSignUp : handleLogin}
            disabled={loading}
            className="w-full bg-primary text-background h-14 rounded-xl font-black text-sm tracking-[0.2em] uppercase hover:opacity-90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50"
          >
            {loading ? 'CARREGANDO...' : (isRegistering ? 'CADASTRAR' : 'ENTRAR')}
          </button>

          <button 
            disabled={loading}
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full text-on-surface-variant font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
          >
            {isRegistering ? 'Já tenho uma conta' : 'Criar nova conta'}
          </button>

          <div className="flex flex-col items-center space-y-8">
            <button 
              onClick={onForgot}
              className="text-[10px] font-black tracking-widest text-on-surface-variant uppercase hover:text-white transition-colors border-b border-transparent hover:border-white pb-1"
            >
              Esqueceu a senha?
            </button>

            <div className="w-full pt-8 border-t border-white/5 flex justify-center space-x-8">
              {['DATA ANALYTICS', 'PRO SCOUT', 'KINETIC ENGINE'].map((label) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-[7px] text-on-surface-variant tracking-tighter mb-1 font-bold">{label}</span>
                  <div className="w-1 h-1 rounded-full bg-primary/20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
