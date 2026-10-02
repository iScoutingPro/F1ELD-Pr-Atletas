import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Eye, CheckCircle2, EyeOff, ShieldCheck } from 'lucide-react';

const getPasswordScore = (value: string) => {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
};

const getPasswordLabel = (value: string) => {
  const score = getPasswordScore(value);
  if (!value) return 'Nenhuma';
  if (score <= 1) return 'Fraca';
  if (score === 2) return 'Média';
  if (score === 3) return 'Boa';
  return 'Forte';
};

export const SecurityView = ({ onComplete }: { onComplete: (newPassword: string) => Promise<void> | void }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(() => getPasswordScore(password), [password]);
  const passwordLabel = useMemo(() => getPasswordLabel(password), [password]);

  const handleSubmit = async () => {
    setError('');

    if (!password.trim()) {
      setError('Informe a nova senha.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);

    try {
      await onComplete(password);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 kinetic-monolith">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="rounded-[32px] border border-white/10 bg-surface-low/80 p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative w-20 h-20 rounded-3xl border border-white/10 bg-surface-high flex items-center justify-center shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-background" />
                </div>
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary mb-3">Segurança</p>
            <h1 className="text-white font-black text-4xl md:text-5xl tracking-tighter uppercase italic leading-none">Alterar senha</h1>
            <p className="mt-3 text-sm text-on-surface-variant italic">Crie uma senha forte para proteger sua conta.</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant">Nova senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="w-full bg-surface-high text-white px-5 py-4 pr-12 rounded-2xl text-sm border border-white/5 focus:border-primary/60 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita sua nova senha"
                  className="w-full bg-surface-high text-white px-5 py-4 pr-12 rounded-2xl text-sm border border-white/5 focus:border-primary/60 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                  <span>Força da senha</span>
                  <span className={passwordStrength >= 3 ? 'text-primary' : 'text-warning'}>{passwordLabel}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      passwordStrength <= 1 ? 'bg-red-500' : passwordStrength === 2 ? 'bg-yellow-500' : passwordStrength === 3 ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {error && <p className="text-error text-[10px] font-black uppercase tracking-[0.2em] text-center">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 bg-primary text-background font-black text-sm rounded-2xl uppercase tracking-[0.25em] shadow-[0_20px_35px_rgba(56,189,248,0.25)] disabled:opacity-60 transition-all hover:brightness-110"
            >
              {loading ? 'Salvando...' : 'Salvar senha'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const SuccessView = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-6 kinetic-monolith">
    <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md text-center">
      <div className="rounded-[32px] border border-white/10 bg-surface-low/80 px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="absolute inset-0 bg-primary opacity-20 blur-3xl rounded-full" />
          <div className="relative w-full h-full rounded-full border border-white/10 flex items-center justify-center bg-surface-high shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-background" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary">Sucesso</p>
          <h1 className="text-white font-black text-4xl tracking-tighter uppercase italic leading-none">Senha atualizada</h1>
          <p className="text-on-surface-variant text-sm italic">Sua senha foi redefinida com sucesso.</p>
        </div>
        <button onClick={onBack} className="mt-8 w-full py-4 bg-primary text-background font-black text-sm rounded-2xl uppercase tracking-[0.25em] shadow-[0_20px_35px_rgba(56,189,248,0.25)]">Voltar ao login</button>
      </div>
    </motion.div>
  </div>
);
