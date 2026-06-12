import { FORM_RESPONSE_FIELDS, downloadFormFile } from '../utils/formExport';

function formatValue(value) {
  if (!value || !String(value).trim()) return '—';
  return String(value);
}

export default function FormResponsesModal({ open, theme = 'dark', sessionMeta, formData, loading, error, onClose }) {
  if (!open) return null;

  const responses = formData?.form_data || {};

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-responses-title"
      data-theme={theme}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 border-0 cursor-default"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div
        className={`relative z-10 w-full max-w-2xl max-h-[85dvh] flex flex-col overflow-hidden rounded-[18px] border ${
          theme === 'light'
            ? 'bg-white border-[rgba(17,24,39,0.08)] shadow-xl'
            : 'shell-card'
        }`}
        style={{ animation: 'panelIn 0.25s ease' }}
      >
        <div className="relative z-[1] flex flex-col min-h-0 p-6 sm:p-8">
          <div className="shrink-0 mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e63946] mb-2">
              Respuestas del onboarding
            </p>
            <h2 id="form-responses-title" className={`text-[1.35rem] font-semibold tracking-[-0.02em] mb-1 ${theme === 'light' ? 'text-[#111827]' : 'text-white'}`}>
              {sessionMeta?.client_name || formData?.client_name || 'Cliente'}
            </h2>
            <p className={`text-[13px] tracking-[-0.01em] ${theme === 'light' ? 'text-[rgba(17,24,39,0.55)]' : 'text-[rgba(255,255,255,0.45)]'}`}>
              {sessionMeta?.client_email || formData?.client_email || '—'}
              {' · '}
              {sessionMeta?.plan || formData?.plan || '—'}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3">
            {loading && (
              <p className="text-[14px] text-[rgba(255,255,255,0.45)] tracking-[-0.01em]">Cargando respuestas...</p>
            )}
            {error && !loading && (
              <p className="text-[13px] text-[#e63946] tracking-[-0.01em]">{error}</p>
            )}
            {!loading && !error && FORM_RESPONSE_FIELDS.map(({ key, label }) => (
              <div
                key={key}
                className={`rounded-lg border px-4 py-3 ${
                  theme === 'light'
                    ? 'border-[rgba(17,24,39,0.08)] bg-[rgba(17,24,39,0.02)]'
                    : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <p className={`text-[11px] uppercase tracking-[0.08em] mb-1.5 ${theme === 'light' ? 'text-[rgba(17,24,39,0.45)]' : 'text-[rgba(255,255,255,0.4)]'}`}>
                  {label}
                </p>
                <p className={`text-[14px] leading-relaxed whitespace-pre-wrap tracking-[-0.01em] ${theme === 'light' ? 'text-[rgba(17,24,39,0.88)]' : 'text-[rgba(255,255,255,0.85)]'}`}>
                  {formatValue(responses[key])}
                </p>
              </div>
            ))}
          </div>

          <div className="shrink-0 pt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`w-full rounded-lg px-4 py-2.5 text-[13px] font-sans tracking-[-0.01em] cursor-pointer border ${
                theme === 'light' ? 'dashboard-btn-secondary' : 'btn-secondary'
              }`}
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => formData && downloadFormFile(formData)}
              disabled={loading || !formData}
              className="w-full rounded-lg px-4 py-2.5 text-[13px] font-semibold font-sans tracking-[-0.01em] cursor-pointer border-0 text-white btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Descargar formulario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
