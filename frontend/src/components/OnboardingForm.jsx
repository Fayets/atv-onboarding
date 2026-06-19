import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSession, submitForm } from '../api/client';

const QUESTION_IDS = Array.from({ length: 49 }, (_, i) => String(i + 1));
const TOTAL_QUESTIONS = QUESTION_IDS.length;
const MIN_FIELDS_FOR_UNLOAD_GUARD = 5;

function createEmptyForm() {
  return Object.fromEntries(QUESTION_IDS.map((id) => [id, '']));
}

function draftKey(sessionId) {
  return `onboarding_draft_${sessionId}`;
}

function loadDraft(sessionId) {
  if (!sessionId) return null;
  try {
    const raw = localStorage.getItem(draftKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function saveDraft(sessionId, data) {
  if (!sessionId) return;
  try {
    localStorage.setItem(draftKey(sessionId), JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

function clearDraft(sessionId) {
  if (!sessionId) return;
  try {
    localStorage.removeItem(draftKey(sessionId));
  } catch {
    // ignore
  }
}

function countCompletedFields(formData) {
  return QUESTION_IDS.filter((id) => String(formData[id] ?? '').trim()).length;
}

function SubmitSpinner() {
  return (
    <svg
      className="animate-spin shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

const BLOCKS = [
  {
    title: 'BLOQUE 0 — QUIÉN SOS Y DE QUÉ NEGOCIO HABLAMOS',
    questions: [
      {
        id: '1',
        type: 'textarea',
        label: 'Nombre real, WhatsApp y email principal',
        placeholder: 'Ej. Matías Gómez | +54 9 11 2345-6789 | ejemplo@gmail.com',
        rows: 2,
      },
      {
        id: '2',
        type: 'textarea',
        label:
          'El negocio que vamos a trabajar, ¿es propio o de un cliente/empresa para la que trabajás? Si es de un cliente, indicá tu rol y tu nivel de decisión sobre los cambios',
        rows: 3,
      },
      {
        id: '3',
        type: 'radio',
        label: '¿Con cuál rol te identificás más?',
        options: [
          { key: 'A', label: 'Experto en infoproductos' },
          { key: 'B', label: 'Dueño de negocio' },
          { key: 'C', label: 'Creador de contenido' },
          { key: 'D', label: 'Dueño de agencia' },
          { key: 'E', label: 'Director de ventas' },
          { key: 'F', label: 'Director de marketing' },
          { key: 'G', label: 'Growth partner' },
          { key: 'H', label: 'Setter' },
          { key: 'I', label: 'Closer' },
          { key: 'J', label: 'Editor' },
        ],
      },
      {
        id: '4',
        type: 'textarea',
        label:
          'Compartí los links de todas las redes activas del negocio a trabajar (Instagram, YouTube, TikTok, Twitter, podcast, etc)',
        rows: 3,
      },
    ],
  },
  {
    title: 'BLOQUE 1 — OFERTA Y POSICIONAMIENTO',
    questions: [
      { id: '5', type: 'textarea', label: '¿Cuál es exactamente tu oferta?', rows: 3 },
      {
        id: '6',
        type: 'textarea',
        label: '¿En qué nicho operás, por qué te eligen y qué te diferencia de la competencia?',
        rows: 3,
      },
      {
        id: '7',
        type: 'textarea',
        label:
          '¿A quién le hablás? Describí los problemas y objetivos de tu avatar, no su demografía',
        rows: 3,
      },
      {
        id: '8',
        type: 'textarea',
        label: '¿A qué precio vendés y bajo qué lógica definiste ese precio?',
        rows: 3,
      },
    ],
  },
  {
    title: 'BLOQUE 2 — CONTENIDO Y ADQUISICIÓN',
    questions: [
      {
        id: '9',
        type: 'textarea',
        label:
          '¿Dónde creás contenido, cuál es tu canal más fuerte y cuál te trae los leads más calificados hoy?',
        rows: 3,
      },
      {
        id: '10',
        type: 'textarea',
        label:
          '¿Trabajás con un calendario de contenido planificado o publicás sin una estructura definida?',
        rows: 3,
      },
      {
        id: '11',
        type: 'textarea',
        label:
          '¿Tomás decisiones en base a métricas o a percepción? Si tenés métricas, pasame las views promedio por semana en reels, historias y YouTube',
        rows: 3,
      },
      {
        id: '12',
        type: 'textarea',
        label: '¿Cuántos chats abrís por mes y por qué vía?',
        rows: 3,
      },
    ],
  },
  {
    title: 'BLOQUE 3 — VENTAS Y EMBUDO',
    questions: [
      {
        id: '13',
        type: 'textarea',
        label: '¿Cuánto facturaste en los últimos 6 meses y qué tan estable es esa cifra?',
        rows: 3,
      },
      {
        id: '14',
        type: 'textarea',
        label: '¿Qué porcentaje de esos chats agenda llamada y qué porcentaje asiste?',
        rows: 3,
      },
      { id: '15', type: 'textarea', label: '¿Cuál es tu tasa de cierre?', rows: 3 },
      {
        id: '16',
        type: 'textarea',
        label: '¿Contás con un funnel de conversión para tu negocio?',
        rows: 3,
      },
      {
        id: '17',
        type: 'textarea',
        label: '¿Bajo qué criterio filtrás leads o atendés a cualquiera que escribe?',
        rows: 3,
      },
      {
        id: '18',
        type: 'textarea',
        label: '¿Tenés un proceso de seguimiento para los leads que no compran?',
        rows: 3,
      },
    ],
  },
  {
    title: 'BLOQUE 4 — OPERACIÓN, EQUIPO Y ENTREGA',
    questions: [
      {
        id: '19',
        type: 'textarea',
        label: '¿Qué herramientas usás para operar el negocio? (Skool, GHL, Calendly, Zapier, etc)',
        rows: 3,
      },
      {
        id: '20',
        type: 'textarea',
        label: '¿Quiénes integran tu equipo hoy, qué función cumple cada uno y cuánto cobra?',
        rows: 3,
      },
      {
        id: '21',
        type: 'textarea',
        label: '¿Quién toma las decisiones o todo pasa por vos?',
        rows: 3,
      },
      {
        id: '22',
        type: 'textarea',
        label: '¿Qué incluye exactamente tu programa o servicio?',
        rows: 3,
      },
      {
        id: '23',
        type: 'textarea',
        label: '¿Cuántos clientes activos tenés y cómo medís su progreso?',
        rows: 3,
      },
      {
        id: '24',
        type: 'textarea',
        label:
          '¿Contás con algún sistema de upsell y recompra para los clientes que ya tenés dentro de tu producto?',
        rows: 3,
      },
      {
        id: '25',
        type: 'textarea',
        label:
          '¿A cuántos clientes más podrías atender sin contratar personal ni modificar el producto?',
        rows: 3,
      },
      {
        id: '26',
        type: 'textarea',
        label: '¿Qué experiencia atraviesa el cliente desde que compra hasta que arranca?',
        rows: 3,
      },
    ],
  },
  {
    title: 'BLOQUE 5 — RESULTADOS, DOLOR Y OBJETIVO',
    questions: [
      {
        id: '27',
        type: 'textarea',
        label:
          'Contame tus mejores casos de éxito (situación inicial, resultado logrado y cómo fue el proceso)',
        rows: 4,
      },
      {
        id: '28',
        type: 'textarea',
        label: '¿Qué probaste antes de ATV y por qué creés que no funcionó?',
        rows: 3,
      },
      {
        id: '29',
        type: 'checkbox',
        label: '¿Cuáles son tus 3 problemas principales para escalar hoy?',
        options: [
          { key: 'A', label: 'Depender de ads' },
          { key: 'B', label: 'Depender de lanzamientos' },
          { key: 'C', label: 'Falta de leads calificados' },
          { key: 'D', label: 'Falta de claridad para escalar' },
          { key: 'E', label: 'Falta de claridad con el contenido' },
          { key: 'F', label: 'Todo depende de vos' },
          { key: 'G', label: 'El equipo no rinde' },
          { key: 'H', label: 'Falta de sistemas y métricas' },
          { key: 'I', label: 'Producto poco escalable' },
          { key: 'J', label: 'Problemas operativos' },
        ],
      },
      {
        id: '30',
        type: 'textarea',
        label: '¿Qué identificás como el principal freno de tu negocio en este momento?',
        rows: 3,
      },
      {
        id: '31',
        type: 'textarea',
        label: '¿Cuál es tu objetivo concreto a 4 meses y qué esperás lograr con tu negocio?',
        rows: 3,
      },
    ],
  },
  {
    title: 'BLOQUE 6 — CONTENIDO Y DECISIÓN DE COMPRA',
    questions: [
      {
        id: '32',
        type: 'radio',
        label: '¿Por dónde me conociste?',
        options: [
          { key: 'a', label: 'Instagram' },
          { key: 'b', label: 'YouTube' },
          { key: 'c', label: 'Recomendación (te enviaron mi contenido)' },
          { key: 'd', label: 'Otro' },
        ],
      },
      {
        id: '33',
        type: 'radio',
        label: '¿Qué formato de mi contenido te aporta o te gusta más?',
        options: [
          { key: 'a', label: 'Historias' },
          { key: 'b', label: 'Reels' },
          { key: 'c', label: 'YouTube' },
        ],
      },
      { id: '34', type: 'textarea', label: '¿Por qué elegiste ese formato?', rows: 3 },
      {
        id: '35',
        type: 'radio',
        label: '¿Qué tipo de Reels te gustan más de mi Instagram?',
        options: [
          { key: 'a', label: 'Reels dinámicos/editados' },
          { key: 'b', label: 'Reels crudos/simples' },
        ],
      },
      {
        id: '36',
        type: 'checkbox',
        label: '¿Qué hace que te gusten esos Reels?',
        options: [
          { key: 'a', label: 'Es diferente a lo que todos hacen' },
          { key: 'b', label: 'Transmite confianza y autoridad' },
          { key: 'c', label: 'Son creativos y entretenidos' },
          { key: 'd', label: 'Es auténtico y real' },
          { key: 'e', label: 'Cambian mi perspectiva' },
          { key: 'f', label: 'Aportan valor' },
          { key: 'g', label: 'Otro' },
        ],
      },
      {
        id: '37',
        type: 'radio',
        label: '¿Qué tipo de videos te gustan o te aportan más en mi YouTube?',
        options: [
          { key: 'a', label: 'Formato en Miro (valor/técnico)' },
          { key: 'b', label: 'Formato en Google Docs (valor/técnico)' },
          { key: 'c', label: 'Formato hablando a cámara (valor/técnico)' },
          { key: 'd', label: 'Formato hablando a cámara (mentalidad)' },
        ],
      },
      {
        id: '38',
        type: 'textarea',
        label: '¿Qué hace que te gusten los videos de YouTube?',
        rows: 3,
      },
      {
        id: '39',
        type: 'textarea',
        label: '¿Qué te gusta o aporta más de las Historias?',
        rows: 3,
      },
      {
        id: '40',
        type: 'checkbox',
        label: '¿Qué te hizo finalmente decir "SÍ" y entrar a ATV?',
        options: [
          { key: 'a', label: 'La convicción y confianza de Juan en el contenido' },
          { key: 'b', label: 'La información dentro del programa' },
          { key: 'c', label: 'El roadmap y claridad que podía obtener' },
          { key: 'd', label: 'El estilo de vida de Juan y ATV' },
          { key: 'e', label: 'Los valores de Juan y ATV' },
          { key: 'f', label: 'La velocidad con la que escalan negocios' },
          { key: 'g', label: 'Los casos de éxito' },
          { key: 'h', label: 'El método Evergreen Value' },
          { key: 'i', label: 'Otro' },
        ],
      },
      {
        id: '41',
        type: 'textarea',
        label: '¿Qué te motivó específicamente a tomar acción?',
        rows: 3,
      },
      {
        id: '42',
        type: 'radio',
        label: '¿Cuánto tiempo tardaste en decidirte a trabajar con nosotros?',
        options: [
          { key: 'a', label: 'Menos de 1 mes' },
          { key: 'b', label: '1 a 3 meses' },
          { key: 'c', label: 'Más de 6 meses' },
          { key: 'd', label: 'Otro' },
        ],
      },
      {
        id: '43',
        type: 'checkbox',
        label: '¿Qué creés que podría haber funcionado mejor para que te decidieras antes?',
        options: [
          { key: 'a', label: 'Mejor llamada de venta' },
          { key: 'b', label: 'Mejor proceso en el setting' },
          { key: 'c', label: 'Más frecuencia de contenido' },
          { key: 'd', label: 'Más ángulos en el contenido' },
          { key: 'e', label: 'Más testimonios/casos de éxito' },
          { key: 'f', label: 'Conocer más la vida personal de Juan' },
          { key: 'g', label: 'Conocer más el producto/programa por dentro' },
          { key: 'h', label: 'Otro' },
        ],
      },
      {
        id: '44',
        type: 'textarea',
        label: '¿Qué aspecto del punto que elegiste antes creés que se podría mejorar?',
        rows: 3,
      },
      {
        id: '45',
        type: 'number',
        label:
          'Antes de la llamada, ¿qué tan convencido estabas de ingresar, en una escala del 1 al 10?',
        min: 1,
        max: 10,
      },
      {
        id: '46',
        type: 'textarea',
        label: '¿Qué fue lo último que te convenció para tomar la decisión?',
        rows: 3,
      },
      {
        id: '47',
        type: 'radio',
        label: '¿Qué fue lo que impedía que compres?',
        options: [
          { key: 'a', label: 'Precio' },
          { key: 'b', label: 'Confianza' },
          { key: 'c', label: 'Tiempo' },
          { key: 'd', label: 'Falta de claridad en el servicio' },
          { key: 'e', label: 'Otro' },
        ],
      },
      {
        id: '48',
        type: 'radio',
        label: '¿Qué programa compraste?',
        options: [
          { key: 'a', label: 'Mentoría' },
          { key: 'b', label: 'Advantage' },
          { key: 'c', label: 'Boost' },
        ],
      },
      {
        id: '49',
        type: 'textarea',
        label:
          '¿Hay algo dentro de ATV que descubriste cuando entraste y que si te lo hubiese mostrado antes, iba a ayudar a tu decisión?',
        rows: 3,
      },
    ],
  },
];

function ChoiceGroup({ name, options, multi = false, value, onChange, readOnly = false }) {
  const selectedValues = multi
    ? value
      ? value.split(', ').filter(Boolean)
      : []
    : [value].filter(Boolean);

  function handleSelect(optionLabel) {
    if (readOnly) return;

    if (multi) {
      const next = selectedValues.includes(optionLabel)
        ? selectedValues.filter((v) => v !== optionLabel)
        : [...selectedValues, optionLabel];
      onChange(next.join(', '));
    } else {
      onChange(optionLabel);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${readOnly ? 'pointer-events-none opacity-70' : ''}`}>
      {options.map((opt) => {
        const isSelected = selectedValues.includes(opt.label);
        return (
          <button
            key={`${name}-${opt.key}-${opt.label}`}
            type="button"
            onClick={() => handleSelect(opt.label)}
            disabled={readOnly}
            className="choice-btn cursor-pointer flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all duration-150 hover:border-[rgba(230,57,70,0.4)] hover:bg-[rgba(230,57,70,0.05)] disabled:cursor-default"
            style={{
              borderColor: isSelected ? 'rgba(230,57,70,0.6)' : 'rgba(255,255,255,0.08)',
              background: isSelected ? 'rgba(230,57,70,0.08)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <span
              className="choice-key w-6 h-6 rounded-md border bg-[rgba(255,255,255,0.05)] text-[11px] font-bold flex items-center justify-center shrink-0 uppercase"
              style={{
                borderColor: isSelected ? '#e63946' : 'rgba(255,255,255,0.15)',
                color: isSelected ? '#e63946' : 'rgba(255,255,255,0.4)',
              }}
            >
              {opt.key}
            </span>
            <span className="text-[13.5px] text-[rgba(255,255,255,0.6)]">{opt.label}</span>
          </button>
        );
      })}
      <input type="hidden" name={name} value={value || ''} readOnly />
    </div>
  );
}

function QuestionField({ question, value, onChange, readOnly, inputClass, readOnlyClass }) {
  const labelClass = 'text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]';

  if (question.type === 'textarea') {
    return (
      <textarea
        name={question.id}
        rows={question.rows || 3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        readOnly={readOnly}
        disabled={readOnly}
        className={`${inputClass} resize-none${readOnlyClass}`}
      />
    );
  }

  if (question.type === 'number') {
    return (
      <input
        type="number"
        name={question.id}
        min={question.min}
        max={question.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${question.min}–${question.max}`}
        readOnly={readOnly}
        disabled={readOnly}
        className={`${inputClass}${readOnlyClass}`}
      />
    );
  }

  if (question.type === 'radio' || question.type === 'checkbox') {
    return (
      <ChoiceGroup
        name={question.id}
        options={question.options}
        multi={question.type === 'checkbox'}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
      />
    );
  }

  return null;
}

export default function OnboardingForm({
  readOnly = false,
  initialData = null,
  onSubmitted,
  onPrevious,
  onContinue,
}) {
  const emptyForm = useMemo(() => createEmptyForm(), []);
  const [form, setForm] = useState(emptyForm);
  const [sessionId, setSessionId] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [submitState, setSubmitState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const completedCount = useMemo(() => countCompletedFields(form), [form]);
  const progressPercent = Math.round((completedCount / TOTAL_QUESTIONS) * 100);
  const hayRespuestasCompletadas = completedCount >= MIN_FIELDS_FOR_UNLOAD_GUARD;

  useEffect(() => {
    if (readOnly) {
      if (initialData) {
        setForm({ ...emptyForm, ...initialData });
      }
      return undefined;
    }

    let cancelled = false;

    async function initFormState() {
      try {
        const session = await getSession();
        if (cancelled) return;

        const id = session?.id ? String(session.id) : null;
        setSessionId(id);

        if (id) {
          const draft = loadDraft(id);
          if (draft) {
            setForm({ ...emptyForm, ...draft });
            setDraftRestored(true);
            return;
          }
        }

        if (initialData) {
          setForm({ ...emptyForm, ...initialData });
        }
      } catch {
        if (!cancelled && initialData) {
          setForm({ ...emptyForm, ...initialData });
        }
      }
    }

    initFormState();

    return () => {
      cancelled = true;
    };
  }, [readOnly, initialData, emptyForm]);

  useEffect(() => {
    if (readOnly || !sessionId || submitState === 'success') return undefined;

    const timer = setTimeout(() => {
      saveDraft(sessionId, form);
    }, 500);

    return () => clearTimeout(timer);
  }, [form, sessionId, readOnly, submitState]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (submitState !== 'success' && hayRespuestasCompletadas) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submitState, hayRespuestasCompletadas]);

  function updateField(field, value) {
    if (readOnly) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (readOnly) return;

      setSubmitState('loading');
      setErrorMsg('');

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          await submitForm(form);
          clearDraft(sessionId);
          setSubmitState('success');
          onSubmitted(form);
          return;
        } catch (err) {
          if (err.message?.includes('ya fue enviado')) {
            clearDraft(sessionId);
            setSubmitState('success');
            onSubmitted();
            return;
          }

          attempts += 1;
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1500 * attempts));
          } else {
            setSubmitState('error');
            setErrorMsg(err.message || 'Error al enviar');
          }
        }
      }
    },
    [form, onSubmitted, readOnly, sessionId],
  );

  const inputClass =
    'w-full px-4 py-3 rounded-lg text-[14px] text-white placeholder-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] outline-none focus:border-[rgba(230,57,70,0.5)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)] transition-all duration-150';
  const readOnlyClass = readOnly ? ' opacity-70 cursor-default' : '';

  const isSubmitting = submitState === 'loading';

  return (
    <>
      <h1 className="text-[30px] font-bold tracking-[-0.03em] text-white mb-[0.6rem] leading-[1.2]">
        ONBOARDING ATV
      </h1>
      <p className="text-[15px] text-[rgba(255,255,255,0.45)] mb-9 leading-[1.55] tracking-[-0.01em]">
        {readOnly
          ? 'Tus respuestas ya fueron enviadas. Revisá la información que nos compartiste.'
          : 'Contanos sobre vos para personalizar tu experiencia.'}
      </p>

      {!readOnly && (
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-[rgba(255,255,255,0.55)] tracking-[-0.01em]">
              {completedCount} de {TOTAL_QUESTIONS} preguntas completadas
            </p>
            <p className="text-[13px] font-medium text-[rgba(255,255,255,0.75)] tabular-nums">
              {progressPercent}%
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#e63946] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso del formulario"
            />
          </div>
        </div>
      )}

      {draftRestored && !readOnly && (
        <div className="mb-6 rounded-lg border border-[rgba(230,57,70,0.25)] bg-[rgba(230,57,70,0.08)] px-4 py-3">
          <p className="text-[13px] text-[rgba(255,255,255,0.75)] leading-relaxed tracking-[-0.01em]">
            Tenés respuestas guardadas de una sesión anterior. Se cargaron automáticamente.
          </p>
        </div>
      )}

      <form
        id="onboarding-form"
        onSubmit={handleSubmit}
        className={`flex flex-col gap-10 ${readOnly ? 'opacity-90' : ''}`}
      >
        {BLOCKS.map((block) => (
          <section key={block.title} className="flex flex-col gap-6">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#e63946] border-b border-[rgba(230,57,70,0.2)] pb-3">
              {block.title}
            </h2>

            {block.questions.map((question) => (
              <div key={question.id} className="flex flex-col gap-2">
                <label
                  htmlFor={question.id}
                  className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]"
                >
                  {question.id} — {question.label}
                </label>
                <QuestionField
                  question={question}
                  value={form[question.id] || ''}
                  onChange={(v) => updateField(question.id, v)}
                  readOnly={readOnly}
                  inputClass={inputClass}
                  readOnlyClass={readOnlyClass}
                />
              </div>
            ))}
          </section>
        ))}

        {submitState === 'error' && !readOnly && (
          <p className="text-[12.5px] text-[#e63946] leading-relaxed">
            Error al enviar. Tus respuestas están guardadas localmente. Intentá de nuevo.
            {errorMsg ? ` (${errorMsg})` : ''}
          </p>
        )}

        <div className="flex gap-[10px] items-stretch">
          <button
            type="button"
            onClick={onPrevious}
            className="btn-secondary flex items-center rounded-lg px-5 py-[0.8rem] text-[14.5px] font-sans tracking-[-0.01em] cursor-pointer whitespace-nowrap border-0"
          >
            ← Anterior
          </button>
          {readOnly ? (
            <button
              type="button"
              onClick={onContinue}
              className="btn-primary flex flex-1 items-center justify-center rounded-lg px-6 py-[0.85rem] text-[15px] font-semibold font-sans tracking-[-0.01em] cursor-pointer border-0 text-white"
            >
              Ver próximos pasos →
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              id="submit-btn"
              className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-[0.85rem] text-[15px] font-semibold font-sans tracking-[-0.01em] cursor-pointer border-0 text-white disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <SubmitSpinner />
                  Enviando...
                </>
              ) : (
                'Enviar respuestas'
              )}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
