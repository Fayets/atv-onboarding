export const FORM_RESPONSE_FIELDS = [
  { key: 'nombre', label: 'Nombre completo y/o canal de Discord' },
  { key: 'perfil', label: 'Perfil' },
  { key: 'nicho', label: 'Nicho o industria' },
  { key: 'oferta', label: 'Oferta' },
  { key: 'precio', label: 'Precio de la oferta principal' },
  { key: 'cliente_ideal', label: 'Cliente ideal' },
  { key: 'facturacion_actual', label: 'Facturación actual' },
  { key: 'meta_90', label: 'Meta de facturación (90 días)' },
  { key: 'activos', label: 'Activos en el negocio' },
  { key: 'objetivo', label: 'Objetivo principal' },
  { key: 'obstaculos', label: 'Obstáculos' },
  { key: 'extra', label: 'Información adicional' },
];

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

  for (const { key, label } of FORM_RESPONSE_FIELDS) {
    const value = responses[key];
    const text = value && String(value).trim() ? String(value).trim() : '—';
    lines.push(`${label}`, text, '');
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
