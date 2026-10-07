import React, { useState } from 'react';
import { SheetSelect, SheetOption } from './SheetSelect';

const inputClass = 'w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-surface-high px-4 py-3.5 text-sm font-bold text-on-surface outline-none transition placeholder:font-medium placeholder:text-on-surface-variant/40 focus:border-white/60 focus:ring-2 focus:ring-white/15';

// Clube escolhido entre os já cadastrados, ou digitado em "Outro". Usado nos formulários de atleta e de jogo
export const ClubPicker = ({ value, options, onChange, label }: { value: string; options: SheetOption[]; onChange: (value: string) => void; label: string }) => {
  const [typing, setTyping] = useState(false);
  return typing ? (
    <input
      type="text"
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => setTyping(false)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      className={inputClass}
      placeholder="Nome do clube"
    />
  ) : (
    <SheetSelect
      value={value}
      options={options}
      onChange={onChange}
      onOther={() => { onChange(''); setTyping(true); }}
      otherLabel="Outro"
      label={label}
      placeholder="Selecione o clube"
      className="h-[50px] w-full rounded-xl border bg-surface-high px-4 text-sm font-bold transition"
    />
  );
};
