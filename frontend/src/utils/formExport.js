import {
  formatFormResponseValue,
  getFormDisplaySections,
} from '../constants/onboardingFormFields';

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

function buildFormMetadataLines(data) {
  const lines = [
    `Cliente: ${data?.client_name || '—'}`,
    `Email: ${data?.client_email || '—'}`,
    `Plan: ${data?.plan || '—'}`,
  ];

  if (data?.submitted_at) {
    lines.push(
      `Enviado: ${new Date(data.submitted_at).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    );
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

function buildFormPdfDefinition(data) {
  const responses = data?.form_data || {};
  const sections = getFormDisplaySections(responses);
  const content = [
    {
      text: 'FORMULARIO DE ONBOARDING — AUMENTA TU VALOR',
      style: 'header',
      margin: [0, 0, 0, 12],
    },
    ...buildFormMetadataLines(data).map((line) => ({
      text: line,
      margin: [0, 0, 0, 4],
    })),
    { text: ' ', margin: [0, 8, 0, 8] },
  ];

  for (const section of sections) {
    if (section.title) {
      content.push({
        text: section.title,
        style: 'sectionTitle',
        margin: [0, 12, 0, 8],
      });
    }

    for (const { id, label } of section.questions) {
      content.push({
        text: `${id}. ${label}`,
        style: 'question',
        margin: [0, 8, 0, 4],
      });
      content.push({
        text: formatFormResponseValue(responses[id]),
        style: 'answer',
        margin: [0, 0, 0, 8],
      });
    }
  }

  return {
    content,
    styles: {
      header: { fontSize: 14, bold: true },
      sectionTitle: { fontSize: 10, bold: true, color: '#444444' },
      question: { fontSize: 9, bold: true, color: '#333333' },
      answer: { fontSize: 9, color: '#111111' },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
    },
    pageMargins: [40, 48, 40, 48],
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
  const [{ default: pdfMake }, pdfFonts] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);

  pdfMake.vfs = pdfFonts.pdfMake.vfs;

  const filename = `formulario-${slugifyFilename(data?.client_name)}.pdf`;
  pdfMake.createPdf(buildFormPdfDefinition(data)).download(filename);
}

export async function downloadFormFile(data, format = 'txt') {
  if (format === 'pdf') {
    await downloadPdfFile(data);
    return;
  }

  downloadTxtFile(data);
}
