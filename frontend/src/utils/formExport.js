import { LOGO_URL } from '../components/Layout';
import {
  formatFormResponseValue,
  getFormDisplaySections,
} from '../constants/onboardingFormFields';

const ATV_COLORS = {
  red: '#e63946',
  dark: '#111827',
  darkSoft: '#1f2937',
  text: '#111827',
  muted: '#6b7280',
  white: '#ffffff',
};

function slugifyFilename(value) {
  return (
    String(value || 'cliente')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'cliente'
  );
}

function formatSubmittedAt(value) {
  if (!value) return null;
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildFormMetadataLines(data) {
  const lines = [
    `Cliente: ${data?.client_name || '—'}`,
    `Email: ${data?.client_email || '—'}`,
    `Plan: ${data?.plan || '—'}`,
  ];

  const submittedAt = formatSubmittedAt(data?.submitted_at);
  if (submittedAt) {
    lines.push(`Enviado: ${submittedAt}`);
  }

  return lines;
}

export function buildFormDownloadContent(data) {
  const responses = data?.form_data || {};
  const sections = getFormDisplaySections(responses);
  const lines = [
    'FORMULARIO DE ONBOARDING — AUMENTA TU VALOR',
    '',
    ...buildFormMetadataLines(data),
    '',
    '─'.repeat(50),
    '',
  ];

  for (const section of sections) {
    if (section.title) {
      lines.push(section.title, '');
    }

    for (const { id, label } of section.questions) {
      const text = formatFormResponseValue(responses[id]);
      lines.push(`${id}. ${label}`, text, '');
    }
  }

  return lines.join('\n');
}

async function fetchLogoAsBase64() {
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function buildPdfHeader(logoBase64) {
  const brandStack = logoBase64
    ? [{ image: logoBase64, width: 96, alignment: 'center', margin: [0, 0, 0, 10] }]
    : [{ text: 'ATV', style: 'brandFallback', alignment: 'center', margin: [0, 0, 0, 10] }];

  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            stack: [
              ...brandStack,
              {
                text: 'FORMULARIO DE ONBOARDING',
                style: 'headerTitle',
                alignment: 'center',
              },
              {
                text: 'AUMENTA TU VALOR',
                style: 'headerSubtitle',
                alignment: 'center',
                margin: [0, 4, 0, 0],
              },
            ],
            fillColor: ATV_COLORS.dark,
            margin: [24, 28, 24, 28],
            border: [false, false, false, false],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [-40, -48, -40, 0],
  };
}

function buildPdfMetadataCard(data) {
  const submittedAt = formatSubmittedAt(data?.submitted_at);
  const rows = [
    ['Cliente', data?.client_name || '—'],
    ['Email', data?.client_email || '—'],
    ['Plan', data?.plan || '—'],
  ];

  if (submittedAt) {
    rows.push(['Enviado', submittedAt]);
  }

  return {
    stack: rows.map(([label, value]) => ({
      columns: [
        { text: `${label}:`, width: 72, style: 'metaLabel' },
        {
          text: value,
          style: label === 'Plan' ? 'metaPlan' : 'metaValue',
        },
      ],
      columnGap: 8,
      margin: [0, 0, 0, 6],
    })),
    margin: [0, 20, 0, 16],
    unbreakable: true,
  };
}

function buildPdfSectionTitle(title) {
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            text: title,
            style: 'sectionTitle',
            fillColor: ATV_COLORS.red,
            color: ATV_COLORS.white,
            margin: [12, 8, 12, 8],
            border: [false, false, false, false],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 14, 0, 10],
  };
}

function buildPdfQuestionBlock(id, label, answer) {
  return {
    stack: [
      {
        text: `${id}. ${label}`,
        style: 'question',
        margin: [0, 0, 0, 4],
      },
      {
        text: answer,
        style: 'answer',
        margin: [0, 0, 0, 12],
      },
    ],
    unbreakable: true,
  };
}

async function buildFormPdfDefinition(data) {
  const responses = data?.form_data || {};
  const sections = getFormDisplaySections(responses);
  const logoBase64 = await fetchLogoAsBase64();

  const content = [
    buildPdfHeader(logoBase64),
    buildPdfMetadataCard(data),
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 2,
          lineColor: ATV_COLORS.red,
        },
      ],
      margin: [0, 0, 0, 8],
    },
  ];

  for (const section of sections) {
    const questionBlocks = section.questions.map(({ id, label }) =>
      buildPdfQuestionBlock(id, label, formatFormResponseValue(responses[id])),
    );

    if (section.title && questionBlocks.length > 0) {
      content.push({
        stack: [buildPdfSectionTitle(section.title), questionBlocks[0]],
        unbreakable: true,
      });
      content.push(...questionBlocks.slice(1));
      continue;
    }

    if (section.title) {
      content.push(buildPdfSectionTitle(section.title));
    }

    content.push(...questionBlocks);
  }

  return {
    content,
    styles: {
      brandFallback: {
        fontSize: 28,
        bold: true,
        color: ATV_COLORS.red,
      },
      headerTitle: {
        fontSize: 13,
        bold: true,
        color: ATV_COLORS.white,
        characterSpacing: 1.2,
      },
      headerSubtitle: {
        fontSize: 9,
        color: '#b8bcc4',
        characterSpacing: 2,
      },
      metaLabel: {
        fontSize: 8,
        bold: true,
        color: ATV_COLORS.muted,
      },
      metaValue: {
        fontSize: 9,
        color: ATV_COLORS.text,
      },
      metaPlan: {
        fontSize: 9,
        bold: true,
        color: ATV_COLORS.red,
      },
      sectionTitle: {
        fontSize: 8.5,
        bold: true,
      },
      question: {
        fontSize: 8.5,
        bold: true,
        color: ATV_COLORS.darkSoft,
      },
      answer: {
        fontSize: 9,
        color: ATV_COLORS.text,
        lineHeight: 1.35,
      },
      footer: {
        fontSize: 7.5,
        color: ATV_COLORS.muted,
      },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
    },
    pageMargins: [40, 48, 40, 56],
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          text: 'ATV — Aumenta Tu Valor',
          style: 'footer',
          alignment: 'left',
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          style: 'footer',
          alignment: 'right',
        },
      ],
      margin: [40, 16, 40, 0],
    }),
  };
}

function downloadTxtFile(data) {
  const content = buildFormDownloadContent(data);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `formulario-${slugifyFilename(data?.client_name)}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadPdfFile(data) {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);

  pdfMake.vfs = vfs;

  const filename = `formulario-${slugifyFilename(data?.client_name)}.pdf`;
  const docDefinition = await buildFormPdfDefinition(data);
  pdfMake.createPdf(docDefinition).download(filename);
}

export async function downloadFormFile(data, format = 'txt') {
  if (format === 'pdf') {
    await downloadPdfFile(data);
    return;
  }

  downloadTxtFile(data);
}
