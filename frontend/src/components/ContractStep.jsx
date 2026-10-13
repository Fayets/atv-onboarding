import { useCallback, useEffect, useRef, useState } from 'react';
import { contractPdfUrl, getContract, startContract } from '../api/client';

const POLL_MS = 5000;

function formatSignedAt(value) {
  if (!value) return '';
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  return date.toLocaleString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ContractStep({ contract, clientName, clientEmail, onContractChange, onPrevious, onContinue }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const status = contract?.status || 'none';
  const required = Boolean(contract?.required);
  const signed = !required || status === 'signed';
  const pending = required && status === 'pending';
  const signTabRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getContract();
      onContractChange(data);
      return data;
    } catch {
      return null;
    }
  }, [onContractChange]);

  // Mientras espera la firma, pregunta al backend cada pocos segundos.
  useEffect(() => {
    if (!pending) return undefined;
    const timer = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [pending, refresh]);

  function openSignTab(url) {
    if (signTabRef.current && !signTabRef.current.closed) {
      signTabRef.current.location.href = url;
      signTabRef.current.focus();
      return;
    }
    const tab = window.open(url, '_blank', 'noopener,noreferrer');
    signTabRef.current = tab;
    if (!tab) window.location.href = url;
  }

  async function handleStart() {
    setError('');
    if (pending && contract?.sign_url) {
      openSignTab(contract.sign_url);
      return;
    }
    setStarting(true);
    // Se abre la pestaña dentro del click para que el navegador no la bloquee.
    const tab = window.open('', '_blank');
    signTabRef.current = tab;
    try {
      const data = await startContract();
      onContractChange(data);
      if (data.sign_url) {
        if (tab) {
          tab.location.href = data.sign_url;
          tab.focus();
        } else {
          window.location.href = data.sign_url;
        }
      } else if (tab) {
        tab.close();
      }
    } catch (err) {
      if (tab) tab.close();
      setError(err?.message || 'No pudimos generar tu contrato. Probá de nuevo en un minuto.');
    } finally {
      setStarting(false);
    }
  }

  const label = contract?.label || 'Contrato de prestación de servicios';
  const plan = contract?.plan || '';

  return (
    <div className="panel-inner flex flex-col">
      {plan && (
        <span className="inline-flex items-center gap-2 w-fit rounded-full border border-[rgba(230,57,70,0.4)] bg-[rgba(230,57,70,0.12)] px-3 py-1.5 text-[12.5px] font-medium text-white mb-5">
          {plan}
          <span className="text-[rgba(255,255,255,0.45)] font-normal">· {label}</span>
        </span>
      )}

      {!required && (
        <>
          <h1 className="text-[24px] md:text-[30px] font-bold tracking-[-0.03em] text-white mb-[0.6rem] leading-[1.2]">Tu contrato ya está firmado</h1>
          <p className="text-[15px] text-[rgba(255,255,255,0.45)] mb-9 leading-[1.55] tracking-[-0.01em]">
            Tu alta se hizo antes de que la firma pasara por acá. Si necesitás una copia, pedísela a tu closer.
          </p>
        </>
      )}

      {required && status === 'none' && (
        <>
          <h1 className="text-[24px] md:text-[30px] font-bold tracking-[-0.03em] text-white mb-[0.6rem] leading-[1.2]">Firmá tu contrato para desbloquear tus accesos</h1>
          <p className="text-[15px] text-[rgba(255,255,255,0.45)] mb-8 leading-[1.55] tracking-[-0.01em]">
            Es el mismo contrato que te explicó tu closer. Lo firmás con firma electrónica en ZapSign, con validez legal, y volvés acá solo.
          </p>
          <div className="accent-block px-[1.4rem] py-[1.2rem] mb-7 text-[13.5px] text-[rgba(255,255,255,0.6)] leading-[1.7] tracking-[-0.01em]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <Fact label="Contratante" value={clientName || '—'} />
              <Fact label="Email de notificaciones" value={clientEmail || '—'} />
              {contract?.payment_mode ? (
                <Fact label="Modalidad de pago" value={contract.payment_mode} />
              ) : (
                <Fact label="Modalidad de pago" value="La elegís en ZapSign" muted />
              )}
              <Fact label="Documento y domicilio" value="Los completás en ZapSign" muted />
            </div>
          </div>
        </>
      )}

      {pending && (
        <>
          <h1 className="text-[24px] md:text-[30px] font-bold tracking-[-0.03em] text-white mb-[0.6rem] leading-[1.2]">Tu contrato está abierto en ZapSign</h1>
          <p className="text-[15px] text-[rgba(255,255,255,0.45)] mb-7 leading-[1.55] tracking-[-0.01em]">
            Completá tu documento y domicilio, leé el contrato y firmá. Esta pantalla se actualiza sola cuando termines.
          </p>
          <div className="flex items-center gap-3 rounded-[10px] border border-[rgba(251,191,36,0.25)] bg-[rgba(251,191,36,0.1)] px-4 py-3.5 mb-7 text-[13.5px]">
            <span className="contract-pulse shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              Esperando tu firma…
              <span className="block text-[12px] text-[rgba(255,255,255,0.45)] mt-0.5">Si cerraste la pestaña, podés volver a abrirla.</span>
            </div>
            <button type="button" onClick={handleStart} className="text-[12.5px] font-medium text-[#e63946] bg-transparent border-0 p-0 cursor-pointer whitespace-nowrap hover:opacity-70">
              Volver a abrir ↗
            </button>
          </div>
        </>
      )}

      {required && status === 'signed' && (
        <>
          <h1 className="text-[24px] md:text-[30px] font-bold tracking-[-0.03em] text-white mb-[0.6rem] leading-[1.2]">Contrato firmado. Bienvenido a ATV.</h1>
          <p className="text-[15px] text-[rgba(255,255,255,0.45)] mb-7 leading-[1.55] tracking-[-0.01em]">
            Vas a tener tu copia siempre acá.
          </p>
          <div className="flex items-center gap-3 rounded-[10px] border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.1)] px-4 py-3.5 mb-7 text-[13.5px]">
            <span className="w-[22px] h-[22px] rounded-full bg-[#4ade80] text-[#052e16] grid place-items-center text-[13px] font-bold shrink-0">✓</span>
            <div className="flex-1 min-w-0">
              Firmado el {formatSignedAt(contract?.signed_at)}
              <span className="block text-[12px] text-[rgba(255,255,255,0.45)] mt-0.5">Firma electrónica verificada por ZapSign</span>
            </div>
            {contract?.has_pdf && (
              <a href={contractPdfUrl()} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-medium text-[#e63946] no-underline whitespace-nowrap hover:opacity-70">
                Descargar PDF ↓
              </a>
            )}
          </div>
        </>
      )}

      {error && <p className="text-[13px] text-[#e63946] mb-4">{error}</p>}

      <div className="flex gap-[10px] items-stretch mt-2">
        <button type="button" className="btn-secondary flex items-center rounded-lg px-5 py-[0.8rem] text-[14.5px] font-sans tracking-[-0.01em] cursor-pointer whitespace-nowrap border-0" onClick={onPrevious}>← Anterior</button>
        {signed ? (
          <button type="button" className="btn-primary flex flex-1 items-center justify-center rounded-lg px-6 py-[0.85rem] text-[15px] font-semibold font-sans tracking-[-0.01em] cursor-pointer border-0 text-white" onClick={onContinue}>Siguiente →</button>
        ) : (
          <button type="button" disabled={starting} className={`btn-primary flex flex-1 items-center justify-center rounded-lg px-6 py-[0.85rem] text-[15px] font-semibold font-sans tracking-[-0.01em] cursor-pointer border-0 text-white ${starting ? 'opacity-60 cursor-wait' : ''}`} onClick={handleStart}>
            {starting ? 'Generando tu contrato…' : pending ? 'Abrir el contrato en ZapSign →' : 'Firmar contrato en ZapSign →'}
          </button>
        )}
      </div>
      {required && status !== 'signed' && (
        <p className="text-[12.5px] text-[rgba(255,255,255,0.3)] mt-4 leading-[1.5]">
          Se abre en una pestaña nueva. Cuando termines de firmar, esta pantalla se actualiza sola.
        </p>
      )}
    </div>
  );
}

function Fact({ label, value, muted = false }) {
  return (
    <div className="flex flex-col gap-0.5 border-l-2 border-[rgba(255,255,255,0.1)] pl-3">
      <span className="text-[11px] uppercase tracking-[0.06em] text-[rgba(255,255,255,0.3)]">{label}</span>
      <span className={muted ? 'text-[rgba(255,255,255,0.45)] italic' : 'text-white font-medium'}>{value}</span>
    </div>
  );
}
