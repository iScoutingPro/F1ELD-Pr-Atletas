import { Athlete, Game, ScoutEntry } from './types';
import { findCountry } from './countries';
import { SCOUT_FIELDS, formatScoutValue, scoutValue, sortScoutEntries } from './scout';
import { contractGoalProgress, formatNumber } from './contract';

// Seções que o usuário pode incluir no PDF do atleta, na ordem em que saem no documento
export const PDF_SECTIONS = [
  { key: 'personal', label: 'Informações pessoais' },
  { key: 'sports', label: 'Informações esportivas' },
  { key: 'dvd', label: 'DVD' },
  { key: 'scoutTotals', label: 'Scout' },
  { key: 'scoutGames', label: 'Scout por jogo' },
  { key: 'games', label: 'Próximos jogos' },
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
  games: Game[];
}

type RGB = [number, number, number];
interface Info { label: string; value?: string; url?: string }

// Folha A4 em milímetros
const W = 210;
const H = 297;
const M = 14;
const CW = W - M * 2;
const BOTTOM = H - 18;

const INK: RGB = [13, 14, 16];
const WHITE: RGB = [255, 255, 255];
const MUTED: RGB = [112, 116, 122];
const LINE: RGB = [226, 228, 231];
const SOFT: RGB = [245, 246, 247];
const HEADER_MUTED: RGB = [150, 154, 160];
const HEADER_LINE: RGB = [48, 50, 55];

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

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

const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
  if (!src) return resolve(null);
  const image = new Image();
  if (!src.startsWith('data:')) image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = src;
});

// Foto do atleta recortada em círculo sobre a cor do cabeçalho; vazio quando a foto não carrega
// (link externo que não libera a leitura da imagem, por exemplo)
const circlePhoto = async (src: string) => {
  const image = await loadImage(src);
  const size = 480;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!image || !context) return '';
  canvas.width = size;
  canvas.height = size;
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
    return canvas.toDataURL('image/jpeg', 0.9);
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

// Monta o PDF do atleta só com as seções escolhidas. O cabeçalho (foto, nome, posição, categoria, clube,
// idade, altura, peso e pé dominante) entra sempre
export const buildAthletePdf = async ({ athlete, sections, entries, games }: AthletePdfInput) => {
  const { jsPDF: JsPdf } = await import('jspdf');
  const doc = new JsPdf({ unit: 'mm', format: 'a4' });
  const has = (key: PdfSectionKey) => sections.includes(key);
  const fullName = clean(`${athlete.name} ${athlete.lastName || ''}`) || 'Atleta';
  const today = todayKey();
  let y = 0;

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
    if (widthOf(text, spacing) <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && widthOf(`${cut}...`, spacing) > maxWidth) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}...`;
  };
  const label = (text: string, x: number, top: number, options: { align?: 'center' | 'right'; color?: RGB } = {}) => {
    font(6.5, 'bold', options.color || MUTED);
    txt(clean(text).toUpperCase(), x, top, { align: options.align, spacing: 0.25 });
  };
  const hairline = (top: number, from = M, to = W - M, color: RGB = LINE) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.2);
    doc.line(from, top, to, top);
  };
  const ensure = (height: number) => {
    if (y + height > BOTTOM) {
      doc.addPage();
      y = 18;
    }
  };

  const sectionTitle = (title: string, aside?: string) => {
    ensure(26);
    y += 2;
    doc.setFillColor(...INK);
    doc.rect(M, y, 1, 5, 'F');
    font(11, 'bold');
    const text = title.toUpperCase();
    txt(text, M + 3.5, y + 4.1, { spacing: 0.2 });
    let lineEnd = W - M;
    if (aside) {
      label(aside, W - M, y + 3.6, { align: 'right' });
      lineEnd -= widthOf(clean(aside).toUpperCase(), 0.25) + 3;
    }
    font(11, 'bold');
    hairline(y + 2.6, M + 3.5 + widthOf(text, 0.2) + 3, lineEnd);
    y += 9.5;
  };

  const emptyLine = (text: string) => {
    font(9, 'normal', MUTED);
    txt(text, M, y + 4);
    y += 12;
  };

  // Rótulo em cima e valor embaixo, em colunas, com um fio entre as linhas
  const infoGrid = (items: Info[], cols = 2) => {
    const cellWidth = CW / cols;
    for (let index = 0; index < items.length; index += cols) {
      const row = items.slice(index, index + cols);
      font(9.5, 'bold');
      const lines = row.map((item) => (item.value ? wrap(clean(item.value), cellWidth - 6).slice(0, 3) : ['Não informado']));
      const rowHeight = 11.5 + (Math.max(...lines.map((item) => item.length)) - 1) * 4.2;
      ensure(rowHeight + 1.5);
      row.forEach((item, col) => {
        const x = M + col * cellWidth;
        label(item.label, x, y + 4);
        font(9.5, item.value ? 'bold' : 'normal', item.value ? INK : MUTED);
        lines[col].forEach((line, lineIndex) => txt(line, x, y + 8.8 + lineIndex * 4.2));
        if (item.url && item.value) doc.link(x, y + 5, cellWidth - 6, lines[col].length * 4.2 + 1, { url: item.url });
      });
      hairline(y + rowHeight);
      y += rowHeight + 1.5;
    }
    y += 5;
  };

  // Quadros com o número em cima e o nome embaixo
  const statBoxes = (items: { value: string; label: string }[], cols: number) => {
    const gap = 2;
    const boxWidth = (CW - gap * (cols - 1)) / cols;
    const boxHeight = 15;
    items.forEach((item, index) => {
      const col = index % cols;
      if (col === 0) ensure(boxHeight + gap);
      const x = M + col * (boxWidth + gap);
      doc.setFillColor(...SOFT);
      doc.roundedRect(x, y, boxWidth, boxHeight, 1.5, 1.5, 'F');
      font(12, 'bold');
      txt(item.value, x + boxWidth / 2, y + 6.6, { align: 'center' });
      font(5.5, 'bold', MUTED);
      wrap(clean(item.label).toUpperCase(), boxWidth - 5).slice(0, 2)
        .forEach((line, lineIndex) => txt(line, x + boxWidth / 2, y + 10.2 + lineIndex * 2.4, { align: 'center', spacing: 0.1 }));
      if (col === cols - 1 || index === items.length - 1) y += boxHeight + gap;
    });
    y += 5;
  };

  const progressBar = (x: number, top: number, width: number, percent: number) => {
    doc.setFillColor(...LINE);
    doc.roundedRect(x, top, width, 1.8, 0.9, 0.9, 'F');
    const filled = (width * Math.max(0, Math.min(100, percent))) / 100;
    if (filled >= 1.8) {
      doc.setFillColor(...INK);
      doc.roundedRect(x, top, filled, 1.8, 0.9, 0.9, 'F');
    }
  };

  // Quadro com o dia em cima e o mês e o ano embaixo
  const dateBox = (dateKey: string, top: number, filled: boolean) => {
    const [year, month, day] = dateKey.slice(0, 10).split('-');
    doc.setFillColor(...(filled ? INK : SOFT));
    doc.roundedRect(M, top, 16, 14, 1.5, 1.5, 'F');
    font(12, 'bold', filled ? WHITE : INK);
    txt(day || '--', M + 8, top + 6.6, { align: 'center' });
    font(5.5, 'bold', filled ? HEADER_MUTED : MUTED);
    txt(`${MONTHS[Number(month) - 1] || ''} ${year || ''}`.trim(), M + 8, top + 10.6, { align: 'center', spacing: 0.1 });
  };

  /* Cabeçalho */

  const negociado = athlete.listType === 'negociados';
  const [photo, brand] = await Promise.all([
    circlePhoto(athlete.image),
    negociado ? whiteImage('/assets/cosmopolitano.png') : Promise.resolve(null),
  ]);

  const photoSize = 36;
  const textX = M + photoSize + 8;
  const textWidth = W - M - textX;

  let nameSize = 20;
  font(nameSize, 'bolditalic');
  let nameLines = wrap(fullName.toUpperCase(), textWidth);
  if (nameLines.length > 1) {
    nameSize = 16;
    font(nameSize, 'bolditalic');
    nameLines = wrap(fullName.toUpperCase(), textWidth).slice(0, 2);
  }
  const nameLineHeight = nameSize * 0.42;
  const nameY = 29;

  const tags = [athlete.position, athlete.category, athlete.club].map((item) => clean(item).toUpperCase()).filter(Boolean);
  font(7, 'bold');
  const tagWidths = tags.map((tag) => Math.min(textWidth, widthOf(tag, 0.25) + 6));
  const tagPositions = flow(tagWidths, textWidth, 2);
  const tagRows = tags.length ? tagPositions[tagPositions.length - 1].row + 1 : 0;
  const tagsY = nameY + (nameLines.length - 1) * nameLineHeight + 4.5;
  const stripY = Math.max(56, tagsY + tagRows * 7.5 + 5);
  const headerHeight = stripY + 19;

  doc.setFillColor(...INK);
  doc.rect(0, 0, W, headerHeight, 'F');

  // Foto (ou as iniciais, quando não há foto que possa ser lida)
  const photoCenterY = 14 + photoSize / 2;
  if (photo) {
    doc.addImage(photo, 'JPEG', M, 14, photoSize, photoSize);
  } else {
    doc.setFillColor(38, 40, 44);
    doc.circle(M + photoSize / 2, photoCenterY, photoSize / 2, 'F');
    font(18, 'bold', WHITE);
    const initials = fullName.split(/\s+/).filter(Boolean);
    txt(`${initials[0]?.[0] || ''}${initials.length > 1 ? initials[initials.length - 1][0] : ''}`.toUpperCase(), M + photoSize / 2, photoCenterY + 2.3, { align: 'center' });
  }
  doc.setDrawColor(...WHITE);
  doc.setLineWidth(0.5);
  doc.circle(M + photoSize / 2, photoCenterY, photoSize / 2 + 1, 'S');

  // Marca da lista do atleta: F1ELD para Agenciados, Cosmopolitano para Negociados
  if (brand) {
    const brandHeight = Math.min(14, 34 / brand.ratio);
    const brandWidth = brandHeight * brand.ratio;
    doc.addImage(brand.data, 'PNG', W - M - brandWidth, 8, brandWidth, brandHeight);
  } else if (!negociado) {
    const brandWidth = 25;
    const brandHeight = 8.9;
    doc.setDrawColor(...WHITE);
    doc.setLineWidth(0.8);
    doc.roundedRect(W - M - brandWidth, 10.5, brandWidth, brandHeight, 0.4, 0.4, 'S');
    font(15, 'bolditalic', WHITE);
    txt('F1ELD', W - M - brandWidth / 2, 10.5 + brandHeight / 2 + 1.9, { align: 'center' });
  }

  label('Relatório do atleta', textX, 17, { color: HEADER_MUTED });
  font(nameSize, 'bolditalic', WHITE);
  nameLines.forEach((line, index) => txt(line, textX, nameY + index * nameLineHeight));

  tags.forEach((tag, index) => {
    const x = textX + tagPositions[index].x;
    const top = tagsY + tagPositions[index].row * 7.5;
    const primary = index === 0 && Boolean(clean(athlete.position));
    if (primary) {
      doc.setFillColor(...WHITE);
      doc.roundedRect(x, top, tagWidths[index], 6, 3, 3, 'F');
    } else {
      doc.setDrawColor(...HEADER_LINE);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, top, tagWidths[index], 6, 3, 3, 'S');
    }
    font(7, 'bold', primary ? INK : WHITE);
    txt(fit(tag, tagWidths[index] - 6, 0.25), x + 3, top + 4.1, { spacing: 0.25 });
  });

  hairline(stripY, M, W - M, HEADER_LINE);
  [
    { label: 'Idade', value: athlete.age ? String(athlete.age) : '', unit: 'anos' },
    { label: 'Altura', value: athlete.height ? (athlete.height / 100).toFixed(2).replace('.', ',') : '', unit: 'm' },
    { label: 'Peso', value: athlete.weight ? String(athlete.weight).replace('.', ',') : '', unit: 'kg' },
    { label: 'Pé dominante', value: clean(athlete.preferredFoot), unit: '' },
  ].forEach((item, index) => {
    const x = M + (index * CW) / 4;
    label(item.label, x, stripY + 6, { color: HEADER_MUTED });
    font(14, 'bold', item.value ? WHITE : HEADER_MUTED);
    const value = item.value || '-';
    txt(value, x, stripY + 13);
    if (item.value && item.unit) {
      const valueWidth = widthOf(value);
      font(6.5, 'bold', HEADER_MUTED);
      txt(item.unit.toUpperCase(), x + valueWidth + 1.2, stripY + 13, { spacing: 0.2 });
    }
  });

  y = headerHeight + 9;

  /* Seções */

  if (has('personal')) {
    const country = findCountry(athlete.nacionalidade);
    const secondCountry = athlete.hasDualNationality ? findCountry(athlete.secondNationality) : undefined;
    sectionTitle('Informações pessoais');
    infoGrid([
      { label: 'Nome completo', value: fullName },
      { label: 'Data de nascimento', value: formatDate(athlete.birthDate) },
      { label: 'Nacionalidade', value: country ? `${country.code} · ${country.name}` : athlete.nacionalidade },
      { label: 'Dupla nacionalidade', value: athlete.hasDualNationality ? (secondCountry ? `${secondCountry.code} · ${secondCountry.name}` : athlete.secondNationality || 'Sim') : 'Não possui' },
      { label: 'Cidade/Estado', value: athlete.naturalidade },
    ]);
  }

  if (has('sports')) {
    sectionTitle('Informações esportivas');
    infoGrid([
      { label: 'Clube atual', value: athlete.club },
      { label: 'Categoria', value: athlete.category },
      { label: 'Posição principal', value: athlete.position },
      { label: 'Posição secundária', value: athlete.secondaryPosition },
    ]);
  }

  if (has('dvd')) {
    sectionTitle('DVD');
    if (athlete.hasDvd && athlete.dvdLink) {
      infoGrid([{ label: 'Link do DVD (toque para abrir)', value: athlete.dvdLink, url: athlete.dvdLink }], 1);
    } else {
      emptyLine(athlete.hasDvd ? 'O atleta possui DVD, mas o link não foi informado.' : 'O atleta não possui DVD.');
    }
  }

  const sorted = sortScoutEntries(entries);
  const gamesCount = `${sorted.length} ${sorted.length === 1 ? 'jogo' : 'jogos'}`;

  if (has('scoutTotals')) {
    sectionTitle('Scout', sorted.length ? gamesCount : undefined);
    if (sorted.length === 0) {
      emptyLine('Nenhum número de scout cadastrado para este atleta.');
    } else {
      // Soma de cada número lançado; totais e percentuais são calculados sobre essa soma
      const totals: Record<string, number> = {};
      sorted.forEach((entry) => Object.entries(entry.stats).forEach(([key, value]) => { totals[key] = (totals[key] || 0) + value; }));
      statBoxes(SCOUT_FIELDS.map((field) => ({ value: formatScoutValue(field, totals) || (field.percent ? '-' : '0'), label: field.label })), 6);
    }
  }

  if (has('scoutGames')) {
    sectionTitle('Scout por jogo', sorted.length ? gamesCount : undefined);
    if (sorted.length === 0) emptyLine('Nenhum número de scout cadastrado para este atleta.');
    sorted.forEach((entry) => {
      // Só o que tem valor: marcações (titular, reserva...) aparecem sem número
      const chips = SCOUT_FIELDS.filter((field) => (scoutValue(field, entry.stats) || 0) > 0)
        .map((field) => ({ label: field.label, value: field.flag ? '' : formatScoutValue(field, entry.stats) }));
      const chipWidths = chips.map((chip) => {
        font(7, 'normal');
        const labelWidth = widthOf(chip.label);
        font(7, 'bold');
        return labelWidth + (chip.value ? 1.2 + widthOf(chip.value) : 0);
      });
      const chipPositions = flow(chipWidths, CW, 5);
      const chipRows = chips.length ? chipPositions[chipPositions.length - 1].row + 1 : 0;

      font(10, 'bold');
      const matchLines = wrap(clean(entry.match || entry.team || 'Partida').toUpperCase(), CW).slice(0, 2);
      const team = entry.match ? clean(entry.team) : '';
      const height = 9 + matchLines.length * 4.4 + (team ? 4 : 0) + chipRows * 4.2 + 2.5;
      ensure(height + 3);

      const when = clean([entry.matchDate, entry.year].filter(Boolean).join(' · '));
      label(when, W - M, y + 3.5, { align: 'right' });
      const round = clean(entry.round);
      const competition = [clean(entry.competition) || 'Jogo', round && round !== '-' ? (/^\d+$/.test(round) ? `Rodada ${round}` : round) : ''].filter(Boolean).join(' · ').toUpperCase();
      font(6.5, 'bold');
      txt(fit(competition, CW - widthOf(when.toUpperCase(), 0.25) - 6, 0.25), M, y + 3.5, { spacing: 0.25 });

      let top = y + 8.6;
      font(10, 'bold');
      matchLines.forEach((line) => {
        txt(line, M, top);
        top += 4.4;
      });
      if (team) {
        font(7.5, 'normal', MUTED);
        txt(team, M, top - 0.4);
        top += 4;
      }
      chips.forEach((chip, index) => {
        const x = M + chipPositions[index].x;
        const chipTop = top + 0.6 + chipPositions[index].row * 4.2;
        font(7, 'normal', MUTED);
        txt(chip.label, x, chipTop);
        if (chip.value) {
          const labelWidth = widthOf(chip.label);
          font(7, 'bold');
          txt(chip.value, x + labelWidth + 1.2, chipTop);
        }
      });
      hairline(y + height);
      y += height + 3;
    });
    if (sorted.length) y += 5;
  }

  if (has('games')) {
    const upcoming = games
      .filter((game) => game.athleteIds.includes(athlete.id) && game.date >= today)
      .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
    sectionTitle('Próximos jogos', upcoming.length ? `${upcoming.length} ${upcoming.length === 1 ? 'jogo' : 'jogos'}` : undefined);
    if (upcoming.length === 0) emptyLine('Nenhum próximo jogo cadastrado para este atleta.');
    upcoming.forEach((game) => {
      ensure(18);
      dateBox(game.date, y, false);
      const x = M + 20;
      const round = clean(game.round);
      const competition = [clean(game.competition) || 'Jogo', clean(game.category), round ? (/^\d+$/.test(round) ? `Rodada ${round}` : round) : ''].filter(Boolean).join(' · ').toUpperCase();
      font(6.5, 'bold');
      txt(fit(competition, CW - 20, 0.25), x, y + 3.2, { spacing: 0.25 });
      font(10, 'bold');
      txt(fit(`${clean(game.home)} x ${clean(game.away)}`.toUpperCase(), CW - 20), x, y + 8.4);
      font(7.5, 'normal', MUTED);
      txt(fit([game.time || 'Horário a definir', clean(game.venue)].filter(Boolean).join(' · '), CW - 20), x, y + 12.6);
      hairline(y + 16);
      y += 18;
    });
    if (upcoming.length) y += 5;
  }

  if (has('tactical')) {
    const meetings = athlete.tacticalMeetings || [];
    const order = (date: string, time?: string) => `${date} ${time || ''}`;
    // Reunião de hoje ainda conta como agendada
    const upcoming = meetings.filter((meeting) => meeting.date >= today).sort((a, b) => order(a.date, a.time).localeCompare(order(b.date, b.time)));
    const past = meetings.filter((meeting) => meeting.date < today).sort((a, b) => order(b.date, b.time).localeCompare(order(a.date, a.time)));
    const countOf = (type: 'video' | 'pdf') => meetings.reduce((total, meeting) => total + meeting.materials.filter((item) => item.type === type).length, 0);

    sectionTitle('Acompanhamento tático', meetings.length ? `${meetings.length} ${meetings.length === 1 ? 'reunião' : 'reuniões'}` : undefined);
    if (meetings.length === 0) {
      emptyLine('Nenhuma reunião cadastrada para este atleta.');
    } else {
      statBoxes([
        { value: String(past.length), label: 'Realizadas' },
        { value: String(upcoming.length), label: 'Agendadas' },
        { value: String(countOf('video')), label: 'Vídeos' },
        { value: String(countOf('pdf')), label: 'PDFs' },
      ], 4);

      [{ title: 'Próximas reuniões', list: upcoming }, { title: 'Reuniões realizadas', list: past }].forEach(({ title, list }) => {
        if (list.length === 0) return;
        ensure(30);
        label(title, M, y + 2.5, { color: INK });
        y += 6;
        list.forEach((meeting) => {
          const x = M + 20;
          const width = CW - 20;
          font(10, 'bold');
          const titleLines = wrap(clean(meeting.title).toUpperCase(), width).slice(0, 2);
          font(8, 'normal');
          const noteLines = meeting.notes ? wrap(clean(meeting.notes), width).slice(0, 8) : [];
          const height = Math.max(16, 5 + titleLines.length * 4.4 + noteLines.length * 3.7 + meeting.materials.length * 4.2 + 2.5);
          ensure(height + 2);
          dateBox(meeting.date, y, meeting.date >= today);

          const weekday = new Date(`${meeting.date.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' });
          label([weekday === 'Invalid Date' ? '' : weekday, meeting.time].filter(Boolean).join(' · '), x, y + 3.2);
          let top = y + 8.2;
          font(10, 'bold');
          titleLines.forEach((line) => {
            txt(line, x, top);
            top += 4.4;
          });
          font(8, 'normal', MUTED);
          noteLines.forEach((line) => {
            txt(line, x, top - 0.4);
            top += 3.7;
          });
          meeting.materials.forEach((material) => {
            const kind = material.type === 'video' ? 'VÍDEO' : 'PDF';
            font(6.5, 'bold');
            txt(kind, x, top + 0.2, { spacing: 0.25 });
            const kindWidth = widthOf(kind, 0.25) + 2;
            font(8, 'bold');
            const name = fit(clean(material.title) || kind, width - kindWidth);
            txt(name, x + kindWidth, top + 0.2);
            const nameWidth = widthOf(name);
            doc.setDrawColor(...INK);
            doc.setLineWidth(0.15);
            doc.line(x + kindWidth, top + 0.9, x + kindWidth + nameWidth, top + 0.9);
            if (/^https?:\/\//i.test(material.url)) doc.link(x, top - 2.8, kindWidth + nameWidth, 4, { url: material.url });
            top += 4.2;
          });
          hairline(y + height);
          y += height + 2;
        });
        y += 4;
      });
      y += 1;
    }
  }

  if (has('contract')) {
    const end = formatDate(athlete.contractEnd);
    const startTime = athlete.contractStart ? new Date(`${athlete.contractStart.slice(0, 10)}T00:00:00`).getTime() : NaN;
    const endTime = athlete.contractEnd ? new Date(`${athlete.contractEnd.slice(0, 10)}T00:00:00`).getTime() : NaN;
    const now = new Date(`${today}T00:00:00`).getTime();
    const daysLeft = Number.isNaN(endTime) ? null : Math.round((endTime - now) / 86400000);
    const hasContract = Boolean(athlete.contractLevel || athlete.contractStart || athlete.contractEnd || athlete.contractLink);

    // O quadro do contrato e a barra da vigência ficam na mesma página
    if (hasContract) ensure(46);
    sectionTitle('Contrato');
    if (!hasContract) {
      emptyLine('Nenhuma informação de contrato cadastrada para este atleta.');
    } else {
      infoGrid([
        { label: 'Tipo de contrato', value: athlete.contractLevel },
        { label: 'Início', value: formatDate(athlete.contractStart) },
        { label: 'Término', value: end },
        { label: 'Situação', value: daysLeft === null ? '' : daysLeft < 0 ? 'Encerrado' : daysLeft === 0 ? 'Termina hoje' : `Faltam ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}` },
      ], 4);
      if (!Number.isNaN(startTime) && !Number.isNaN(endTime) && endTime > startTime) {
        const elapsed = Math.max(0, Math.min(100, Math.round(((now - startTime) / (endTime - startTime)) * 100)));
        y -= 3;
        label('Vigência do contrato', M, y + 2.5);
        label(`${elapsed}%`, W - M, y + 2.5, { align: 'right', color: INK });
        progressBar(M, y + 4.5, CW, elapsed);
        y += 13;
      }
    }
  }

  if (has('goals')) {
    const progress = contractGoalProgress(athlete, entries);
    const done = progress.filter((item) => item.status === 'done').length;
    sectionTitle('Metas do contrato', progress.length ? `${done} de ${progress.length} ${done === 1 ? 'batida' : 'batidas'}` : undefined);
    if (progress.length === 0) emptyLine('Nenhuma meta cadastrada para este contrato.');
    progress.forEach(({ goal, value, percent, remaining, status, isPercent }) => {
      ensure(20);
      const field = SCOUT_FIELDS.find((item) => item.key === goal.metric);
      const result = `${formatNumber(value, isPercent)} de ${formatNumber(goal.target, isPercent)}`;
      font(10, 'bold');
      const resultWidth = widthOf(result);
      txt(result, W - M, y + 4, { align: 'right' });
      txt(fit(clean(goal.title).toUpperCase(), CW - resultWidth - 6), M, y + 4);
      label(field ? `Scout · ${field.label}` : 'Acompanhamento manual', M, y + 8);
      label(`${percent}%`, W - M, y + 8, { align: 'right', color: INK });
      progressBar(M, y + 10, CW, percent);
      const message = status === 'done'
        ? `Meta batida. ${value > goal.target ? `Objetivo superado em ${formatNumber(value - goal.target, isPercent)}.` : 'Objetivo do contrato atingido.'}`
        : status === 'near'
          ? `Chegando perto da meta: faltam ${formatNumber(remaining, isPercent)}.`
          : `Em andamento: faltam ${formatNumber(remaining, isPercent)} para a meta.`;
      font(8, status === 'done' ? 'bold' : 'normal', status === 'done' ? INK : MUTED);
      txt(message, M, y + 15.6);
      hairline(y + 18);
      y += 20.5;
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

  /* Rodapé de todas as páginas */

  const pages = doc.getNumberOfPages();
  const generated = new Date().toLocaleDateString('pt-BR');
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    hairline(H - 12);
    label(`${fullName} · Relatório gerado em ${generated}`, M, H - 8);
    label(`Página ${page} de ${pages}`, W - M, H - 8, { align: 'right' });
  }

  const fileName = `${fullName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ')} - Relatório.pdf`;
  return { blob: doc.output('blob'), fileName, pages };
};
