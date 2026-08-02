import { useEffect, useState } from 'react';
import { downloadFormFile } from '../utils/formExport';

const QUESTION_LABELS = {
  1: 'Nombre real, WhatsApp y email principal',
  2: '¿El negocio es propio o de un cliente?',
  3: '¿Con cuál rol te identificás más?',
  4: 'Links de redes activas',
  5: '¿Cuál es exactamente tu oferta?',
  6: '¿En qué nicho operás y qué te diferencia?',
  7: '¿A quién le hablás? Avatar',
  8: '¿A qué precio vendés?',
  9: '¿Dónde creás contenido y cuál trae leads más calificados?',
  10: '¿Trabajás con calendario de contenido planificado?',
  11: '¿Tomás decisiones en base a métricas o percepción?',
  12: '¿Cuántos chats abrís por mes y por qué vía?',
  13: '¿Cuánto facturaste en los últimos 6 meses?',
  14: '¿Qué porcentaje de chats agenda llamada y asiste?',
  15: '¿Cuál es tu tasa de cierre?',
  16: '¿Contás con un funnel de conversión?',
  17: '¿Bajo qué criterio filtrás leads?',
  18: '¿Tenés proceso de seguimiento para leads que no compran?',
  19: '¿Qué herramientas usás para operar el negocio?',
  20: '¿Quiénes integran tu equipo y qué función cumple cada uno?',
  21: '¿Quién toma las decisiones?',
  22: '¿Qué incluye exactamente tu programa o servicio?',
  23: '¿Cuántos clientes activos tenés y cómo medís su progreso?',
  24: '¿Contás con sistema de upsell y recompra?',
  25: '¿A cuántos clientes más podrías atender sin cambios?',
  26: '¿Qué experiencia atraviesa el cliente desde que compra?',
  27: 'Mejores casos de éxito',
  28: '¿Qué probaste antes de ATV y por qué no funcionó?',
  29: '3 problemas principales para escalar hoy',
  30: '¿Cuál es el principal freno de tu negocio?',
  31: 'Objetivo concreto a 4 meses',
  32: '¿Por dónde me conociste?',
  33: '¿Qué formato de contenido te aporta más?',
  34: '¿Por qué elegiste ese formato?',
  35: '¿Qué tipo de Reels te gustan más?',
  36: '¿Qué hace que te gusten esos Reels?',
  37: '¿Qué tipo de videos de YouTube te gustan más?',
  38: '¿Qué hace que te gusten los videos de YouTube?',
  39: '¿Qué te gusta o aporta más de las Historias?',
  40: '¿Qué te hizo finalmente decir SÍ y entrar a ATV?',
  41: '¿Qué te motivó específicamente a tomar acción?',
  42: '¿Cuánto tiempo tardaste en decidirte?',
  43: '¿Qué podría haber funcionado mejor para decidirte antes?',
  44: '¿Qué aspecto se podría mejorar?',
  45: 'Nivel de convicción antes de la llamada (1-10)',
  46: '¿Qué fue lo último que te convenció?',
  47: '¿Qué impedía que compres?',
  48: '¿Qué programa compraste?',
  49: '¿Algo dentro de ATV que si lo hubieras visto antes habría ayudado?',
};

function formatValue(value) {
  if (value === null || value === undefined || !String(value).trim()) return '—';
  return String(value);
}

function getFieldLabel(key) {
  return QUESTION_LABELS[key] ?? QUESTION_LABELS[String(key)] ?? key;
}

function sortFormKeys(keys) {
  return [...keys].sort((a, b) => Number(a) - Number(b));
}

export default function FormResponsesModal({ open, theme = 'dark', sessionMeta, formData, loading, error, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (!open) {
      setDownloading(false);
      setDownloadError('');
    }
  }, [open]);

  if (!open) return null;

  const responses = formData?.form_data || {};
  const responseKeys = sortFormKeys(Object.keys(responses));
  const isLight = theme === 'light';

  const handleDownload = async () => {
    if (!formData || downloading) return;

    setDownloadError('');
    setDownloading(true);

    try {
      await downloadFormFile(formData);
    } catch (err) {
      setDownloadError(err.message || 'No se pudo descargar el PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="atv-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-responses-title"
      data-theme={theme}
    >
      <button
        type="button"
        className="atv-modal-overlay"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div className="atv-modal-panel max-w-2xl">
        <div className="atv-modal-panel__inner">
          <div className="shrink-0 mb-5">
            <p className={`atv-modal-kicker ${isLight ? 'text-[rgba(17,24,39,0.45)]' : ''}`}>
              Respuestas del onboarding
            </p>
            <h2
              id="form-responses-title"
              className={`atv-modal-title ${isLight ? 'text-[#111827]' : ''}`}
            >
              {sessionMeta?.client_name || formData?.client_name || 'Cliente'}
            </h2>
            <p className={`atv-modal-meta ${isLight ? 'text-[rgba(17,24,39,0.55)]' : ''}`}>
              {sessionMeta?.client_email || formData?.client_email || '—'}
              {' · '}
              {sessionMeta?.plan || formData?.plan || '—'}
            </p>
          </div>

          <div className="atv-modal-panel__scroll">
            {loading && (
              <p className="text-[14px] text-[rgba(255,255,255,0.45)]">Cargando respuestas...</p>
            )}
            {error && !loading && (
              <p className="text-[13px] text-[#e63946]">{error}</p>
            )}
            {!loading && !error && responseKeys.map((key) => (
              <div
                key={key}
                className="atv-modal-block"
              >
                <p className={`atv-modal-block__label ${isLight ? 'text-[rgba(17,24,39,0.45)]' : ''}`}>
                  {getFieldLabel(key)}
                </p>
                <p className={`atv-modal-block__value ${isLight ? 'text-[rgba(17,24,39,0.88)]' : ''}`}>
                  {formatValue(responses[key])}
                </p>
              </div>
            ))}
          </div>

          <div className="atv-modal-panel__footer shrink-0 pt-6 flex flex-col gap-2">
            {downloadError && (
              <p className="text-[13px] text-[#e63946] text-center">{downloadError}</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary w-full py-2.5 text-[13px]"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !formData || downloading}
              className="btn-primary w-full py-2.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {downloading ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
