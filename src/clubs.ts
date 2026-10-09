// Clubes do app: os principais do Brasil já vêm prontos (escudos em public/assets/clubs) e os demais
// são cadastrados pelos administradores na aba Clubes (tabela clubs do Supabase)
export interface Club {
  // Só os cadastrados na aba Clubes têm id
  id?: string;
  name: string;
  logo: string;
  // Clube que já vem no app (não está no banco)
  builtin?: boolean;
  // Outros nomes do mesmo clube, para o escudo aparecer também quando o nome foi escrito de outro jeito
  aliases?: string[];
  // Clube que já vem no app e foi apagado na aba Clubes: a linha no banco só serve para escondê-lo
  hidden?: boolean;
}

// Compara nomes de clube sem acento, sem diferença de maiúsculas e sem pontuação ("Atlético-MG" = "atletico mg")
export const clubKey = (name?: string) =>
  (name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const builtin = (name: string, file: string, aliases: string[] = []): Club => ({
  name,
  // Sem extensão no nome, o arquivo é PNG
  logo: `/assets/clubs/${file.includes('.') ? file : `${file}.png`}`,
  builtin: true,
  aliases,
});

export const BUILTIN_CLUBS: Club[] = [
  builtin('ABC', 'abc-rn', ['ABC-RN', 'ABC Natal']),
  builtin('Água Santa', 'agua-santa'),
  builtin('América-MG', 'america-mineiro', ['América Mineiro']),
  builtin('Athletico-PR', 'atletico-paranaense', ['Athletico Paranaense', 'Atlético Paranaense', 'Atlético-PR', 'Athletico']),
  builtin('Atlético-GO', 'atletico-goianiense', ['Atlético Goianiense']),
  builtin('Atlético-MG', 'atletico-mineiro', ['Atlético Mineiro']),
  builtin('Avaí', 'avai'),
  builtin('Bahia', 'bahia'),
  builtin('Botafogo', 'botafogo', ['Botafogo-RJ']),
  builtin('Botafogo-PB', 'botafogo-pb'),
  builtin('Botafogo-SP', 'botafogo-sp', ['Botafogo de Ribeirão Preto']),
  builtin('Brasil de Pelotas', 'brasil-de-pelotas'),
  builtin('Ceará', 'ceara'),
  builtin('Chapecoense', 'chapecoense'),
  builtin('Confiança', 'confianca-se', ['Confiança-SE']),
  builtin('Corinthians', 'corinthians', ['SC Corinthians', 'Sport Club Corinthians Paulista']),
  builtin('Coritiba', 'coritiba'),
  builtin('CRB', 'crb'),
  builtin('Cruzeiro', 'cruzeiro'),
  builtin('CSA', 'csa'),
  builtin('Cuiabá', 'cuiaba'),
  builtin('Ferroviária', 'ferroviaria'),
  builtin('Figueirense', 'figueirense'),
  builtin('Flamengo', 'flamengo'),
  builtin('Fluminense', 'fluminense'),
  builtin('Fortaleza', 'fortaleza'),
  builtin('Grêmio', 'gremio'),
  builtin('Guarani', 'guarani'),
  builtin('Internacional', 'internacional', ['Inter', 'Inter-RS']),
  builtin('Ituano', 'ituano'),
  builtin('Juventude', 'juventude'),
  builtin('Mirassol', 'mirassol'),
  builtin('Náutico', 'nautico'),
  builtin('Novorizontino', 'gremio-novorizontino', ['Grêmio Novorizontino']),
  builtin('Oeste', 'oeste'),
  builtin('Operário-PR', 'operario-pr', ['Operário', 'Operário Ferroviário']),
  builtin('Palmeiras', 'palmeiras'),
  builtin('Paraná', 'parana', ['Paraná Clube']),
  builtin('Ponte Preta', 'ponte-preta'),
  builtin('Red Bull Bragantino', 'red-bull-bragantino', ['Bragantino', 'RB Bragantino']),
  builtin('Remo', 'remo'),
  builtin('Sampaio Corrêa', 'sampaio-correa'),
  builtin('Santa Cruz', 'santa-cruz'),
  builtin('Santo André', 'santo-andre'),
  builtin('Santos', 'santos'),
  builtin('São Bernardo', 'sao-bernardo'),
  builtin('São Caetano', 'sao-caetano'),
  builtin('São Paulo', 'sao-paulo', ['São Paulo FC', 'SPFC']),
  builtin('Sport', 'sport-recife', ['Sport Recife']),
  builtin('Tombense', 'tombense'),
  builtin('Vasco', 'vasco-da-gama', ['Vasco da Gama']),
  builtin('Vitória', 'vitoria'),
  builtin('Volta Redonda', 'volta-redonda'),
  // Clubes do Estado de São Paulo
  builtin('América-SP', 'america-sp', ['América de Rio Preto']),
  builtin('Araçatuba', 'aracatuba'),
  builtin('Assisense', 'assisense'),
  builtin('Atibaia', 'atibaia'),
  builtin('Atlético Sorocaba', 'atletico-sorocaba'),
  builtin('Audax', 'audax.png?v=2', ['Grêmio Osasco Audax', 'Osasco Audax']),
  builtin('Bandeirante', 'bandeirante', ['Bandeirante de Birigui']),
  builtin('Barretos', 'barretos'),
  builtin('Batatais', 'batatais'),
  builtin('Capivariano', 'capivariano'),
  builtin('Catanduvense', 'catanduvense', ['Catanduva']),
  builtin('Comercial-SP', 'comercial-sp', ['Comercial', 'Comercial de Ribeirão Preto']),
  builtin('Desportivo Brasil', 'desportivo-brasil'),
  builtin('ECUS', 'ecus'),
  builtin('Fernandópolis', 'fernandopolis'),
  builtin('Flamengo de Guarulhos', 'flamengo-de-guarulhos', ['Flamengo-SP']),
  builtin('Francana', 'francana'),
  builtin('Grêmio Barueri', 'gremio-barueri', ['Barueri']),
  builtin('Guaratinguetá', 'guaratingueta'),
  builtin('Guarulhos', 'guarulhos'),
  builtin('Independente de Limeira', 'independente-de-limeira', ['Independente-SP']),
  builtin('Inter de Bebedouro', 'inter-de-bebedouro'),
  builtin('Inter de Limeira', 'inter-de-limeira', ['Internacional de Limeira']),
  builtin('Itapirense', 'itapirense'),
  builtin('Jabaquara', 'jabaquara'),
  builtin('José Bonifácio', 'jose-bonifacio'),
  builtin('Juventus-SP', 'juventus-sp', ['Juventus', 'Juventus da Mooca']),
  builtin('Lemense', 'lemense'),
  builtin('Marília', 'marilia'),
  builtin('Matonense', 'matonense'),
  builtin('Mauaense', 'mauaense'),
  builtin('Mogi Mirim', 'mogi-mirim'),
  builtin('Monte Azul', 'monte-azul'),
  builtin('Nacional-SP', 'nacional-sp', ['Nacional']),
  builtin('Noroeste', 'noroeste'),
  builtin('Olímpia', 'olimpia.png?v=2'),
  builtin('Osasco', 'osasco.png?v=2'),
  builtin('Penapolense', 'penapolense'),
  builtin('Portuguesa', 'portuguesa', ['Portuguesa de Desportos', 'Lusa']),
  builtin('Portuguesa Santista', 'portuguesa-santista'),
  builtin('Primavera', 'primavera', ['Primavera-SP']),
  builtin('Rio Branco-SP', 'rio-branco-sp.gif', ['Rio Branco', 'Rio Branco de Americana']),
  builtin('Rio Claro', 'rio-claro'),
  builtin('Rio Preto', 'rio-preto'),
  builtin('Santa Fé-SP', 'santa-fe-sp.png?v=2', ['Santa Fé']),
  builtin('São Bento', 'sao-bento'),
  builtin('São Carlos', 'sao-carlos'),
  builtin('São-carlense', 'sao-carlense', ['Grêmio São-carlense']),
  builtin('São José', 'sao-jose', ['São José-SP', 'São José dos Campos']),
  builtin('Sertãozinho', 'sertaozinho.png?v=2'),
  builtin('Suzano', 'suzano'),
  builtin('Tanabi', 'tanabi'),
  builtin('Taquaritinga', 'taquaritinga'),
  builtin('Taubaté', 'taubate'),
  builtin('União Barbarense', 'uniao-barbarense'),
  builtin('União Mogi', 'uniao-mogi'),
  builtin('União São João', 'uniao-sao-joao', ['União São João de Araras']),
  builtin('Velo Clube', 'velo-clube'),
  builtin('Votoraty', 'votoraty.png?v=2'),
  builtin('Votuporanguense', 'votuporanguense'),
  builtin('XV de Jaú', 'xv-de-jau'),
  builtin('XV de Piracicaba', 'xv-de-piracicaba'),
];

// Lista única de clubes, em ordem alfabética: o cadastrado na aba Clubes vale no lugar do que já vem no app com o mesmo nome
export const mergeClubs = (custom: Club[]): Club[] => {
  const byKey = new Map<string, Club>();
  BUILTIN_CLUBS.forEach((club) => byKey.set(clubKey(club.name), club));
  custom.forEach((club) => {
    const key = clubKey(club.name);
    if (club.hidden) {
      byKey.delete(key);
      return;
    }
    const base = byKey.get(key);
    // Mantém os outros nomes do clube que já vinha no app e o escudo dele quando o cadastro não tem escudo
    byKey.set(key, { ...club, logo: club.logo || base?.logo || '', aliases: base?.aliases });
  });
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
};

// Escudo pelo nome do clube, valendo também os outros nomes de cada um
export const clubLogoMap = (clubs: Club[]): Map<string, string> => {
  const logos = new Map<string, string>();
  clubs.forEach((club) => {
    if (!club.logo) return;
    (club.aliases || []).forEach((alias) => { if (!logos.has(clubKey(alias))) logos.set(clubKey(alias), club.logo); });
  });
  // O nome principal vale mais que o apelido de outro clube
  clubs.forEach((club) => { if (club.logo) logos.set(clubKey(club.name), club.logo); });
  return logos;
};

// Escudo pelo nome do clube. Sem nome igual, vale o clube cujo nome contém o procurado, ou está contido nele, em palavras inteiras
// ("Cosmopolitano" e "Cosmopolitano FC"), desde que só um clube se encaixe: com mais de um ("Atlético") fica sem escudo
export const findClubLogo = (logos: Map<string, string>, name?: string | null): string | undefined => {
  const key = clubKey(name || '');
  if (!key) return undefined;
  const exact = logos.get(key);
  if (exact) return exact;
  const near = new Set<string>();
  logos.forEach((logo, other) => {
    if (` ${other} `.includes(` ${key} `) || ` ${key} `.includes(` ${other} `)) near.add(logo);
  });
  return near.size === 1 ? [...near][0] : undefined;
};
