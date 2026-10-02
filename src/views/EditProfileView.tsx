import React, { useRef, useState } from 'react';
import { Camera, ShieldCheck } from 'lucide-react';
import { Athlete } from '../types';
import { CountrySelect } from '../components/CountrySelect';
import { ImageCropper } from '../components/ImageCropper';
import { NATIONALITY_COUNTRIES, SECOND_NATIONALITY_COUNTRIES } from '../countries';

const CATEGORIES = ['Profissional', 'Sub-20', 'Sub-17', 'Sub-15', 'Sub-14', 'Sub-13', 'Sub-12', 'Sub-11', 'Sub-10'];
const POSITIONS = ['Goleiro', 'Lateral Esquerdo', 'Lateral Direito', 'Zagueiro', 'Volante', 'Meia', 'Extremo', 'Centroavante'];
const FEET = ['Direito', 'Esquerdo', 'Ambidestro'];

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const labelClass = 'ml-1 text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant';
const inputClass = 'w-full rounded-xl border border-white/10 bg-surface-high px-4 py-3.5 text-sm font-bold text-on-surface outline-none transition placeholder:font-medium placeholder:text-on-surface-variant/40 focus:border-white/60 focus:ring-2 focus:ring-white/15';
const toggleClass = (active: boolean) =>
  `flex-1 rounded-xl border py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition ${active ? 'border-primary bg-primary text-background shadow-[0_8px_24px_rgba(255,255,255,0.12)]' : 'border-white/10 bg-surface-high text-on-surface-variant hover:border-white/30 hover:text-on-surface'}`;

// Mesmas seções (e mesma ordem) do perfil do atleta em AthleteInfo
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-3">
      <span className="h-4 w-0.5 rounded-full bg-primary" />
      <h3 className="text-base font-black uppercase tracking-[0.12em] text-primary underline decoration-2 underline-offset-8">{title}</h3>
      <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
    <div className={`${panelClass} space-y-5 p-6`}>{children}</div>
  </section>
);

const calcAge = (birthDate: string) => {
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return undefined;
  const today = new Date();
  const hadBirthday = today.getMonth() > birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  return today.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1);
};

const toNumber = (value?: string) => {
  const parsed = parseFloat((value || '').replace(',', '.'));
  return Number.isNaN(parsed) ? undefined : parsed;
};

// A altura é digitada em metros (1,80) e gravada em centímetros; valor sem vírgula (180) já é tratado como centímetros.
const toHeightCm = (value?: string) => {
  const parsed = toNumber(value);
  if (parsed === undefined) return undefined;
  return parsed < 10 ? Math.round(parsed * 100) : Math.round(parsed);
};

interface EditProfileViewProps {
  athlete?: Athlete;
  onBack: () => void;
  onSave: (data: Partial<Athlete>) => void;
  onDelete?: (id: string) => void;
  athletes?: Athlete[];
}

export const EditProfileView = ({ athlete, onBack, onSave, onDelete, athletes = [] }: EditProfileViewProps) => {
  const [athleteImage, setAthleteImage] = useState(athlete?.image || "https://picsum.photos/seed/athlete_profile/300/300");
  // Foto aberta no ajuste de enquadramento (só vira a foto do atleta ao clicar em "Aplicar")
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [clubLogo, setClubLogo] = useState(athlete?.clubLogo || "");
  const athleteFileRef = useRef<HTMLInputElement>(null);
  const clubFileRef = useRef<HTMLInputElement>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef<HTMLSelectElement>(null);
  const secondaryPositionRef = useRef<HTMLSelectElement>(null);
  const clubRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const naturalidadeRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);
  const preferredFootRef = useRef<HTMLSelectElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);
  const whatsappAthleteRef = useRef<HTMLInputElement>(null);
  const whatsappGuardianRef = useRef<HTMLInputElement>(null);
  const contractStartRef = useRef<HTMLInputElement>(null);
  const contractEndRef = useRef<HTMLInputElement>(null);
  const contractLinkRef = useRef<HTMLInputElement>(null);

  const [contractLevel, setContractLevel] = useState<'' | 'Profissional' | 'Amador'>(athlete?.contractLevel || '');
  const [nacionalidade, setNacionalidade] = useState(athlete?.nacionalidade || '');
  const [hasDualNationality, setHasDualNationality] = useState(athlete?.hasDualNationality ?? false);
  const [secondNationality, setSecondNationality] = useState(athlete?.secondNationality || '');

  const [hasDvd, setHasDvd] = useState(athlete?.hasDvd ?? false);
  const [dvdLink, setDvdLink] = useState(athlete?.dvdLink || '');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
    // Permite escolher o mesmo arquivo de novo
    e.target.value = '';
  };

  const handleSubmit = () => {
    const fullName = (nameRef.current?.value || '').trim();
    const nameParts = fullName.split(' ');
    const birthDate = birthDateRef.current?.value || '';
    const contractStart = contractStartRef.current?.value || '';
    const contractEnd = contractEndRef.current?.value || '';
    const contractLink = (contractLinkRef.current?.value || '').trim();
    // O formulário não escolhe mais com quem é o contrato: contrato preenchido é com a Field;
    // contrato com clube já gravado é mantido
    const contractType = athlete?.contractType === 'Clube'
      ? 'Clube'
      : (contractStart || contractEnd || contractLink) ? 'Field' : undefined;
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
      nacionalidade,
      hasDualNationality,
      secondNationality: hasDualNationality ? secondNationality : undefined,
      birthDate,
      age: birthDate ? calcAge(birthDate) : undefined,
      preferredFoot: preferredFootRef.current?.value,
      weight: toNumber(weightRef.current?.value),
      height: toHeightCm(heightRef.current?.value),
      whatsappAthlete: whatsappAthleteRef.current?.value.trim(),
      whatsappGuardian: whatsappGuardianRef.current?.value.trim(),
      // Empresário não é editado aqui: mantém o que já estava gravado
      hasAgent: athlete?.hasAgent ?? false,
      agentCompany: athlete?.agentCompany,
      agentName: athlete?.agentName,
      whatsappAgent: athlete?.whatsappAgent,
      contractType,
      contractLevel: contractLevel || undefined,
      contractClub: contractType === 'Clube' ? athlete?.contractClub : undefined,
      contractStart,
      contractEnd,
      contractLink,
      // Origem e observações não são editadas aqui: mantém o que já estava gravado
      notes: athlete?.notes,
      hasDvd,
      dvdLink,
      source: athlete?.source,
    });
  };

  return (
    <div className="relative mx-auto max-w-4xl px-6 pb-10 pt-12 sm:px-10">
      <input type="file" ref={athleteFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setCropSource)} />
      {cropSource && (
        <ImageCropper
          src={cropSource}
          onCancel={() => setCropSource(null)}
          onConfirm={(image) => {
            setAthleteImage(image);
            setCropSource(null);
          }}
        />
      )}
      <input type="file" ref={clubFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setClubLogo)} />

      <section className={`${panelClass} relative mb-10 overflow-hidden p-8`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 via-white/[0.03] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="relative flex flex-wrap items-center gap-6">
          <button
            type="button"
            onClick={() => athleteFileRef.current?.click()}
            className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-surface-high shadow-[0_16px_40px_rgba(0,0,0,0.55)] ring-2 ring-white/80 ring-offset-4 ring-offset-background transition hover:scale-[1.02]"
            aria-label="Trocar foto do atleta"
          >
            <img src={athleteImage} alt="Atleta" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{athlete ? 'Editar perfil' : 'Cadastro de atleta'}</p>
            <h2 className="mt-2 truncate text-3xl font-black uppercase italic leading-none text-white">
              {athlete ? `${athlete.name} ${athlete.lastName}` : 'Novo atleta'}
            </h2>
            <p className="mt-3 text-xs font-bold text-on-surface-variant">Toque na foto para escolher a imagem do atleta.</p>
            {/* Só fotos enviadas pelo app (data URL) podem ser reajustadas; imagens de link externo não */}
            {athleteImage.startsWith('data:') && (
              <button
                type="button"
                onClick={() => setCropSource(athleteImage)}
                className="mt-3 rounded-xl border border-white/10 bg-surface-high px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant transition hover:border-white/30 hover:text-on-surface"
              >
                Ajustar foto
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="space-y-8">
        <FormSection title="Informações pessoais">
          <div className="space-y-1">
            <label className={labelClass}>Nome Completo *</label>
            <input type="text" ref={nameRef} defaultValue={athlete ? `${athlete.name} ${athlete.lastName}` : ''} className={inputClass} placeholder="Nome Completo" />
          </div>
          <div className={`grid grid-cols-1 gap-4 ${hasDualNationality ? 'sm:grid-cols-[1fr_1fr_auto_1fr]' : 'sm:grid-cols-[1fr_1fr_auto]'}`}>
            <div className="min-w-0 space-y-1">
              <label className={labelClass}>Data de Nascimento *</label>
              <input type="date" ref={birthDateRef} defaultValue={athlete?.birthDate || ''} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div className="min-w-0 space-y-1">
              <label className={labelClass}>Nacionalidade</label>
              <CountrySelect value={nacionalidade} onChange={setNacionalidade} countries={NATIONALITY_COUNTRIES} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Dupla Nacionalidade?</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setHasDualNationality(true)} className={`${toggleClass(hasDualNationality)} px-4`}>SIM</button>
                <button type="button" onClick={() => setHasDualNationality(false)} className={`${toggleClass(!hasDualNationality)} px-4`}>NÃO</button>
              </div>
            </div>
            {hasDualNationality && (
              <div className="min-w-0 space-y-1">
                <label className={labelClass}>Segunda Nacionalidade</label>
                <CountrySelect value={secondNationality} onChange={setSecondNationality} countries={SECOND_NATIONALITY_COUNTRIES} align="right" className={inputClass} />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Cidade/Estado</label>
            <input type="text" ref={naturalidadeRef} defaultValue={athlete?.naturalidade || ''} className={inputClass} placeholder="Ex.: Campinas/SP" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Altura</label>
              <input type="text" inputMode="decimal" maxLength={4} ref={heightRef} defaultValue={athlete?.height ? (athlete.height / 100).toFixed(2).replace('.', ',') : ''} onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/[^\d.,]/g, '').replace(/([.,].*)[.,]/g, '$1'); }} className={inputClass} placeholder="Ex.: 1,80" />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Peso</label>
              <input type="text" inputMode="decimal" maxLength={5} ref={weightRef} defaultValue={athlete?.weight ?? ''} onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/[^\d.,]/g, '').replace(/([.,].*)[.,]/g, '$1'); }} className={inputClass} placeholder="Ex.: 72" />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Pé Dominante</label>
              <select ref={preferredFootRef} defaultValue={athlete?.preferredFoot || ''} className={inputClass}>
                <option value="">—</option>
                {FEET.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </FormSection>

        <FormSection title="Informações esportivas">
          <div className="space-y-1">
            <label className={labelClass}>Clube Atual</label>
            <div className="flex gap-4 items-center">
              <input type="text" ref={clubRef} defaultValue={athlete?.club === 'Sem Clube' ? '' : athlete?.club} className={`flex-1 ${inputClass}`} placeholder="Nome do Clube" />
              <button type="button" className="relative group" onClick={() => clubFileRef.current?.click()} aria-label="Escudo do clube">
                <div className="flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-surface-high transition group-hover:border-white/40">
                  {clubLogo ? <img src={clubLogo} alt="Logo" className="w-full h-full object-contain" /> : <ShieldCheck className="h-5 w-5 text-primary" />}
                </div>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Categoria *</label>
              <select ref={categoryRef} defaultValue={athlete?.category || ''} className={inputClass}>
                <option value="">Selecione</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Posição Principal *</label>
              <select ref={positionRef} defaultValue={athlete?.position || ''} className={inputClass}>
                <option value="">Selecione</option>
                {POSITIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Posição Secundária</label>
              <select ref={secondaryPositionRef} defaultValue={athlete?.secondaryPosition || ''} className={inputClass}>
                <option value="">—</option>
                {POSITIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </FormSection>

        <FormSection title="Informações contratuais">
          <div className="space-y-2">
            <label className={labelClass}>Tipo de Contrato</label>
            <div className="flex gap-4">
              {(['Profissional', 'Amador'] as const).map(level => (
                <button key={level} type="button" onClick={() => setContractLevel(contractLevel === level ? '' : level)} className={toggleClass(contractLevel === level)}>
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Início do Contrato</label>
              <input type="date" ref={contractStartRef} defaultValue={athlete?.contractStart || ''} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Término do Contrato</label>
              <input type="date" ref={contractEndRef} defaultValue={athlete?.contractEnd || ''} className={`${inputClass} [color-scheme:dark]`} />
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Link do Contrato</label>
            <input type="url" ref={contractLinkRef} defaultValue={athlete?.contractLink || ''} className={inputClass} placeholder="Link do documento (Google Drive, etc.)" />
          </div>
        </FormSection>

        <FormSection title="Contatos">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={labelClass}>WhatsApp Atleta</label>
              <input type="tel" ref={whatsappAthleteRef} defaultValue={athlete?.whatsappAthlete || ''} className={inputClass} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>WhatsApp Responsável</label>
              <input type="tel" ref={whatsappGuardianRef} defaultValue={athlete?.whatsappGuardian || ''} className={inputClass} placeholder="(11) 99999-9999" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Outras informações">
          <div className="space-y-2">
            <label className={labelClass}>Possui DVD?</label>
            <div className="flex gap-4">
              <button type="button" onClick={() => setHasDvd(true)} className={toggleClass(hasDvd)}>SIM</button>
              <button type="button" onClick={() => { setHasDvd(false); setDvdLink(''); }} className={toggleClass(!hasDvd)}>NÃO</button>
            </div>
          </div>

          {hasDvd ? (
            <div className="space-y-1">
              <label className={labelClass}>Link do DVD</label>
              <input
                type="text"
                value={dvdLink}
                onChange={(e) => setDvdLink(e.target.value)}
                className={inputClass}
                placeholder="Link do vídeo (YouTube, Vimeo...)"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-error/20 bg-error/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-error italic text-center">
                Iniciar com urgência processo de confecção.
              </p>
            </div>
          )}
        </FormSection>
      </div>
      <div className="mt-10 flex gap-4">
        <button onClick={handleSubmit} className="flex-1 rounded-2xl bg-primary py-5 text-[11px] font-black uppercase tracking-[0.2em] text-background shadow-[0_12px_32px_rgba(255,255,255,0.12)] transition hover:scale-[1.01]">Salvar atleta</button>
        {athlete && onDelete ? (
          <button 
            type="button"
            onClick={() => {
              if (window.confirm(`Tem certeza que deseja apagar o atleta ${athlete.name}?`)) {
                onDelete(athlete.id);
              }
            }} 
            className="rounded-2xl border border-error/20 bg-error/10 px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-error transition hover:bg-error/20"
          >
            APAGAR ATLETA
          </button>
        ) : (
          <button onClick={onBack} className="rounded-2xl border border-white/10 bg-surface-high px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-white transition hover:border-white/20">Cancelar</button>
        )}
      </div>
    </div>
  );
};
