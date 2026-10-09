import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Camera, FileText, Trash2, Upload } from 'lucide-react';
import { Athlete } from '../types';
import { CountrySelect } from '../components/CountrySelect';
import { ImageCropper } from '../components/ImageCropper';
import { ClubPicker } from '../components/ClubPicker';
import { Logo } from '../components/Logo';
import { normalize } from '../components/SheetSelect';
import { NATIONALITY_COUNTRIES, SECOND_NATIONALITY_COUNTRIES } from '../countries';
import { CATEGORIES } from '../categories';
import { Club, clubKey, clubLogoMap } from '../clubs';
import { contractFileName, contractTimeLeft } from '../contract';

// Tamanho máximo do arquivo do contrato (o mesmo limite está no bucket, em supabase/contract_files.sql)
const MAX_CONTRACT_MB = 20;

const POSITIONS = ['Goleiro', 'Lateral Esquerdo', 'Lateral Direito', 'Zagueiro', 'Volante', 'Meia', 'Extremo', 'Centroavante'];
const FEET = ['Direito', 'Esquerdo', 'Ambidestro'];

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const labelClass = 'ml-1 text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant';
const inputClass = 'w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-surface-high px-4 py-3.5 text-sm font-bold text-on-surface outline-none transition placeholder:font-medium placeholder:text-on-surface-variant/40 focus:border-white/60 focus:ring-2 focus:ring-white/15';
// No iPhone o campo de data/hora tem largura própria e saía do cartão: no celular ele perde a aparência nativa para respeitar a largura
const dateInputClass = `${inputClass} [color-scheme:dark] max-sm:min-h-[50px] max-sm:appearance-none`;
const toggleClass = (active: boolean) =>
  `flex-1 rounded-xl border py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition ${active ? 'border-primary bg-primary text-background shadow-[0_8px_24px_rgba(255,255,255,0.12)]' : 'border-white/10 bg-surface-high text-on-surface-variant hover:border-white/30 hover:text-on-surface'}`;

// Mesmas seções (e mesma ordem) do perfil do atleta em AthleteInfo
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-3">
      <span className="h-4 w-0.5 rounded-full bg-primary" />
      <h3 className="min-w-0 text-base font-black uppercase tracking-[0.12em] text-primary underline decoration-2 underline-offset-8">{title}</h3>
      <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
    <div className={`${panelClass} space-y-5 p-4 sm:p-6`}>{children}</div>
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

// Campo de arquivo de contrato (o do contrato e o do contrato de empréstimo): mostra o arquivo já gravado ou o escolhido agora,
// que só é enviado ao salvar o atleta. saved é o caminho no Storage; upload, o arquivo novo
const ContractFileField = ({ label, saved, upload, onPick, onRemove }: { label: string; saved: string; upload: File | null; onPick: (file: File) => void; onRemove: () => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const fileLabel = upload?.name || contractFileName(saved);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_CONTRACT_MB * 1024 * 1024) {
      setError(`O arquivo passa de ${MAX_CONTRACT_MB} MB. Escolha um arquivo menor.`);
      return;
    }
    setError('');
    onPick(file);
  };
  return (
    <div className="space-y-1">
      <label className={labelClass}>{label}</label>
      <input type="file" ref={inputRef} className="hidden" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={pick} />
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-surface-high px-4 py-3">
        <FileText className={`h-4 w-4 shrink-0 ${fileLabel ? 'text-white' : 'text-on-surface-variant/50'}`} />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-bold ${fileLabel ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
            {fileLabel || 'Nenhum arquivo enviado'}
          </p>
          {upload && <p className="text-xs font-medium text-on-surface-variant">Será enviado ao salvar o atleta.</p>}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-[9px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.03]"
        >
          <Upload className="h-3.5 w-3.5" />
          {fileLabel ? 'Trocar arquivo' : 'Enviar arquivo'}
        </button>
        {fileLabel && (
          <button
            type="button"
            onClick={() => { setError(''); onRemove(); }}
            className="inline-flex h-9 items-center rounded-full border border-white/15 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant transition hover:border-error/50 hover:text-error"
          >
            Remover
          </button>
        )}
      </div>
      {error
        ? <p className="ml-1 pt-1 text-xs font-bold text-error">{error}</p>
        : <p className="ml-1 pt-1 text-xs font-medium text-on-surface-variant">PDF ou imagem, até {MAX_CONTRACT_MB} MB.</p>}
    </div>
  );
};

interface EditProfileViewProps {
  athlete?: Athlete;
  onBack: () => void;
  // Só na edição: fecha o formulário e reabre o perfil do atleta, sem salvar
  onBackToProfile?: () => void;
  // contractUpload e loanUpload: arquivos novos do contrato e do contrato de empréstimo, enviados ao salvar
  onSave: (data: Partial<Athlete>, contractUpload?: File, loanUpload?: File) => void;
  onDelete?: (id: string) => void;
  athletes?: Athlete[];
  // Clubes do app (os que já vêm e os da aba Clubes): opções do clube e origem do escudo
  clubs?: Club[];
  // Lista do atleta: o contato do empresário só existe no formulário de Negociados
  listType?: 'agenciados' | 'negociados';
}

export const EditProfileView = ({ athlete, onBack, onBackToProfile, onSave, onDelete, athletes = [], clubs = [], listType = 'agenciados' }: EditProfileViewProps) => {
  const isNegociado = listType === 'negociados';
  const [athleteImage, setAthleteImage] = useState(athlete?.image || "https://picsum.photos/seed/athlete_profile/300/300");
  // Foto aberta no ajuste de enquadramento (só vira a foto do atleta ao clicar em "Aplicar")
  const [cropSource, setCropSource] = useState<string | null>(null);
  // Clube atual: escolhido na lista de clubes (ou digitado em "Outro"); o escudo vem do cadastro de clubes
  const [club, setClub] = useState(athlete?.club && athlete.club !== 'Sem Clube' ? athlete.club : '');
  const athleteFileRef = useRef<HTMLInputElement>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef<HTMLSelectElement>(null);
  const secondaryPositionRef = useRef<HTMLSelectElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const naturalidadeRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);
  const preferredFootRef = useRef<HTMLSelectElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);
  const whatsappAthleteRef = useRef<HTMLInputElement>(null);
  const whatsappGuardianRef = useRef<HTMLInputElement>(null);
  const whatsappAgentRef = useRef<HTMLInputElement>(null);
  const agentNameRef = useRef<HTMLInputElement>(null);
  const agentCompanyRef = useRef<HTMLInputElement>(null);
  // "Possui Empresário?" (só em Negociados): com "Não" os campos do empresário somem e são apagados ao salvar
  const [hasAgent, setHasAgent] = useState(
    !!(athlete?.hasAgent || athlete?.agentName || athlete?.agentCompany || athlete?.whatsappAgent)
  );
  const contractStartRef = useRef<HTMLInputElement>(null);
  const contractEndRef = useRef<HTMLInputElement>(null);

  const [contractLevel, setContractLevel] = useState<'' | 'Profissional' | 'Amador'>(athlete?.contractLevel || '');
  const [nacionalidade, setNacionalidade] = useState(athlete?.nacionalidade || '');
  const [hasDualNationality, setHasDualNationality] = useState(athlete?.hasDualNationality ?? false);
  const [secondNationality, setSecondNationality] = useState(athlete?.secondNationality || '');

  const [hasDvd, setHasDvd] = useState(athlete?.hasDvd ?? false);
  const [dvdLink, setDvdLink] = useState(athlete?.dvdLink || '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Só para o aviso de quanto falta para o término; o valor gravado continua vindo do campo
  const [contractEndValue, setContractEndValue] = useState(athlete?.contractEnd || '');
  const contractLeft = contractTimeLeft(contractEndValue);
  // Clube do contrato (só em Negociados): escolhido entre os clubes já cadastrados ou digitado em "Outro"
  const [contractClub, setContractClub] = useState(athlete?.contractClub || '');
  // "Está emprestado?" (só em Negociados): com "Não" os dados do empréstimo são apagados ao salvar
  const [onLoan, setOnLoan] = useState(athlete?.onLoan ?? false);
  const [loanClub, setLoanClub] = useState(athlete?.loanClub || '');
  // Clube gravado no atleta: em Negociados é o Clube do Contrato (o empréstimo troca o clube só na exibição); sem ele, vale o que já estava
  const currentClub = isNegociado ? contractClub.trim() || club.trim() : club.trim();
  const sameClub = clubKey(currentClub) === clubKey(athlete?.club);
  const [loanStart, setLoanStart] = useState(athlete?.loanStart || '');
  const [loanEnd, setLoanEnd] = useState(athlete?.loanEnd || '');
  const loanLeft = contractTimeLeft(loanEnd);
  const clubOptions = useMemo(() => {
    const byName = new Map<string, string>();
    [...clubs.map((item) => item.name), ...athletes.flatMap((item) => [item.club, item.contractClub, item.loanClub]), athlete?.club, club, contractClub, loanClub].forEach((club) => {
      const name = (club || '').trim();
      if (name && name !== 'Sem Clube' && !byName.has(normalize(name))) byName.set(normalize(name), name);
    });
    // Escudo em miniatura ao lado do nome: o do cadastro de clubes ou, na falta, o de um atleta daquele clube
    const logos = clubLogoMap(clubs);
    athletes.forEach((item) => { if (item.clubLogo && !logos.has(clubKey(item.club))) logos.set(clubKey(item.club), item.clubLogo); });
    return [...byName.values()].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((name) => ({ value: name, label: name, image: logos.get(clubKey(name)) }));
  }, [clubs, athletes, athlete, club, contractClub, loanClub]);

  // Arquivos do contrato e do contrato de empréstimo: o já gravado (caminho no Storage) e o novo, que só é enviado ao salvar
  const [contractFile, setContractFile] = useState(athlete?.contractFile || '');
  const [contractUpload, setContractUpload] = useState<File | null>(null);
  const [loanContractFile, setLoanContractFile] = useState(athlete?.loanContractFile || '');
  const [loanUpload, setLoanUpload] = useState<File | null>(null);

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
    // O campo do link saiu do formulário: link antigo já gravado é mantido
    const contractLink = athlete?.contractLink || '';
    // Em Negociados o contrato é com o clube escolhido em "Clube do Contrato". Em Agenciados o formulário
    // não escolhe com quem é o contrato: preenchido é com a Field; contrato com clube já gravado é mantido
    const chosenClub = contractClub.trim();
    const hasContractFile = Boolean(contractUpload || contractFile);
    const contractType = isNegociado
      ? ((chosenClub || contractStart || contractEnd || contractLink || hasContractFile) ? 'Clube' : undefined)
      : athlete?.contractType === 'Clube'
        ? 'Clube'
        : (contractStart || contractEnd || contractLink || hasContractFile) ? 'Field' : undefined;
    // Empresário: editado só em Negociados (nome, empresa e WhatsApp); em Agenciados mantém o que já estava gravado
    const agentName = isNegociado ? (agentNameRef.current?.value || '').trim() : athlete?.agentName;
    const agentCompany = isNegociado ? (agentCompanyRef.current?.value || '').trim() : athlete?.agentCompany;
    const whatsappAgent = isNegociado ? (whatsappAgentRef.current?.value || '').trim() : athlete?.whatsappAgent;
    onSave({
      name: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      position: positionRef.current?.value as any,
      secondaryPosition: secondaryPositionRef.current?.value as any,
      club: currentClub,
      category: categoryRef.current?.value,
      image: athleteImage,
      // O escudo não é mais enviado aqui: mantém o que já estava gravado no atleta enquanto o clube for o mesmo
      clubLogo: sameClub ? athlete?.ownClubLogo ?? athlete?.clubLogo ?? '' : '',
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
      hasAgent: isNegociado ? hasAgent : athlete?.hasAgent ?? false,
      agentCompany,
      agentName,
      whatsappAgent,
      contractType,
      contractLevel: contractLevel || undefined,
      contractClub: contractType === 'Clube' ? (isNegociado ? chosenClub || undefined : athlete?.contractClub) : undefined,
      contractStart,
      contractEnd,
      contractLink,
      contractFile,
      // Empréstimo: editado só em Negociados; em Agenciados mantém o que já estava gravado
      onLoan: isNegociado ? onLoan && !!loanClub.trim() : athlete?.onLoan ?? false,
      loanClub: isNegociado ? (onLoan ? loanClub.trim() : '') : athlete?.loanClub,
      loanStart: isNegociado ? (onLoan ? loanStart : '') : athlete?.loanStart,
      loanEnd: isNegociado ? (onLoan ? loanEnd : '') : athlete?.loanEnd,
      // Sem empréstimo (ou sem o clube), o arquivo do contrato de empréstimo é apagado junto
      loanContractFile: isNegociado ? (onLoan && loanClub.trim() ? loanContractFile : '') : athlete?.loanContractFile,
      // Origem e observações não são editadas aqui: mantém o que já estava gravado
      notes: athlete?.notes,
      hasDvd,
      dvdLink,
      source: athlete?.source,
    }, contractUpload || undefined, (isNegociado && onLoan && loanClub.trim() && loanUpload) || undefined);
  };

  return (
    <div className="relative mx-auto max-w-4xl px-3 pb-6 pt-12 sm:px-10 sm:pb-10">
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

      <section className={`${panelClass} relative mb-8 overflow-hidden p-4 sm:mb-10 sm:p-8`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 via-white/[0.03] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="relative flex flex-wrap items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => athleteFileRef.current?.click()}
            className="group relative h-20 w-20 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-full bg-surface-high shadow-[0_16px_40px_rgba(0,0,0,0.55)] ring-2 ring-white/80 ring-offset-4 ring-offset-background transition hover:scale-[1.02]"
            aria-label="Trocar foto do atleta"
          >
            <img src={athleteImage} alt="Atleta" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{athlete ? 'Editar perfil' : 'Cadastro de atleta'}</p>
            <h2 className="mt-2 truncate text-xl sm:text-3xl font-black uppercase italic leading-none text-white">
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
          {/* No cadastro, a marca da lista escolhida na pergunta "agenciado ou negociado" */}
          {!athlete && (
            <span
              title={isNegociado ? 'Cosmopolitano Sports' : 'Field'}
              className="flex h-14 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 p-1.5 sm:h-24 sm:w-40 sm:p-2"
            >
              {isNegociado ? (
                <img src="/assets/cosmopolitano.png" alt="Cosmopolitano Sports" className="h-full w-full object-contain brightness-0 invert" />
              ) : (
                <Logo variant="minimal" className="h-full w-full" />
              )}
            </span>
          )}
          {onBackToProfile && (
            <button
              type="button"
              onClick={onBackToProfile}
              className="inline-flex h-10 shrink-0 touch-manipulation items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-[9px] font-black uppercase tracking-[0.2em] text-white transition hover:border-primary hover:bg-primary hover:text-background"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao perfil
            </button>
          )}
        </div>
      </section>

      <div className="space-y-8">
        <FormSection title="Informações pessoais">
          <div className="space-y-1">
            <label className={labelClass}>Nome Completo *</label>
            <input type="text" ref={nameRef} defaultValue={athlete ? `${athlete.name} ${athlete.lastName}` : ''} className={inputClass} placeholder="Nome Completo" />
          </div>
          <div className={`grid grid-cols-1 gap-4 [&>*]:min-w-0 ${hasDualNationality ? 'sm:grid-cols-[1fr_1fr_auto_1fr]' : 'sm:grid-cols-[1fr_1fr_auto]'}`}>
            <div className="min-w-0 space-y-1">
              <label className={labelClass}>Data de Nascimento *</label>
              <input type="date" ref={birthDateRef} defaultValue={athlete?.birthDate || ''} className={dateInputClass} />
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 [&>*]:min-w-0">
            <div className="space-y-1">
              <label className={labelClass}>Altura</label>
              <input type="text" inputMode="decimal" maxLength={4} ref={heightRef} defaultValue={athlete?.height ? (athlete.height / 100).toFixed(2).replace('.', ',') : ''} onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/[^\d.,]/g, '').replace(/([.,].*)[.,]/g, '$1'); }} className={inputClass} placeholder="Ex.: 1,80" />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Peso</label>
              <input type="text" inputMode="decimal" maxLength={5} ref={weightRef} defaultValue={athlete?.weight ?? ''} onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/[^\d.,]/g, '').replace(/([.,].*)[.,]/g, '$1'); }} className={inputClass} placeholder="Ex.: 72" />
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-1">
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
            {isNegociado ? (
              <>
                {/* Em Negociados o clube atual não é escolhido: é o do empréstimo ou, sem empréstimo, o Clube do Contrato */}
                <div className={`${inputClass} flex min-h-[50px] items-center text-on-surface-variant`}>
                  {onLoan && loanClub.trim() ? `${loanClub.trim()} (empréstimo)` : currentClub || 'Sem Clube'}
                </div>
                <p className="ml-1 pt-1 text-xs font-medium text-on-surface-variant">Definido em "Informações contratuais": o Clube do Empréstimo ou, sem empréstimo, o Clube do Contrato.</p>
              </>
            ) : (
              <ClubPicker value={club} options={clubOptions} onChange={setClub} label="Clube Atual" />
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 [&>*]:min-w-0">
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
            <div className="flex gap-2 sm:gap-4">
              {(['Profissional', 'Amador'] as const).map(level => (
                <button key={level} type="button" onClick={() => setContractLevel(contractLevel === level ? '' : level)} className={toggleClass(contractLevel === level)}>
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {isNegociado && (
            <div className="space-y-1">
              <label className={labelClass}>Clube do Contrato</label>
              <ClubPicker value={contractClub} options={clubOptions} onChange={setContractClub} label="Clube do Contrato" />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
            <div className="space-y-1">
              <label className={labelClass}>Início do Contrato</label>
              <input type="date" ref={contractStartRef} defaultValue={athlete?.contractStart || ''} className={dateInputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Término do Contrato</label>
              <input type="date" ref={contractEndRef} defaultValue={athlete?.contractEnd || ''} onChange={(e) => setContractEndValue(e.target.value)} className={dateInputClass} />
              {contractLeft && (
                <p className={`ml-1 pt-1 text-xs font-bold ${contractLeft.expired ? 'text-error' : 'text-white'}`}>
                  {contractLeft.expired ? 'Contrato encerrado' : `${contractLeft.text} para o término do contrato`}
                </p>
              )}
            </div>
          </div>
          <ContractFileField label="Arquivo do Contrato" saved={contractFile} upload={contractUpload} onPick={setContractUpload} onRemove={() => { setContractUpload(null); setContractFile(''); }} />
          {isNegociado && (
            <>
              <div className="space-y-2">
                <label className={labelClass}>Está Emprestado?</label>
                <div className="flex gap-2 sm:gap-4">
                  <button type="button" onClick={() => setOnLoan(true)} className={toggleClass(onLoan)}>SIM</button>
                  <button type="button" onClick={() => setOnLoan(false)} className={toggleClass(!onLoan)}>NÃO</button>
                </div>
              </div>
              {onLoan && (
                <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 [&>*]:min-w-0">
                  <div className="space-y-1">
                    <label className={labelClass}>Clube do Empréstimo</label>
                    <ClubPicker value={loanClub} options={clubOptions} onChange={setLoanClub} label="Clube do Empréstimo" />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Início do Empréstimo</label>
                    <input type="date" value={loanStart} onChange={(e) => setLoanStart(e.target.value)} className={dateInputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Término do Empréstimo</label>
                    <input type="date" value={loanEnd} onChange={(e) => setLoanEnd(e.target.value)} className={dateInputClass} />
                    {loanLeft && (
                      <p className={`ml-1 pt-1 text-xs font-bold ${loanLeft.expired ? 'text-error' : 'text-white'}`}>
                        {loanLeft.expired ? 'Empréstimo encerrado' : `${loanLeft.text} para o fim do empréstimo`}
                      </p>
                    )}
                  </div>
                </div>
                <ContractFileField label="Arquivo do Contrato de Empréstimo" saved={loanContractFile} upload={loanUpload} onPick={setLoanUpload} onRemove={() => { setLoanUpload(null); setLoanContractFile(''); }} />
                </>
              )}
            </>
          )}
        </FormSection>

        <FormSection title="Contatos">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
            <div className="space-y-1">
              <label className={labelClass}>WhatsApp Atleta</label>
              <input type="tel" ref={whatsappAthleteRef} defaultValue={athlete?.whatsappAthlete || ''} className={inputClass} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>WhatsApp Responsável</label>
              <input type="tel" ref={whatsappGuardianRef} defaultValue={athlete?.whatsappGuardian || ''} className={inputClass} placeholder="(11) 99999-9999" />
            </div>
          </div>
          {isNegociado && (
            <div className="space-y-2">
              <label className={labelClass}>Possui Empresário?</label>
              <div className="flex gap-2 sm:gap-4">
                <button type="button" onClick={() => setHasAgent(true)} className={toggleClass(hasAgent)}>SIM</button>
                <button type="button" onClick={() => setHasAgent(false)} className={toggleClass(!hasAgent)}>NÃO</button>
              </div>
            </div>
          )}
          {isNegociado && hasAgent && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 [&>*]:min-w-0">
              <div className="space-y-1">
                <label className={labelClass}>Empresa do Empresário</label>
                <input type="text" ref={agentCompanyRef} defaultValue={athlete?.agentCompany || ''} className={inputClass} placeholder="Nome da empresa" />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Nome do Empresário</label>
                <input type="text" ref={agentNameRef} defaultValue={athlete?.agentName || ''} className={inputClass} placeholder="Nome do empresário" />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>WhatsApp Empresário</label>
                <input type="tel" ref={whatsappAgentRef} defaultValue={athlete?.whatsappAgent || ''} className={inputClass} placeholder="(11) 99999-9999" />
              </div>
            </div>
          )}
        </FormSection>

        <FormSection title="Outras informações">
          <div className="space-y-2">
            <label className={labelClass}>Possui DVD?</label>
            <div className="flex gap-2 sm:gap-4">
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
                Confeccionar o material do atleta.
              </p>
            </div>
          )}
        </FormSection>
      </div>
      <div className="mt-8 flex gap-2 sm:mt-10 sm:gap-4">
        <button onClick={handleSubmit} className="flex-1 rounded-2xl bg-primary py-4 sm:py-5 text-[11px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-background shadow-[0_12px_32px_rgba(255,255,255,0.12)] transition hover:scale-[1.01]">Salvar atleta</button>
        {athlete && onDelete ? (
          <button 
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded-2xl border border-error/20 bg-error/10 px-4 py-4 sm:px-8 sm:py-5 text-[11px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-error transition hover:bg-error/20"
          >
            APAGAR ATLETA
          </button>
        ) : (
          <button onClick={onBack} className="rounded-2xl border border-white/10 bg-surface-high px-4 py-4 sm:px-8 sm:py-5 text-[11px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-white transition hover:border-white/20">Cancelar</button>
        )}
      </div>

      {/* Confirmação de exclusão, no mesmo padrão do "Encerrar sessão" */}
      {createPortal(
        <AnimatePresence>
          {confirmingDelete && athlete && onDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setConfirmingDelete(false)}
              className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 px-6 backdrop-blur-md"
            >
              <motion.div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-athlete-title"
                aria-describedby="delete-athlete-message"
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.key === 'Escape' && setConfirmingDelete(false)}
                className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-surface-low shadow-[0_30px_80px_rgba(0,0,0,0.8)]"
              >
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
                <div className="px-8 pb-8 pt-9 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                    <Trash2 className="h-7 w-7 text-primary" />
                  </div>
                  <p className="mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant">Apagar atleta</p>
                  <h3 id="delete-athlete-title" className="mt-2 break-words text-2xl font-black uppercase italic leading-tight tracking-tight text-white">
                    Deseja apagar {`${athlete.name} ${athlete.lastName || ''}`.trim()}?
                  </h3>
                  <p id="delete-athlete-message" className="mt-4 text-sm leading-relaxed text-on-surface-variant">
                    A exclusão é definitiva e não pode ser desfeita.
                  </p>
                  <div className="mt-8 flex gap-3">
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setConfirmingDelete(false)}
                      className="flex-1 rounded-2xl border border-white/10 bg-surface-high py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition hover:border-white/20"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDelete(false);
                        onDelete(athlete.id);
                      }}
                      className="flex-1 rounded-2xl bg-error py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-xl transition hover:scale-[1.02]"
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};
