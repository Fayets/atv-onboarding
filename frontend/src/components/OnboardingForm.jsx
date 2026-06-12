import { useEffect, useState } from 'react';
import { submitForm } from '../api/client';

const EMPTY_FORM = {
  nombre: '',
  perfil: '',
  nicho: '',
  oferta: '',
  precio: '',
  cliente_ideal: '',
  facturacion_actual: '',
  meta_90: '',
  activos: '',
  objetivo: '',
  obstaculos: '',
  extra: '',
};

const PERFIL_OPTIONS = [
  { key: 'A', label: 'Operador con creador — Ya gestiono un creador o cliente' },
  { key: 'B', label: 'Soy el creador — Tengo mi propia marca personal' },
  { key: 'C', label: 'Desde cero — Sin cliente, aprendiendo la habilidad' },
];

const FACTURACION_OPTIONS = [
  { key: 'A', label: '$0' },
  { key: 'B', label: '$1K–$3K/mes' },
  { key: 'C', label: '$3K–$7K/mes' },
  { key: 'D', label: '$7K–$15K/mes' },
  { key: 'E', label: '+$15K/mes' },
];

const META_OPTIONS = [
  { key: 'A', label: '$3K/mes' },
  { key: 'B', label: '$5K/mes' },
  { key: 'C', label: '$10K/mes' },
  { key: 'D', label: '$20K/mes' },
  { key: 'E', label: '+$20K/mes' },
];

const ACTIVOS_OPTIONS = [
  { key: 'A', label: 'ManyChat' },
  { key: 'B', label: 'Setter / Equipo de ventas' },
  { key: 'C', label: 'Landing page' },
  { key: 'D', label: 'VSL grabado' },
  { key: 'E', label: 'Anuncios activos' },
  { key: 'F', label: 'CRM activo' },
  { key: 'G', label: 'Nada todavía' },
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
            key={opt.key + opt.label}
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
              className="choice-key w-6 h-6 rounded-md border bg-[rgba(255,255,255,0.05)] text-[11px] font-bold flex items-center justify-center shrink-0"
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

export default function OnboardingForm({
  readOnly = false,
  initialData = null,
  onSubmitted,
  onPrevious,
  onContinue,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({ ...EMPTY_FORM, ...initialData });
    }
  }, [initialData]);

  function updateField(field, value) {
    if (readOnly) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (readOnly) return;

    setError('');
    setLoading(true);

    try {
      await submitForm(form);
      onSubmitted(form);
    } catch (err) {
      if (err.message?.includes('ya fue enviado')) {
        onSubmitted();
        return;
      }
      setError(err.message || 'Error al enviar');
      setLoading(false);
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-lg text-[14px] text-white placeholder-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] outline-none focus:border-[rgba(230,57,70,0.5)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)] transition-all duration-150';
  const readOnlyClass = readOnly ? ' opacity-70 cursor-default' : '';

  return (
    <>
      <h1 className="text-[30px] font-bold tracking-[-0.03em] text-white mb-[0.6rem] leading-[1.2]">
        Tu perfil
      </h1>
      <p className="text-[15px] text-[rgba(255,255,255,0.45)] mb-9 leading-[1.55] tracking-[-0.01em]">
        {readOnly
          ? 'Tus respuestas ya fueron enviadas. Revisá la información que nos compartiste.'
          : 'Contanos sobre vos para personalizar tu experiencia.'}
      </p>

      <form id="onboarding-form" onSubmit={handleSubmit} className={`flex flex-col gap-6 ${readOnly ? 'opacity-90' : ''}`}>
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            1 — ¿Cuál es tu nombre completo y/o tu canal de Discord?
          </label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={(e) => updateField('nombre', e.target.value)}
            placeholder="Tu nombre o @discord"
            readOnly={readOnly}
            disabled={readOnly}
            className={`${inputClass}${readOnlyClass}`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            2 — ¿Con cuál de estos perfiles te identificás mejor?
          </label>
          <ChoiceGroup
            name="perfil"
            options={PERFIL_OPTIONS}
            value={form.perfil}
            onChange={(v) => updateField('perfil', v)}
            readOnly={readOnly}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            3 — ¿Cuál es tu nicho o industria?
          </label>
          <input
            type="text"
            name="nicho"
            value={form.nicho}
            onChange={(e) => updateField('nicho', e.target.value)}
            placeholder="Ej: fitness, finanzas personales, coaches..."
            readOnly={readOnly}
            disabled={readOnly}
            className={`${inputClass}${readOnlyClass}`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            4 — Describí tu oferta — ¿a quién ayudás, con qué resultado y cómo lo entregás?
          </label>
          <textarea
            name="oferta"
            rows="3"
            value={form.oferta}
            onChange={(e) => updateField('oferta', e.target.value)}
            placeholder="Ej: Ayudo a coaches a conseguir clientes con contenido orgánico..."
            readOnly={readOnly}
            disabled={readOnly}
            className={`${inputClass} resize-none${readOnlyClass}`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            5 — ¿Cuál es el precio de tu oferta principal?
          </label>
          <input
            type="text"
            name="precio"
            value={form.precio}
            onChange={(e) => updateField('precio', e.target.value)}
            placeholder="Ej: $997, $2.000/mes..."
            readOnly={readOnly}
            disabled={readOnly}
            className={`${inputClass}${readOnlyClass}`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            6 — Describí a tu cliente ideal — ¿quién es, qué le duele y qué ya intentó?
          </label>
          <textarea
            name="cliente_ideal"
            rows="3"
            value={form.cliente_ideal}
            onChange={(e) => updateField('cliente_ideal', e.target.value)}
            placeholder="Ej: Emprendedor de 25-40 años que quiere escalar pero no sabe cómo..."
            readOnly={readOnly}
            disabled={readOnly}
            className={`${inputClass} resize-none${readOnlyClass}`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            7 — ¿En qué rango de facturación estás HOY?
          </label>
          <ChoiceGroup
            name="facturacion_actual"
            options={FACTURACION_OPTIONS}
            value={form.facturacion_actual}
            onChange={(v) => updateField('facturacion_actual', v)}
            readOnly={readOnly}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            8 — ¿Cuál es tu meta de facturación en los próximos 90 días?
          </label>
          <ChoiceGroup
            name="meta_90"
            options={META_OPTIONS}
            value={form.meta_90}
            onChange={(v) => updateField('meta_90', v)}
            readOnly={readOnly}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            9 — ¿Qué tenés activo hoy en tu negocio? (Seleccioná todo lo que aplique)
          </label>
          <ChoiceGroup
            name="activos"
            options={ACTIVOS_OPTIONS}
            multi
            value={form.activos}
            onChange={(v) => updateField('activos', v)}
            readOnly={readOnly}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            10 — ¿Cuál es tu objetivo principal al entrar al programa?
          </label>
          <textarea
            name="objetivo"
            rows="3"
            value={form.objetivo}
            onChange={(e) => updateField('objetivo', e.target.value)}
            placeholder="Ej: Quiero escalar a $10K/mes en los próximos 3 meses..."
            readOnly={readOnly}
            disabled={readOnly}
            className={`${inputClass} resize-none${readOnlyClass}`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            11 — ¿Qué obstáculos has tenido hasta ahora para llegar a ese objetivo?
          </label>
          <textarea
            name="obstaculos"
            rows="3"
            value={form.obstaculos}
            onChange={(e) => updateField('obstaculos', e.target.value)}
            placeholder="Ej: No sé cómo conseguir clientes consistentemente..."
            readOnly={readOnly}
            disabled={readOnly}
            className={`${inputClass} resize-none${readOnlyClass}`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] tracking-[-0.01em]">
            12 — ¿Algo más que debamos saber sobre vos o tu negocio?
          </label>
          <textarea
            name="extra"
            rows="3"
            value={form.extra}
            onChange={(e) => updateField('extra', e.target.value)}
            placeholder="Opcional..."
            readOnly={readOnly}
            disabled={readOnly}
            className={`${inputClass} resize-none${readOnlyClass}`}
          />
        </div>

        {error && !readOnly && <p className="text-[12.5px] text-[#e63946]">{error}</p>}

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
              disabled={loading}
              id="submit-btn"
              className="btn-primary flex flex-1 items-center justify-center rounded-lg px-6 py-[0.85rem] text-[15px] font-semibold font-sans tracking-[-0.01em] cursor-pointer border-0 text-white disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar respuestas'}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
