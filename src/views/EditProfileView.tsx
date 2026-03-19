import React, { useRef, useState } from 'react';
import { Camera, ShieldCheck } from 'lucide-react';
import { Athlete } from '../types';

const CATEGORIES = ['Profissional', 'Sub-20', 'Sub-17', 'Sub-15', 'Sub-13', 'Sub-11'];

interface EditProfileViewProps {
  athlete?: Athlete;
  onBack: () => void;
  onSave: (data: Partial<Athlete>) => void;
  onDelete?: (id: string) => void;
  athletes?: Athlete[];
}

export const EditProfileView = ({ athlete, onBack, onSave, onDelete, athletes = [] }: EditProfileViewProps) => {
  const [athleteImage, setAthleteImage] = useState(athlete?.image || "https://picsum.photos/seed/athlete_profile/300/300");
  const [clubLogo, setClubLogo] = useState(athlete?.clubLogo || "");
  const athleteFileRef = useRef<HTMLInputElement>(null);
  const clubFileRef = useRef<HTMLInputElement>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef<HTMLSelectElement>(null);
  const secondaryPositionRef = useRef<HTMLSelectElement>(null);
  const clubRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const naturalidadeRef = useRef<HTMLInputElement>(null);
  const nacionalidadeRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const preferredFootRef = useRef<HTMLSelectElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const [hasDvd, setHasDvd] = useState(athlete?.hasDvd ?? false);
  const [dvdLink, setDvdLink] = useState(athlete?.dvdLink || '');
  const [source, setSource] = useState<'Captado' | 'Indicado'>(athlete?.source || 'Captado');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    const fullName = nameRef.current?.value || '';
    const nameParts = fullName.split(' ');
    onSave({
      name: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      position: positionRef.current?.value as any,
      secondaryPosition: secondaryPositionRef.current?.value as any,
      club: clubRef.current?.value,
      category: categoryRef.current?.value,
      image: athleteImage,
      clubLogo: clubLogo,
      naturalidade: naturalidadeRef.current?.value,
      nacionalidade: nacionalidadeRef.current?.value,
      birthDate: birthDateRef.current?.value,
      age: parseInt(ageRef.current?.value || '0'),
      preferredFoot: preferredFootRef.current?.value as any,
      notes: notesRef.current?.value,
      hasDvd,
      dvdLink,
      source,
    });
  };

  return (
    <div className="pt-24 pb-32 px-6 max-w-4xl mx-auto">
      <input type="file" ref={athleteFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setAthleteImage)} />
      <input type="file" ref={clubFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setClubLogo)} />

      <section className="flex flex-col items-center justify-center py-12 mb-12 bg-surface-low rounded-3xl border border-white/5">
        <button type="button" className="relative group" onClick={() => athleteFileRef.current?.click()}>
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-highest shadow-2xl">
            <img src={athleteImage} alt="Atleta" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-8 h-8 text-white" />
          </div>
        </button>
        <p className="mt-4 font-black uppercase tracking-widest text-[10px] text-on-surface-variant">UPLOAD FOTO</p>
      </section>

      <div className="max-w-3xl mx-auto space-y-12">
        <div className="space-y-8">
          <div className="border-l-4 border-primary pl-4">
            <h2 className="text-4xl font-black tracking-tighter text-white leading-none italic uppercase">INFORMAÇÕES GERAIS</h2>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant ml-1">Origem do Atleta</label>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setSource('Captado')} 
                  className={`flex-1 py-4 rounded-xl text-xs font-black transition-all tracking-widest ${source === 'Captado' ? 'bg-primary text-background' : 'bg-surface-high text-white border border-white/5'}`}
                >
                  CAPTADO
                </button>
                <button 
                  type="button" 
                  onClick={() => setSource('Indicado')} 
                  className={`flex-1 py-4 rounded-xl text-xs font-black transition-all tracking-widest ${source === 'Indicado' ? 'bg-primary text-background' : 'bg-surface-high text-white border border-white/5'}`}
                >
                  INDICADO
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-on-surface-variant ml-1">Nome Completo</label>
              <input type="text" ref={nameRef} defaultValue={athlete ? `${athlete.name} ${athlete.lastName}` : ''} className="w-full bg-surface-high text-white px-4 py-4 rounded-xl text-sm" placeholder="Nome Completo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-on-surface-variant ml-1">Posição</label>
                <select ref={positionRef} defaultValue={athlete?.position} className="w-full bg-surface-high text-white px-4 py-4 rounded-xl text-sm">
                  <option>Goleiro</option><option>Lateral Esquerdo</option><option>Lateral Direito</option><option>Zagueiro</option><option>Volante</option><option>Meia</option><option>Extremo</option><option>Centroavante</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-on-surface-variant ml-1">Categoria</label>
                <select ref={categoryRef} defaultValue={athlete?.category} className="w-full bg-surface-high text-white px-4 py-4 rounded-xl text-sm">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-on-surface-variant ml-1">Clube Atual</label>
              <div className="flex gap-4 items-center">
                <input type="text" ref={clubRef} defaultValue={athlete?.club} className="flex-1 bg-surface-high text-white px-4 py-4 rounded-xl text-sm" placeholder="Nome do Clube" />
                <button type="button" className="relative group" onClick={() => clubFileRef.current?.click()}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-highest border border-white/10 flex items-center justify-center">
                    {clubLogo ? <img src={clubLogo} alt="Logo" className="w-full h-full object-contain" /> : <ShieldCheck className="w-6 h-6 text-on-surface-variant" />}
                  </div>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant ml-1">Possui DVD?</label>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setHasDvd(true)} 
                  className={`flex-1 py-4 rounded-xl text-xs font-black transition-all tracking-widest ${hasDvd ? 'bg-primary text-background' : 'bg-surface-high text-white border border-white/5'}`}
                >
                  SIM
                </button>
                <button 
                  type="button" 
                  onClick={() => { setHasDvd(false); setDvdLink(''); }} 
                  className={`flex-1 py-4 rounded-xl text-xs font-black transition-all tracking-widest ${!hasDvd ? 'bg-primary text-background' : 'bg-surface-high text-white border border-white/5'}`}
                >
                  NÃO
                </button>
              </div>
            </div>

            {hasDvd ? (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-on-surface-variant ml-1">Link do DVD</label>
                <input 
                  type="text" 
                  value={dvdLink} 
                  onChange={(e) => setDvdLink(e.target.value)} 
                  className="w-full bg-surface-high text-white px-4 py-4 rounded-xl text-sm border border-white/5 focus:border-primary/50 transition-colors" 
                  placeholder="Link do vídeo (YouTube, Vimeo...)" 
                />
              </div>
            ) : (
              <div className="p-4 bg-error/10 border border-error/20 rounded-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-error italic text-center">
                  Iniciar com urgência processo de confecção.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-on-surface-variant ml-1">Observações</label>
              <textarea ref={notesRef} defaultValue={athlete?.notes} rows={4} className="w-full bg-surface-high text-white px-4 py-4 rounded-xl text-sm resize-none" placeholder="Observações..." />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-12 pt-12 border-t border-white/5 flex gap-4">
        <button onClick={handleSubmit} className="flex-1 py-5 bg-primary text-background font-black text-sm rounded-2xl uppercase tracking-widest shadow-2xl">SALVAR</button>
        {athlete && onDelete ? (
          <button 
            type="button"
            onClick={() => {
              if (window.confirm(`Tem certeza que deseja apagar o atleta ${athlete.name}?`)) {
                onDelete(athlete.id);
              }
            }} 
            className="px-8 py-5 bg-error/10 text-error hover:bg-error/20 font-black text-sm rounded-2xl uppercase tracking-widest transition-colors"
          >
            APAGAR ATLETA
          </button>
        ) : (
          <button onClick={onBack} className="px-8 py-5 bg-surface-high text-white font-black text-sm rounded-2xl uppercase tracking-widest">CANCELAR</button>
        )}
      </div>
    </div>
  );
};
