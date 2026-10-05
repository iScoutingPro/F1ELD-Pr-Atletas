import React from 'react';
import { ArrowUpRight, BriefcaseBusiness, Calendar, FileText, Flag, LucideIcon, MapPin, MessageCircle, Shield, Target, Trophy, User, Video } from 'lucide-react';
import { Athlete } from '../types';
import { findCountry } from '../countries';
import { CountryFlag } from './CountrySelect';

const formatDate = (value?: string) => {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

const whatsappLink = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  // Números sem DDI (até 11 dígitos) são tratados como brasileiros
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
};

const toTime = (value?: string) => {
  const time = value ? new Date(`${value.slice(0, 10)}T00:00:00`).getTime() : NaN;
  return Number.isNaN(time) ? null : time;
};

const panelClass = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const labelClass = 'text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <span className="h-4 w-0.5 rounded-full bg-primary" />
    <h3 className="text-base font-black uppercase tracking-[0.12em] text-primary underline decoration-2 underline-offset-8">{children}</h3>
    <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
  </div>
);

const InfoRow = ({ icon: Icon, label, value, children }: { icon: LucideIcon; label: string; value?: string; children?: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-5 py-4">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-high">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="min-w-0 flex-1">
      <p className={labelClass}>{label}</p>
      <p className={`mt-1 break-words text-sm font-bold sm:truncate ${value ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>{value || 'Não informado'}</p>
    </div>
    {children}
  </div>
);

const ContactCard = ({ label, phone }: { label: string; phone?: string }) => phone ? (
  <a
    href={whatsappLink(phone)}
    target="_blank"
    rel="noopener noreferrer"
    className={`${panelClass} group flex items-center gap-3 px-5 py-4 transition hover:border-primary/40`}
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
      <MessageCircle className="h-4 w-4 text-primary" />
    </div>
    <div className="min-w-0 flex-1">
      <p className={labelClass}>{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-on-surface">{phone}</p>
    </div>
    <ArrowUpRight className="h-4 w-4 shrink-0 text-on-surface-variant transition group-hover:text-primary" />
  </a>
) : (
  <div className={`${panelClass} flex items-center gap-3 px-5 py-4 opacity-60`}>
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-high">
      <MessageCircle className="h-4 w-4 text-on-surface-variant" />
    </div>
    <div className="min-w-0 flex-1">
      <p className={labelClass}>{label}</p>
      <p className="mt-1 text-sm font-bold text-on-surface-variant/50">Não informado</p>
    </div>
  </div>
);

export const AthleteInfo =({ athlete }: { athlete: Athlete }) => {
  const stats = [
    { label: 'Idade', value: athlete.age ? String(athlete.age) : '', unit: 'anos' },
    { label: 'Altura', value: athlete.height ? (athlete.height / 100).toFixed(2).replace('.', ',') : '', unit: 'm' },
    { label: 'Peso', value: athlete.weight ? String(athlete.weight).replace('.', ',') : '', unit: 'kg' },
    { label: 'Pé Dominante', value: athlete.preferredFoot || '', unit: '' },
  ];

  const country = findCountry(athlete.nacionalidade);
  const secondCountry = athlete.hasDualNationality ? findCountry(athlete.secondNationality) : undefined;

  const start = toTime(athlete.contractStart);
  const end = toTime(athlete.contractEnd);
  const now = Date.now();
  const expired = end !== null && end < now;
  const progress = start !== null && end !== null && end > start
    ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
    : null;
  const contractParty = athlete.contractType === 'Clube'
    ? (athlete.contractClub || athlete.club)
    : 'Field';

  return (
    <div className="mt-8 space-y-8">
      <div className={`${panelClass} grid grid-cols-2 divide-white/10 sm:grid-cols-4 sm:divide-x`}>
        {stats.map(({ label, value, unit }) => (
          <div key={label} className="px-5 py-5 text-center">
            <p className={labelClass}>{label}</p>
            <p className="mt-2 text-2xl font-black italic leading-none tracking-tight text-white">
              {value || <span className="text-on-surface-variant/40">—</span>}
              {value && unit && <span className="ml-1 text-[10px] font-black uppercase not-italic tracking-[0.15em] text-primary">{unit}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <SectionTitle>Informações pessoais</SectionTitle>
          <div className={`${panelClass} divide-y divide-white/5`}>
            <InfoRow icon={User} label="Nome Completo" value={`${athlete.name} ${athlete.lastName || ''}`.trim()} />
            <InfoRow icon={Calendar} label="Data de Nascimento" value={formatDate(athlete.birthDate)} />
            <InfoRow icon={Flag} label="Nacionalidade" value={country ? `${country.code} · ${country.name}` : athlete.nacionalidade}>
              {country && <CountryFlag country={country} className="h-6 w-9" />}
            </InfoRow>
            <InfoRow icon={Flag} label="Dupla Nacionalidade" value={athlete.hasDualNationality ? (secondCountry ? `${secondCountry.code} · ${secondCountry.name}` : athlete.secondNationality || 'Sim') : 'Não possui'}>
              {secondCountry && <CountryFlag country={secondCountry} className="h-6 w-9" />}
            </InfoRow>
            <InfoRow icon={MapPin} label="Cidade/Estado" value={athlete.naturalidade} />
          </div>
        </div>

        <div className="space-y-3">
          <SectionTitle>Informações esportivas</SectionTitle>
          <div className={`${panelClass} divide-y divide-white/5`}>
            <InfoRow icon={Shield} label="Clube Atual" value={athlete.club}>
              {athlete.clubLogo && (
                <img src={athlete.clubLogo} alt={athlete.club} className="h-9 w-9 shrink-0 object-contain mix-blend-screen" />
              )}
            </InfoRow>
            <InfoRow icon={Trophy} label="Categoria" value={athlete.category} />
            <InfoRow icon={Target} label="Posição Principal" value={athlete.position} />
            <InfoRow icon={Target} label="Posição Secundária" value={athlete.secondaryPosition} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>Informações contratuais</SectionTitle>
        {athlete.contractType ? (
          <div className={`${panelClass} relative overflow-hidden p-6`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className={labelClass}>Contrato com {athlete.contractType === 'Clube' ? 'o clube' : 'a agência'}</p>
                <p className="mt-2 truncate text-2xl font-black uppercase italic leading-none tracking-tight text-white">{contractParty}</p>
              </div>
              <div className="flex items-center gap-3">
                {end !== null && (
                  <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] ${expired ? 'border-error/30 bg-error/10 text-error' : 'border-primary/30 bg-primary/10 text-primary'}`}>
                    {expired ? 'Encerrado' : 'Vigente'}
                  </span>
                )}
                {athlete.contractLink && (
                  <a
                    href={athlete.contractLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.03]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Abrir contrato
                  </a>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <p className={labelClass}>Início</p>
                <p className="mt-1 text-sm font-bold text-on-surface">{formatDate(athlete.contractStart) || '—'}</p>
              </div>
              <div className="text-right">
                <p className={labelClass}>Término</p>
                <p className="mt-1 text-sm font-bold text-on-surface">{formatDate(athlete.contractEnd) || '—'}</p>
              </div>
            </div>
            {progress !== null && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${expired ? 'bg-error' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        ) : (
          <div className={`${panelClass} flex items-center gap-4 px-5 py-5`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-high">
              <FileText className="h-4 w-4 text-on-surface-variant" />
            </div>
            <p className="text-sm font-bold text-on-surface-variant">Nenhum contrato cadastrado.</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <SectionTitle>Contatos</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ContactCard label="WhatsApp Atleta" phone={athlete.whatsappAthlete} />
          <ContactCard label="WhatsApp Responsável" phone={athlete.whatsappGuardian} />
        </div>

        {athlete.hasAgent && (
          <div className={`${panelClass} relative overflow-hidden p-6`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                  <BriefcaseBusiness className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className={labelClass}>Empresário · Agenciamento de carreira</p>
                  <p className="mt-1.5 truncate text-xl font-black uppercase italic leading-none tracking-tight text-white">
                    {athlete.agentCompany || 'Empresa não informada'}
                  </p>
                  <p className="mt-2 truncate text-sm font-bold text-on-surface-variant">
                    {athlete.agentName || 'Nome do empresário não informado'}
                  </p>
                </div>
              </div>
              {athlete.whatsappAgent ? (
                <a
                  href={whatsappLink(athlete.whatsappAgent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/20"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  {athlete.whatsappAgent}
                </a>
              ) : (
                <p className="text-sm font-bold text-on-surface-variant/50">WhatsApp não informado</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <SectionTitle>Outras informações</SectionTitle>
        {athlete.hasDvd ? (
          <div className={`${panelClass} flex flex-wrap items-center justify-between gap-4 px-5 py-4`}>
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-high">
                <Video className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className={labelClass}>DVD</p>
                <p className="mt-1 text-sm font-bold text-on-surface">Possui DVD</p>
              </div>
            </div>
            {athlete.dvdLink ? (
              <a
                href={athlete.dvdLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-background transition hover:scale-[1.03]"
              >
                <Video className="h-3.5 w-3.5" />
                Abrir DVD
              </a>
            ) : (
              <p className="text-sm font-bold text-on-surface-variant/50">Link não informado</p>
            )}
          </div>
        ) : (
          <div className={`${panelClass} flex items-center gap-4 px-5 py-5`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-high">
              <Video className="h-4 w-4 text-on-surface-variant" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface-variant">O atleta não possui DVD.</p>
              <p className="mt-1 text-[10px] font-black uppercase italic tracking-widest text-error">Iniciar com urgência processo de confecção.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
