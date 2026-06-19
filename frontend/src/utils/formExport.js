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

export function buildFormDownloadContent(data) {
  const responses = data?.form_data || {};
  const sections = getFormDisplaySections(responses);
  const lines = [
    'FORMULARIO DE ONBOARDING — AUMENTA TU VALOR',
    '',
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

  lines.push('', '─'.repeat(50), '');

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

export function downloadFormFile(data) {
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
