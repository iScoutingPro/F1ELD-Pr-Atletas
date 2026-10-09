import { Athlete, ScoutEntry, TacticalMeeting, TacticalStatus } from './types';
import { findCountry } from './countries';
import { SCOUT_FIELDS, scoutValue, sortScoutEntries } from './scout';
import { activeLoanClub, contractGoalProgress, contractTimeLeft, formatNumber } from './contract';

// Seções que o usuário pode incluir no PDF do atleta, na ordem em que saem no documento
export const PDF_SECTIONS = [
  { key: 'personal', label: 'Informações pessoais' },
  { key: 'sports', label: 'Informações esportivas' },
  { key: 'dvd', label: 'DVD' },
  { key: 'scoutTotals', label: 'Scout geral' },
  { key: 'scoutTechnical', label: 'Scout técnico' },
  { key: 'tactical', label: 'Acompanhamento tático' },
  { key: 'contract', label: 'Contrato' },
  { key: 'goals', label: 'Metas do contrato' },
  { key: 'contacts', label: 'Contatos' },
] as const;

export type PdfSectionKey = typeof PDF_SECTIONS[number]['key'];

export interface AthletePdfInput {
  athlete: Athlete;
  sections: PdfSectionKey[];
  // Lançamentos de scout do atleta
  entries: ScoutEntry[];
}

type RGB = [number, number, number];
// Imagem pronta para o PDF: PNG em data URL e a proporção largura/altura
interface PdfImage { data: string; ratio: number }
// image: bandeira ('flag') ou escudo ('crest') à direita do valor
interface Info { label: string; value?: string; url?: string; image?: PdfImage | null; imageKind?: 'flag' | 'crest' }

// Folha A4 em milímetros
const W = 210;
const H = 297;
const M = 14;
const CW = W - M * 2;
const BOTTOM = H - 20;
// Onde o conteúdo começa nas páginas seguintes, abaixo da faixa escura com o nome do atleta
const PAGE_TOP = 22;

const INK: RGB = [13, 14, 16];
const WHITE: RGB = [255, 255, 255];
const MUTED: RGB = [112, 116, 122];
const LINE: RGB = [226, 228, 231];
const SOFT: RGB = [245, 246, 247];
const HEADER_MUTED: RGB = [150, 154, 160];
const HEADER_LINE: RGB = [52, 54, 60];
const HEADER_CARD: RGB = [24, 26, 29];
// Única cor do documento: o ponto ao lado da situação (reunião e meta)
const GREEN: RGB = [22, 163, 74];
const AMBER: RGB = [217, 119, 6];
const RED: RGB = [220, 38, 38];
const STATUS_COLORS: Record<TacticalStatus, RGB> = { 'Concluída': GREEN, Agendada: AMBER, Pendente: RED };

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
// Números que existem em todo jogo (súmula); qualquer outro indica jogo com scout técnico
const SHEET_KEYS = new Set(['starter', 'bench', 'subIn', 'subOut', 'minutes', 'goals', 'yellowCards', 'redCards']);

// A fonte do PDF só tem os caracteres latinos: aspas e traços especiais são trocados e o resto (emoji etc.) sai
const clean = (value: unknown) => String(value ?? '')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[–—]/g, '-')
  .replace(/…/g, '...')
  .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
  .trim();

const formatDate = (value?: string) => {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
};

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const whatsappLink = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  // Números sem DDI (até 11 dígitos) são tratados como brasileiros
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
};

const roundText = (round?: string) => {
  const value = clean(round);
  return value && value !== '-' ? (/^\d+$/.test(value) ? `Rodada ${value}` : value) : '';
};

const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
  if (!src) return resolve(null);
  const image = new Image();
  if (!src.startsWith('data:')) image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = src;
});

// Foto do atleta recortada em círculo sobre a cor da capa; vazio quando a foto não carrega
// (link externo que não libera a leitura da imagem, por exemplo)
const circlePhoto = async (src: string) => {
  const image = await loadImage(src);
  const size = 480;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!image || !context) return '';
  canvas.width = size;
  canvas.height = size;
  // Fundo na cor da capa e saída em JPEG: a foto em PNG com transparência fazia a geração falhar no navegador
  context.fillStyle = `rgb(${INK.join(',')})`;
  context.fillRect(0, 0, size, size);
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  context.clip();
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  try {
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return '';
  }
};

// Imagem pintada de branco (o mesmo efeito de `brightness-0 invert` usado na tela), para a marca sobre o cabeçalho escuro
const whiteImage = async (src: string) => {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!image || !context || !image.naturalHeight) return null;
  const scale = Math.min(1, 600 / image.naturalWidth);
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  try {
    return { data: canvas.toDataURL('image/png'), ratio: canvas.width / canvas.height };
  } catch {
    return null;
  }
};

// Imagem (escudo do clube, bandeira) convertida em PNG, mantendo a transparência; null quando não carrega
// ou quando o endereço não libera a leitura da imagem
const rasterImage = async (src: string, maxSize = 320): Promise<PdfImage | null> => {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!image || !context || !image.naturalWidth || !image.naturalHeight) return null;
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  try {
    return { data: canvas.toDataURL('image/png'), ratio: canvas.width / canvas.height };
  } catch {
    return null;
  }
};

// Distribui itens em linhas, quebrando quando o próximo não cabe na largura
const flow = (widths: number[], maxWidth: number, gap: number) => {
  let x = 0;
  let row = 0;
  return widths.map((width) => {
    if (x > 0 && x + width > maxWidth) {
      x = 0;
      row += 1;
    }
    const position = { x, row };
    x += width + gap;
    return position;
  });
};

// Situação da reunião: a gravada ou, nas antigas, conforme a data (a de hoje ainda conta como agendada)
const meetingStatus = (meeting: TacticalMeeting, today: string): TacticalStatus => meeting.status || (meeting.date >= today ? 'Agendada' : 'Concluída');

// Monta o PDF do atleta só com as seções escolhidas. A capa (foto, nome, posição, categoria, clube,
// idade, altura, peso e pé dominante) entra sempre
export const buildAthletePdf = async ({ athlete, sections, entries }: AthletePdfInput) => {
  const { jsPDF: JsPdf } = await import('jspdf');
  const doc = new JsPdf({ unit: 'mm', format: 'a4', compress: true });
  const has = (key: PdfSectionKey) => sections.includes(key);
  const fullName = clean(`${athlete.name} ${athlete.lastName || ''}`) || 'Atleta';
  const today = todayKey();
  let y = 0;
  let sectionNumber = 0;

  const font = (size: number, style: 'normal' | 'bold' | 'bolditalic' = 'normal', color: RGB = INK) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const widthOf = (text: string, spacing = 0) => doc.getTextWidth(text) + spacing * text.length;
  // Todo texto passa por aqui: o espaçamento entre letras é sempre informado, para não vazar de um texto para o outro
  const txt = (text: string, x: number, top: number, options: { align?: 'center' | 'right'; spacing?: number } = {}) => {
    const spacing = options.spacing || 0;
    const width = widthOf(text, spacing);
    const left = options.align === 'center' ? x - width / 2 : options.align === 'right' ? x - width : x;
    doc.text(text, left, top, { charSpace: spacing });
  };
  const wrap = (text: string, maxWidth: number) => doc.splitTextToSize(text, maxWidth) as string[];
  const fit = (text: string, maxWidth: number, spacing = 0) => {
    // Folga para a conta de ponto flutuante não cortar um texto que cabe exatamente
    if (widthOf(text, spacing) <= maxWidth + 0.05) return text;
    let cut = text;
    while (cut.length > 1 && widthOf(`${cut}...`, spacing) > maxWidth) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}...`;
  };
  const label = (text: string, x: number, top: number, options: { align?: 'center' | 'right'; color?: RGB; size?: number } = {}) => {
    font(options.size || 6.5, 'bold', options.color || MUTED);
    txt(clean(text).toUpperCase(), x, top, { align: options.align, spacing: 0.25 });
  };
  const hairline = (top: number, from = M, to = W - M, color: RGB = LINE) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.2);
    doc.line(from, top, to, top);
  };
  const vline = (x: number, from: number, to: number, color: RGB = LINE) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.2);
    doc.line(x, from, x, to);
  };
  // Quadro de cantos arredondados: preenchido, só com o contorno ou os dois
  const box = (x: number, top: number, width: number, height: number, options: { fill?: RGB; stroke?: RGB; radius?: number } = {}) => {
    const radius = options.radius ?? 2.2;
    if (options.fill) doc.setFillColor(...options.fill);
    if (options.stroke) {
      doc.setDrawColor(...options.stroke);
      doc.setLineWidth(0.25);
    }
    doc.roundedRect(x, top, width, height, radius, radius, options.fill && options.stroke ? 'FD' : options.fill ? 'F' : 'S');
  };
  const dot = (x: number, top: number, color: RGB) => {
    doc.setFillColor(...color);
    doc.circle(x, top, 0.9, 'F');
  };
  const ensure = (height: number) => {
    if (y + height > BOTTOM) {
      doc.addPage();
      y = PAGE_TOP;
    }
  };

  // Título de seção: número num quadro escuro, o nome e um fio até a borda (ou até o texto da direita)
  // need: altura do primeiro bloco da seção, para o título não ficar sozinho no fim da página
  const sectionTitle = (title: string, aside?: string, need = 18) => {
    ensure(13.5 + need);
    sectionNumber += 1;
    y += 1;
    box(M, y, 7.5, 7.5, { fill: INK, radius: 1.6 });
    font(7, 'bold', WHITE);
    txt(String(sectionNumber).padStart(2, '0'), M + 3.75, y + 4.9, { align: 'center', spacing: 0.1 });
    font(12, 'bold');
    const text = title.toUpperCase();
    txt(text, M + 10.5, y + 5.4, { spacing: 0.3 });
    const titleEnd = M + 10.5 + widthOf(text, 0.3);
    let lineEnd = W - M;
    if (aside) {
      label(aside, W - M, y + 4.8, { align: 'right' });
      lineEnd -= widthOf(clean(aside).toUpperCase(), 0.25) + 3;
    }
    hairline(y + 3.75, titleEnd + 3, lineEnd);
    y += 12.5;
  };

  // Subtítulo dentro de uma seção
  const subTitle = (text: string, need = 16) => {
    ensure(6.5 + need);
    label(text, M, y + 2.6, { color: INK, size: 7 });
    font(7, 'bold');
    hairline(y + 1.6, M + widthOf(clean(text).toUpperCase(), 0.25) + 3, W - M);
    y += 6.5;
  };

  const emptyLine = (text: string) => {
    ensure(16);
    box(M, y, CW, 11, { fill: SOFT });
    font(8.5, 'normal', MUTED);
    txt(text, M + 5, y + 6.8);
    y += 17;
  };

  // Quadro com as informações em colunas: rótulo em cima e valor embaixo, com fios entre as linhas e as colunas
  const infoGrid = (items: Info[], cols = 2) => {
    const cellWidth = CW / cols;
    const rows: { items: Info[]; lines: string[][]; height: number }[] = [];
    for (let index = 0; index < items.length; index += cols) {
      const row = items.slice(index, index + cols);
      font(9.5, 'bold');
      // Com bandeira ou escudo à direita, o texto quebra antes
      const lines = row.map((item) => (item.value ? wrap(clean(item.value), cellWidth - 10 - (item.image ? 15 : 0)).slice(0, 3) : ['Não informado']));
      rows.push({ items: row, lines, height: 13.5 + (Math.max(...lines.map((item) => item.length)) - 1) * 4.2 });
    }
    const total = rows.reduce((sum, row) => sum + row.height, 0);
    ensure(total + 2);
    box(M, y, CW, total, { fill: WHITE, stroke: LINE });
    rows.forEach((row, rowIndex) => {
      if (rowIndex > 0) hairline(y);
      row.items.forEach((item, col) => {
        const x = M + col * cellWidth;
        if (col > 0) vline(x, y + 2.5, y + row.height - 2.5);
        label(item.label, x + 5, y + 5.2);
        font(9.5, item.value ? 'bold' : 'normal', item.value ? INK : MUTED);
        row.lines[col].forEach((line, lineIndex) => txt(line, x + 5, y + 10.2 + lineIndex * 4.2));
        if (item.url && item.value) doc.link(x + 5, y + 6.5, cellWidth - 10, row.lines[col].length * 4.2 + 1, { url: item.url });
        if (item.image && item.value) {
          if (item.imageKind === 'crest') crestPicture(item.image, x + cellWidth - 15, y + 2.25, 9);
          else flagPicture(item.image, x + cellWidth - 5 - 6 * item.image.ratio, y + 3.75, 6);
        }
      });
      y += row.height;
    });
    y += 8;
  };

  // Quadros com o número em cima e o nome embaixo; dark = os de destaque, escuros, com uma linha a mais embaixo
  const statBoxes = (items: { value: string; label: string; note?: string }[], cols: number, dark = false) => {
    const gap = 2;
    const boxWidth = (CW - gap * (cols - 1)) / cols;
    const boxHeight = dark ? 22 : 15;
    items.forEach((item, index) => {
      const col = index % cols;
      if (col === 0) ensure(boxHeight + gap);
      const x = M + col * (boxWidth + gap);
      box(x, y, boxWidth, boxHeight, { fill: dark ? INK : SOFT });
      if (dark) {
        label(item.label, x + 4, y + 5.4, { color: HEADER_MUTED, size: 5.8 });
        font(17, 'bold', WHITE);
        txt(item.value, x + 4, y + 13.6);
        if (item.note) {
          font(6.2, 'normal', HEADER_MUTED);
          txt(fit(item.note, boxWidth - 8), x + 4, y + 18.4);
        }
      } else {
        font(12, 'bold');
        txt(item.value, x + boxWidth / 2, y + 6.6, { align: 'center' });
        font(5.5, 'bold', MUTED);
        wrap(clean(item.label).toUpperCase(), boxWidth - 5).slice(0, 2)
          .forEach((line, lineIndex) => txt(line, x + boxWidth / 2, y + 10.2 + lineIndex * 2.4, { align: 'center', spacing: 0.1 }));
      }
      if (col === cols - 1 || index === items.length - 1) y += boxHeight + gap;
    });
    y += 4;
  };

  const progressBar = (x: number, top: number, width: number, percent: number, height = 1.8) => {
    doc.setFillColor(...LINE);
    doc.roundedRect(x, top, width, height, height / 2, height / 2, 'F');
    const filled = (width * Math.max(0, Math.min(100, percent))) / 100;
    if (filled >= height) {
      doc.setFillColor(...INK);
      doc.roundedRect(x, top, filled, height, height / 2, height / 2, 'F');
    }
  };

  // Quadro com o dia em cima e o mês e o ano embaixo
  const dateBox = (dateKey: string, top: number, filled: boolean) => {
    const [year, month, day] = dateKey.slice(0, 10).split('-');
    box(M, top, 16, 15, { fill: filled ? INK : SOFT });
    font(13, 'bold', filled ? WHITE : INK);
    txt(day || '--', M + 8, top + 7.2, { align: 'center' });
    font(5.5, 'bold', filled ? HEADER_MUTED : MUTED);
    txt(`${MONTHS[Number(month) - 1] || ''} ${year || ''}`.trim(), M + 8, top + 11.4, { align: 'center', spacing: 0.1 });
  };

  /* Capa */

  const negociado = athlete.listType === 'negociados';
  const country = findCountry(athlete.nacionalidade);
  const secondCountry = athlete.hasDualNationality ? findCountry(athlete.secondNationality) : undefined;
  // Bandeira em PNG (a do app é SVG); escudo e bandeira que não carregarem ficam de fora, sem atrapalhar o resto
  const flagOf = (alpha2?: string) => (alpha2 ? rasterImage(`https://flagcdn.com/w160/${alpha2.toLowerCase()}.png`) : Promise.resolve(null));
  // Empréstimo em vigor: o clube mostrado na capa e em "Clube atual" passa a ser o do empréstimo, com o escudo dele
  const loanClub = clean(activeLoanClub(athlete));
  const [photo, brand, ownCrest, loanCrest, flag, secondFlag] = await Promise.all([
    circlePhoto(athlete.image),
    negociado ? whiteImage('/assets/cosmopolitano.png') : Promise.resolve(null),
    athlete.clubLogo ? rasterImage(athlete.clubLogo) : Promise.resolve(null),
    athlete.onLoan && athlete.loanClubLogo ? rasterImage(athlete.loanClubLogo) : Promise.resolve(null),
    flagOf(country?.alpha2),
    flagOf(secondCountry?.alpha2),
  ]);
  const crest = loanClub ? loanCrest : ownCrest;
  // Toda imagem passa por aqui: se uma não puder ser inserida, o PDF sai sem ela em vez de falhar inteiro
  const picture = (image: PdfImage, x: number, top: number, width: number, height: number) => {
    try {
      doc.addImage(image.data, 'PNG', x, top, width, height);
    } catch (cause) {
      console.error('Erro ao inserir uma imagem no PDF do atleta:', cause);
    }
  };
  // Bandeira com um contorno fino, para a parte branca não sumir no papel
  const flagPicture = (image: PdfImage, x: number, top: number, height: number, outline: RGB = LINE) => {
    const width = height * image.ratio;
    picture(image, x, top, width, height);
    doc.setDrawColor(...outline);
    doc.setLineWidth(0.2);
    doc.rect(x, top, width, height, 'S');
  };
  // Escudo do clube num espaço quadrado, sem deformar
  const crestPicture = (image: PdfImage, x: number, top: number, size: number) => {
    const width = image.ratio >= 1 ? size : size * image.ratio;
    const height = image.ratio >= 1 ? size / image.ratio : size;
    picture(image, x + (size - width) / 2, top + (size - height) / 2, width, height);
  };

  const photoSize = 42;
  const photoTop = 22;
  const textX = M + photoSize + 10;
  // Com escudo, o nome e as etiquetas deixam o espaço dele à direita
  const crestSize = 17;
  const textWidth = W - M - textX - (crest ? crestSize + 6 : 0);

  let nameSize = 22;
  font(nameSize, 'bolditalic');
  let nameLines = wrap(fullName.toUpperCase(), textWidth);
  if (nameLines.length > 1) {
    nameSize = 17;
    font(nameSize, 'bolditalic');
    nameLines = wrap(fullName.toUpperCase(), textWidth).slice(0, 2);
  }
  const nameLineHeight = nameSize * 0.42;
  const nameY = nameLines.length > 1 ? 37 : 41;

  // Atleta emprestado ganha a etiqueta "Emprestado" depois do clube, em qualquer escolha de seções
  const tags = [athlete.position, athlete.category, loanClub || athlete.club, loanClub ? 'Emprestado' : ''].map((item) => clean(item).toUpperCase()).filter(Boolean);
  // Depois das etiquetas, na mesma linha, as bandeiras da nacionalidade e da dupla nacionalidade
  const coverFlags = [flag, secondFlag].filter((item): item is PdfImage => Boolean(item));
  const flagHeight = 6.2;
  font(7, 'bold');
  // As bandeiras entram como um bloco só, para não ficarem separadas quando a linha quebra
  const flagsWidth = coverFlags.reduce((sum, item) => sum + flagHeight * item.ratio, 0) + Math.max(0, coverFlags.length - 1) * 2;
  const tagWidths = [...tags.map((tag) => Math.min(textWidth, widthOf(tag, 0.25) + 7)), ...(coverFlags.length ? [flagsWidth] : [])];
  const tagPositions = flow(tagWidths, textWidth, 2);
  const tagRows = tagWidths.length ? tagPositions[tagPositions.length - 1].row + 1 : 0;
  const tagsY = nameY + (nameLines.length - 1) * nameLineHeight + 5;
  const stripY = Math.max(photoTop + photoSize + 9, tagsY + tagRows * 7.8 + 6);
  const stripHeight = 20;
  const headerHeight = stripY + stripHeight + 9;

  // Fundo escuro liso (em degradê apareciam faixas no leitor de PDF), com círculos finos no canto
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, headerHeight, 'F');
  doc.setDrawColor(40, 42, 47);
  doc.setLineWidth(0.25);
  [20, 31, 42].forEach((radius) => doc.circle(W - 16, 20, radius, 'S'));

  // Linha de cima: o tipo do documento à esquerda e a marca da lista à direita
  doc.setFillColor(...WHITE);
  doc.rect(M, 9.6, 1.8, 1.8, 'F');
  label('Relatório do atleta', M + 4, 11.3, { color: WHITE, size: 7 });
  label(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, M + 4, 15, { color: HEADER_MUTED, size: 5.8 });

  // Marca da lista do atleta: F1ELD para Agenciados, Cosmopolitano para Negociados
  if (brand) {
    const brandHeight = Math.min(13, 34 / brand.ratio);
    const brandWidth = brandHeight * brand.ratio;
    // Se a imagem da marca não puder ser inserida, o PDF sai sem ela em vez de falhar inteiro
    try {
      doc.addImage(brand.data, 'PNG', W - M - brandWidth, 7, brandWidth, brandHeight);
    } catch (cause) {
      console.error('Erro ao inserir a marca no PDF do atleta:', cause);
    }
  } else if (!negociado) {
    const brandWidth = 25;
    const brandHeight = 8.9;
    doc.setDrawColor(...WHITE);
    doc.setLineWidth(0.8);
    doc.roundedRect(W - M - brandWidth, 8, brandWidth, brandHeight, 0.4, 0.4, 'S');
    font(15, 'bolditalic', WHITE);
    txt('F1ELD', W - M - brandWidth / 2, 8 + brandHeight / 2 + 1.9, { align: 'center' });
  }

  // Foto (ou as iniciais, quando não há foto que possa ser lida), com dois aros
  const photoCenterX = M + photoSize / 2;
  const photoCenterY = photoTop + photoSize / 2;
  // Foto que não puder ser inserida cai nas iniciais, em vez de o PDF falhar inteiro
  let photoDrawn = false;
  if (photo) {
    try {
      doc.addImage(photo, 'JPEG', M, photoTop, photoSize, photoSize);
      photoDrawn = true;
    } catch (cause) {
      console.error('Erro ao inserir a foto no PDF do atleta:', cause);
    }
  }
  if (!photoDrawn) {
    doc.setFillColor(40, 42, 47);
    doc.circle(photoCenterX, photoCenterY, photoSize / 2, 'F');
    font(20, 'bold', WHITE);
    const initials = fullName.split(/\s+/).filter(Boolean);
    txt(`${initials[0]?.[0] || ''}${initials.length > 1 ? initials[initials.length - 1][0] : ''}`.toUpperCase(), photoCenterX, photoCenterY + 2.6, { align: 'center' });
  }
  doc.setDrawColor(...WHITE);
  doc.setLineWidth(0.6);
  doc.circle(photoCenterX, photoCenterY, photoSize / 2 + 0.2, 'S');
  doc.setDrawColor(...HEADER_LINE);
  doc.setLineWidth(0.25);
  doc.circle(photoCenterX, photoCenterY, photoSize / 2 + 2.4, 'S');

  // Emprestado: a linha acima do nome diz de que clube ele veio
  const kindText = `${negociado ? 'Atleta negociado' : 'Atleta agenciado'}${loanClub && clean(athlete.club) ? ` · Emprestado pelo ${clean(athlete.club)}` : ''}`.toUpperCase();
  font(6.5, 'bold', HEADER_MUTED);
  txt(fit(kindText, textWidth, 0.25), textX, nameY - nameLineHeight - 0.5, { spacing: 0.25 });
  font(nameSize, 'bolditalic', WHITE);
  nameLines.forEach((line, index) => txt(line, textX, nameY + index * nameLineHeight));

  tags.forEach((tag, index) => {
    const x = textX + tagPositions[index].x;
    const top = tagsY + tagPositions[index].row * 7.8;
    // Em branco cheio: a posição e a etiqueta "Emprestado"
    const primary = (index === 0 && Boolean(clean(athlete.position))) || (Boolean(loanClub) && index === tags.length - 1);
    if (primary) {
      doc.setFillColor(...WHITE);
      doc.roundedRect(x, top, tagWidths[index], 6.2, 3.1, 3.1, 'F');
    } else {
      doc.setDrawColor(88, 91, 98);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, top, tagWidths[index], 6.2, 3.1, 3.1, 'S');
    }
    font(7, 'bold', primary ? INK : WHITE);
    txt(fit(tag, tagWidths[index] - 7, 0.25), x + 3.5, top + 4.2, { spacing: 0.25 });
  });
  let flagX = coverFlags.length ? textX + tagPositions[tags.length].x : 0;
  coverFlags.forEach((item) => {
    flagPicture(item, flagX, tagsY + tagPositions[tags.length].row * 7.8, flagHeight, HEADER_LINE);
    flagX += flagHeight * item.ratio + 2;
  });
  // Escudo do clube à direita do nome
  if (crest) crestPicture(crest, W - M - crestSize, nameY - nameLineHeight - 3, crestSize);

  // Faixa de destaque: idade, altura, peso e pé dominante
  box(M, stripY, CW, stripHeight, { fill: HEADER_CARD, stroke: HEADER_LINE, radius: 2.6 });
  [
    { label: 'Idade', value: athlete.age ? String(athlete.age) : '', unit: 'anos' },
    { label: 'Altura', value: athlete.height ? (athlete.height / 100).toFixed(2).replace('.', ',') : '', unit: 'm' },
    { label: 'Peso', value: athlete.weight ? String(athlete.weight).replace('.', ',') : '', unit: 'kg' },
    { label: 'Pé dominante', value: clean(athlete.preferredFoot), unit: '' },
  ].forEach((item, index) => {
    const x = M + (index * CW) / 4;
    if (index > 0) vline(x, stripY + 4, stripY + stripHeight - 4, HEADER_LINE);
    label(item.label, x + 6, stripY + 7, { color: HEADER_MUTED });
    font(15, 'bold', item.value ? WHITE : HEADER_MUTED);
    const value = item.value || '-';
    txt(value, x + 6, stripY + 14.8);
    if (item.value && item.unit) {
      const valueWidth = widthOf(value);
      font(6.5, 'bold', HEADER_MUTED);
      txt(item.unit.toUpperCase(), x + 6 + valueWidth + 1.4, stripY + 14.8, { spacing: 0.2 });
    }
  });

  y = headerHeight + 10;

  /* Seções */

  if (has('personal')) {
    sectionTitle('Informações pessoais');
    infoGrid([
      { label: 'Nome completo', value: fullName },
      { label: 'Data de nascimento', value: formatDate(athlete.birthDate) },
      { label: 'Nacionalidade', value: country ? `${country.code} · ${country.name}` : athlete.nacionalidade, image: flag },
      { label: 'Dupla nacionalidade', value: athlete.hasDualNationality ? (secondCountry ? `${secondCountry.code} · ${secondCountry.name}` : athlete.secondNationality || 'Sim') : 'Não possui', image: secondFlag },
      { label: 'Cidade/Estado', value: athlete.naturalidade },
    ]);
  }

  if (has('sports')) {
    sectionTitle('Informações esportivas');
    infoGrid([
      { label: 'Clube atual', value: loanClub ? `${loanClub} (empréstimo)` : athlete.club, image: crest, imageKind: 'crest' },
      ...(loanClub ? [{ label: 'Clube do contrato', value: athlete.club }] : []),
      { label: 'Categoria', value: athlete.category },
      { label: 'Posição principal', value: athlete.position },
      { label: 'Posição secundária', value: athlete.secondaryPosition },
    ]);
  }

  if (has('dvd')) {
    sectionTitle('DVD');
    if (athlete.hasDvd && athlete.dvdLink) {
      // Quadro escuro com o link e o botão: o quadro inteiro abre o DVD
      ensure(22);
      box(M, y, CW, 17, { fill: INK, radius: 2.6 });
      const buttonWidth = 30;
      label('Material do atleta', M + 6, y + 6.6, { color: HEADER_MUTED });
      font(9, 'bold', WHITE);
      txt(fit(clean(athlete.dvdLink), CW - buttonWidth - 20), M + 6, y + 12);
      doc.setFillColor(...WHITE);
      doc.roundedRect(W - M - buttonWidth - 5, y + 4.8, buttonWidth, 7.4, 3.7, 3.7, 'F');
      label('Abrir DVD', W - M - 5 - buttonWidth / 2, y + 9.5, { align: 'center', color: INK });
      doc.link(M, y, CW, 17, { url: athlete.dvdLink });
      y += 25;
    } else {
      emptyLine(athlete.hasDvd ? 'O atleta possui DVD, mas o link não foi informado.' : 'O atleta não possui DVD.');
    }
  }

  const sorted = sortScoutEntries(entries);
  const gamesCount = `${sorted.length} ${sorted.length === 1 ? 'jogo' : 'jogos'}`;

  // Soma de cada número lançado; totais e percentuais são calculados sobre essa soma
  const totals: Record<string, number> = {};
  sorted.forEach((entry) => Object.entries(entry.stats).forEach(([key, value]) => { totals[key] = (totals[key] || 0) + value; }));
  const fieldOf = (key: string) => SCOUT_FIELDS.find((field) => field.key === key)!;
  const value = (key: string) => scoutValue(fieldOf(key), totals) || 0;
  const number = (amount: number, digits = 0) => amount.toLocaleString('pt-BR', { maximumFractionDigits: digits });
  // Jogos com algum número além dos da súmula (jogos com scout técnico)
  const technicalGames = sorted.filter((entry) => Object.keys(entry.stats).some((key) => !SHEET_KEYS.has(key))).length;

  // Scout geral: o que existe em todo jogo
  if (has('scoutTotals')) {
    sectionTitle('Scout geral', sorted.length ? gamesCount : undefined, sorted.length ? 44 : 18);
    if (sorted.length === 0) {
      emptyLine('Nenhum número de scout cadastrado para este atleta.');
    } else {
      const games = sorted.length;
      const share = (key: string) => `${Math.round((value(key) / games) * 100)}% dos jogos`;
      const average = (key: string, digits: number) => `Média de ${number(value(key) / games, digits)} por jogo`;

      statBoxes([
        { label: 'Jogos relacionados', value: number(games) },
        { label: 'Minutagem', value: number(value('minutes')), note: average('minutes', 0) },
        { label: 'Titular', value: number(value('starter')), note: share('starter') },
        { label: 'Reserva', value: number(value('bench')), note: share('bench') },
        { label: 'Gols', value: number(value('goals')), note: average('goals', 2) },
      ], 5, true);
      y -= 4;
      statBoxes(['subIn', 'subOut', 'yellowCards', 'redCards'].map((key) => ({ value: number(value(key)), label: fieldOf(key).label })), 4);
      y += 3;
    }
  }

  // Scout técnico: os números dos jogos com transmissão
  if (has('scoutTechnical')) {
    sectionTitle('Scout técnico', technicalGames ? `${technicalGames} de ${gamesCount}` : undefined, technicalGames ? 60 : 18);
    if (technicalGames === 0) {
      emptyLine('Nenhum jogo com scout técnico lançado para este atleta.');
    } else {
      {
        const rates = [
          { label: 'Ações', ok: value('actionsOk'), total: value('actionsTotal') },
          { label: 'Passes', ok: value('passesCompleted'), total: value('passesTotal') },
          { label: 'Passes longos', ok: value('longPassesCompleted'), total: value('longPassesTotal') },
          { label: 'Finalizações', ok: value('shotsOnTarget'), total: value('shotsTotal') },
          { label: 'Cruzamentos', ok: value('crossesCompleted'), total: value('crossesTotal') },
          { label: 'Dribles', ok: value('dribblesCompleted'), total: value('dribblesTotal') },
          { label: 'Desarmes', ok: value('tackles'), total: value('tackles') + value('tacklesIncomplete') },
          { label: 'Duelos aéreos ofensivos', ok: value('aerialOffWon'), total: value('aerialOffWon') + value('aerialOffLost') },
          { label: 'Duelos aéreos defensivos', ok: value('aerialDefWon'), total: value('aerialDefWon') + value('aerialDefLost') },
        ];
        // Aproveitamento em duas colunas: nome, acertos sobre o total, o percentual e a barra
        const colGap = 10;
        const colWidth = (CW - colGap) / 2;
        const rowHeight = 10.5;
        const rowCount = Math.ceil(rates.length / 2);
        ensure(8 + rowCount * rowHeight + 4);
        subTitle('Aproveitamento');
        rates.forEach((rate, index) => {
          const x = M + (index % 2) * (colWidth + colGap);
          const top = y + Math.floor(index / 2) * rowHeight;
          const percent = rate.total ? Math.round((rate.ok / rate.total) * 100) : undefined;
          font(8, 'bold');
          txt(rate.label.toUpperCase(), x, top + 3.4, { spacing: 0.15 });
          font(9, 'bold', percent === undefined ? MUTED : INK);
          const percentText = percent === undefined ? '-' : `${percent}%`;
          txt(percentText, x + colWidth, top + 3.4, { align: 'right' });
          if (percent !== undefined) {
            const percentWidth = widthOf(percentText);
            font(7, 'normal', MUTED);
            txt(`${number(rate.ok)} de ${number(rate.total)}`, x + colWidth - percentWidth - 2.5, top + 3.4, { align: 'right' });
          }
          progressBar(x, top + 5.4, colWidth, percent || 0, 1.6);
        });
        y += rowCount * rowHeight + 4;

        subTitle('Outros números');
        statBoxes([
          { key: 'assists', label: 'Assistência' },
          { key: 'preAssists', label: 'Pré assistência' },
          { key: 'goalParticipations', label: 'Part. em gol' },
          { key: 'interceptions', label: 'Interceptações' },
          { key: 'dribbledPast', label: 'Dribles sofridos' },
          { key: 'ballLosses', label: 'Perda da bola' },
          { key: 'foulsCommitted', label: 'Faltas cometidas' },
          { key: 'foulsSuffered', label: 'Faltas sofridas' },
          { key: 'offsides', label: 'Impedimentos' },
          { key: 'actionsOk', label: 'Ações bem sucedidas' },
          { key: 'actionsBad', label: 'Ações mal sucedidas' },
          { key: 'actionsTotal', label: 'Ações totais' },
        ].map((item) => ({ value: number(value(item.key)), label: item.label })), 6);
      }
      y += 3;
    }
  }

  if (has('tactical')) {
    const meetings = athlete.tacticalMeetings || [];
    const order = (meeting: TacticalMeeting) => `${meeting.date} ${meeting.time || ''}`;
    const byStatus = (status: TacticalStatus) => meetings.filter((meeting) => meetingStatus(meeting, today) === status);
    const upcoming = byStatus('Agendada').sort((a, b) => order(a).localeCompare(order(b)));
    const pending = byStatus('Pendente').sort((a, b) => order(a).localeCompare(order(b)));
    const done = byStatus('Concluída').sort((a, b) => order(b).localeCompare(order(a)));
    const materials = meetings.reduce((total, meeting) => total + meeting.materials.length, 0);

    sectionTitle('Acompanhamento tático', meetings.length ? `${meetings.length} ${meetings.length === 1 ? 'reunião' : 'reuniões'}` : undefined, 22);
    if (meetings.length === 0) {
      emptyLine('Nenhuma reunião cadastrada para este atleta.');
    } else {
      statBoxes([
        { value: String(done.length), label: 'Concluídas' },
        { value: String(upcoming.length), label: 'Agendadas' },
        { value: String(pending.length), label: 'Pendentes' },
        { value: String(materials), label: 'Materiais enviados' },
      ], 4);

      [{ title: 'Próximas reuniões', list: upcoming }, { title: 'Reuniões pendentes', list: pending }, { title: 'Reuniões concluídas', list: done }].forEach(({ title, list }) => {
        if (list.length === 0) return;
        subTitle(title, 30);
        list.forEach((meeting) => {
          const x = M + 21;
          const width = CW - 21;
          const status = meetingStatus(meeting, today);
          const types = (meeting.types || []).map(clean).filter(Boolean);
          // Título: os tipos da reunião; reunião sem tipo (as antigas) usa o conteúdo
          const headline = types.length ? types.join(' · ') : clean(meeting.title);
          const content = clean(meeting.title) !== headline ? clean(meeting.title) : '';
          // Cada parte do cartão: a altura que ocupa e o desenho, para saber a altura toda antes de desenhar
          const parts: { height: number; draw: (top: number) => void }[] = [];

          const weekday = new Date(`${meeting.date.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' });
          const meta = [status, weekday === 'Invalid Date' ? '' : weekday, meeting.time ? meeting.time.replace(':', 'h') : '', meeting.duration ? `${meeting.duration} min` : ''].filter(Boolean).join(' · ');
          parts.push({ height: 5, draw: (top) => {
            dot(x + 0.9, top + 2.2, STATUS_COLORS[status]);
            label(meta, x + 3.2, top + 3.1);
          } });

          font(10.5, 'bold');
          wrap(headline.toUpperCase(), width).slice(0, 2).forEach((line) => parts.push({ height: 4.7, draw: (top) => {
            font(10.5, 'bold');
            txt(line, x, top + 3.7);
          } }));

          const matchDate = formatDate(meeting.matchDate);
          const match = [
            clean(meeting.match),
            clean(meeting.competition),
            roundText(meeting.round),
            [matchDate, meeting.matchTime ? `às ${meeting.matchTime.replace(':', 'h')}` : ''].filter(Boolean).join(' '),
          ].filter(Boolean).join(' · ');
          const analysts = (meeting.analysts || []).map(clean).filter(Boolean);
          const facts = [
            { name: 'Partida', value: match },
            { name: analysts.length > 1 ? 'Analistas' : 'Analista', value: analysts.join(', ') },
          ].filter((item) => item.value);
          facts.forEach((fact) => parts.push({ height: 4.3, draw: (top) => {
            label(fact.name, x, top + 3.1);
            const nameWidth = widthOf(fact.name.toUpperCase(), 0.25) + 2.5;
            font(8, 'bold');
            txt(fit(fact.value, width - nameWidth), x + nameWidth, top + 3.1);
          } }));

          [{ name: 'Conteúdo abordado', text: content, max: 6 }, { name: 'Observações', text: clean(meeting.notes), max: 8 }].forEach((item) => {
            if (!item.text) return;
            font(8, 'normal');
            const lines = wrap(item.text, width - 4).slice(0, item.max);
            const blockHeight = 5 + lines.length * 3.8 + 1.6;
            parts.push({ height: blockHeight + 1.4, draw: (top) => {
              doc.setFillColor(...LINE);
              doc.rect(x, top + 1.4, 0.7, blockHeight - 1.4, 'F');
              label(item.name, x + 3, top + 4);
              font(8, 'normal', [70, 74, 80]);
              lines.forEach((line, lineIndex) => txt(line, x + 3, top + 8.2 + lineIndex * 3.8));
            } });
          });

          const videoCount = meeting.materials.filter((item) => item.type === 'video').length;
          const pdfCount = meeting.materials.length - videoCount;
          let videoIndex = 0;
          let pdfIndex = 0;
          meeting.materials.forEach((material) => {
            const video = material.type === 'video';
            const position = video ? (videoIndex += 1) : (pdfIndex += 1);
            const kind = video ? 'VÍDEO' : 'PDF';
            // Material sem nome é numerado quando há mais de um do mesmo tipo
            const title = clean(material.title);
            const generic = !title || title.toUpperCase() === kind;
            const name = generic ? `Abrir ${video ? 'vídeo' : 'PDF'}${(video ? videoCount : pdfCount) > 1 ? ` ${position}` : ''}` : title;
            parts.push({ height: 5.6, draw: (top) => {
              font(6.2, 'bold', WHITE);
              const kindWidth = widthOf(kind, 0.25) + 4;
              box(x, top + 0.8, kindWidth, 4, { fill: INK, radius: 2 });
              txt(kind, x + 2, top + 3.6, { spacing: 0.25 });
              font(8, 'bold');
              const text = fit(name, width - kindWidth - 3);
              txt(text, x + kindWidth + 2, top + 3.7);
              const textWidthNow = widthOf(text);
              doc.setDrawColor(...INK);
              doc.setLineWidth(0.15);
              doc.line(x + kindWidth + 2, top + 4.4, x + kindWidth + 2 + textWidthNow, top + 4.4);
              if (/^https?:\/\//i.test(material.url)) doc.link(x, top + 0.5, kindWidth + 2 + textWidthNow, 4.6, { url: material.url });
            } });
          });

          const height = Math.max(17, parts.reduce((sum, part) => sum + part.height, 0) + 2);
          ensure(height + 3);
          dateBox(meeting.date, y, status === 'Agendada');
          let top = y;
          parts.forEach((part) => {
            part.draw(top);
            top += part.height;
          });
          hairline(y + height);
          y += height + 3;
        });
        y += 3;
      });
      y += 2;
    }
  }

  if (has('contract')) {
    const end = formatDate(athlete.contractEnd);
    const startTime = athlete.contractStart ? new Date(`${athlete.contractStart.slice(0, 10)}T00:00:00`).getTime() : NaN;
    const endTime = athlete.contractEnd ? new Date(`${athlete.contractEnd.slice(0, 10)}T00:00:00`).getTime() : NaN;
    const now = new Date(`${today}T00:00:00`).getTime();
    // Empréstimo cadastrado (em vigor, agendado ou encerrado): entra na seção do contrato, como no perfil
    const hasLoan = Boolean(athlete.onLoan && clean(athlete.loanClub));
    const hasContract = Boolean(athlete.contractLevel || athlete.contractStart || athlete.contractEnd || athlete.contractLink || athlete.contractFile || hasLoan);

    // O quadro do contrato e a barra da vigência ficam na mesma página
    if (hasContract) ensure(72);
    sectionTitle('Contrato');
    if (!hasContract) {
      emptyLine('Nenhuma informação de contrato cadastrada para este atleta.');
    } else {
      // Com quem é o contrato, como no perfil: em Negociados (e nos contratos de clube) o clube; nos demais, a Field
      const clubContract = athlete.contractType === 'Clube' || negociado;
      const contractParty = clubContract ? clean(athlete.contractClub) || clean(athlete.club) : 'Field';
      infoGrid([
        // O escudo gravado é o do clube cadastrado: só aparece quando o contrato é com ele
        { label: clubContract ? 'Contrato com o clube' : 'Contrato com a agência', value: contractParty, image: clubContract && contractParty === clean(athlete.club) ? ownCrest : null, imageKind: 'crest' },
        { label: 'Tipo de contrato', value: athlete.contractLevel },
      ]);
      y -= 5;
      infoGrid([
        { label: 'Início', value: formatDate(athlete.contractStart) },
        { label: 'Término', value: end },
        { label: 'Situação', value: contractTimeLeft(athlete.contractEnd, today)?.text || '' },
      ], 3);
      if (!Number.isNaN(startTime) && !Number.isNaN(endTime) && endTime > startTime) {
        const elapsed = Math.max(0, Math.min(100, Math.round(((now - startTime) / (endTime - startTime)) * 100)));
        y -= 5;
        box(M, y, CW, 13, { fill: SOFT });
        label('Vigência do contrato', M + 5, y + 5.4);
        label(`${elapsed}%`, W - M - 5, y + 5.4, { align: 'right', color: INK, size: 7.5 });
        progressBar(M + 5, y + 8, CW - 10, elapsed, 2);
        y += 21;
      }
      if (hasLoan) {
        const loanLeft = contractTimeLeft(athlete.loanEnd, today);
        const loanStartKey = athlete.loanStart?.slice(0, 10) || '';
        // Mesmas situações do perfil: encerrado, agendado (ainda não começou) ou em empréstimo, com quanto falta
        const situation = loanLeft?.expired
          ? 'Empréstimo encerrado'
          : loanStartKey && loanStartKey > today
            ? 'Empréstimo agendado'
            : loanLeft ? `Em empréstimo · ${loanLeft.text}` : 'Em empréstimo';
        subTitle('Empréstimo', 16);
        infoGrid([
          { label: 'Emprestado ao clube', value: athlete.loanClub, image: loanCrest, imageKind: 'crest' },
          { label: 'Situação', value: situation },
          { label: 'Início', value: formatDate(athlete.loanStart) },
          { label: 'Término', value: formatDate(athlete.loanEnd) },
        ]);
      }
    }
  }

  if (has('goals')) {
    const progress = contractGoalProgress(athlete, entries);
    const doneCount = progress.filter((item) => item.status === 'done').length;
    sectionTitle('Metas do contrato', progress.length ? `${doneCount} de ${progress.length} ${doneCount === 1 ? 'batida' : 'batidas'}` : undefined, 28);
    if (progress.length === 0) emptyLine('Nenhuma meta cadastrada para este contrato.');
    progress.forEach(({ goal, value, percent, remaining, status, isPercent }) => {
      const height = 25;
      ensure(height + 3);
      box(M, y, CW, height, { fill: WHITE, stroke: status === 'done' ? INK : LINE });
      const field = SCOUT_FIELDS.find((item) => item.key === goal.metric);
      font(15, 'bold');
      const percentText = `${percent}%`;
      const percentWidth = widthOf(percentText);
      txt(percentText, W - M - 5, y + 8.6, { align: 'right' });
      font(10, 'bold');
      txt(fit(clean(goal.title).toUpperCase(), CW - percentWidth - 16), M + 5, y + 7);
      label(field ? `Scout · ${field.label}` : 'Acompanhamento manual', M + 5, y + 11.4);
      font(7.5, 'bold', MUTED);
      txt(`${formatNumber(value, isPercent)} de ${formatNumber(goal.target, isPercent)}`, W - M - 5, y + 12.6, { align: 'right' });
      progressBar(M + 5, y + 14.8, CW - 10, percent, 2);
      const message = status === 'done'
        ? `Meta batida. ${value > goal.target ? `Objetivo superado em ${formatNumber(value - goal.target, isPercent)}.` : 'Objetivo do contrato atingido.'}`
        : status === 'near'
          ? `Chegando perto da meta: faltam ${formatNumber(remaining, isPercent)}.`
          : `Em andamento: faltam ${formatNumber(remaining, isPercent)} para a meta.`;
      dot(M + 5.9, y + 20.4, status === 'done' ? GREEN : status === 'near' ? AMBER : MUTED);
      font(8, status === 'done' ? 'bold' : 'normal', status === 'done' ? INK : MUTED);
      txt(message, M + 8.4, y + 21.2);
      y += height + 3;
    });
    if (progress.length) y += 5;
  }

  if (has('contacts')) {
    // Mesma regra do perfil: em Negociados o empresário aparece quando há algum dado; em Agenciados, só para quem já tem empresário
    const showAgent = negociado ? Boolean(athlete.agentCompany || athlete.agentName || athlete.whatsappAgent) : Boolean(athlete.hasAgent);
    const phone = (text: string, value?: string): Info => ({ label: text, value, url: value ? whatsappLink(value) : undefined });
    sectionTitle('Contatos');
    infoGrid([
      phone('WhatsApp atleta', athlete.whatsappAthlete),
      phone('WhatsApp responsável', athlete.whatsappGuardian),
      ...(showAgent ? [
        { label: 'Empresa do empresário', value: athlete.agentCompany },
        { label: 'Nome do empresário', value: athlete.agentName },
        phone('WhatsApp empresário', athlete.whatsappAgent),
      ] : []),
    ]);
  }

  /* Faixa de cima (da segunda página em diante) e rodapé de todas as páginas */

  const pages = doc.getNumberOfPages();
  const generated = new Date().toLocaleDateString('pt-BR');
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    if (page > 1) {
      doc.setFillColor(...INK);
      doc.rect(0, 0, W, 12, 'F');
      doc.setFillColor(...WHITE);
      doc.rect(M, 5.1, 1.8, 1.8, 'F');
      label(fullName, M + 4, 6.9, { color: WHITE, size: 7 });
      label('Relatório do atleta', W - M, 6.9, { align: 'right', color: HEADER_MUTED });
    }
    hairline(H - 13);
    label(`${fullName} · Relatório gerado em ${generated}`, M, H - 8.2);
    const pageText = `${page} / ${pages}`;
    font(6.5, 'bold');
    const pageWidth = widthOf(pageText, 0.25) + 6;
    box(W - M - pageWidth, H - 11.2, pageWidth, 5, { fill: INK, radius: 2.5 });
    label(pageText, W - M - pageWidth / 2, H - 7.7, { align: 'center', color: WHITE });
  }

  const fileName = `${fullName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ')} - Relatório.pdf`;
  return { blob: doc.output('blob'), fileName, pages };
};
