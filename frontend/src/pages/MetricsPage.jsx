import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ApiError, getMetrics } from '../api/client';

const CHOICE_QUESTION_ORDER = [
  '3',
  '29',
  '32',
  '33',
  '35',
  '36',
  '37',
  '40',
  '42',
  '43',
  '45',
  '47',
  '48',
];

const QUESTION_LABELS = {
  3: 'Rol del cliente',
  29: 'Problemas principales para escalar',
  32: '¿Por dónde conoció a ATV?',
  33: 'Formato de contenido favorito',
  35: 'Tipo de Reels preferido',
  36: '¿Qué hace que le gusten esos Reels?',
  37: 'Tipo de videos de YouTube preferido',
  40: '¿Qué lo hizo decir SÍ a ATV?',
  42: 'Tiempo en decidirse',
  43: '¿Qué podría haber funcionado mejor?',
  45: 'Nivel de convicción antes de la llamada (1-10)',
  47: '¿Qué impedía la compra?',
  48: 'Programa comprado',
};

function getQuestionLabel(key) {
  return QUESTION_LABELS[key] ?? QUESTION_LABELS[String(key)] ?? `Pregunta ${key}`;
}

function sortMetricEntries(entries) {
  return [...entries].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function StatCard({ label, value, loading }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-5 py-4 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.45)] mb-1.5">
        {label}
      </p>
      <p className="text-[28px] font-bold tracking-[-0.03em] text-white tabular-nums">
        {loading ? '—' : value}
      </p>
    </div>
  );
}

function MetricBar({ label, count, total }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] leading-snug text-[rgba(255,255,255,0.75)]">{label}</span>
        <span className="text-[12px] tabular-nums shrink-0 text-[rgba(255,255,255,0.45)]">
          {count} · {percent}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full rounded-full bg-[#e63946] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function QuestionCard({ title, entries, withForm }) {
  const totalResponses = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <article className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5 sm:p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#e63946] leading-relaxed">
          {title}
        </h2>
        <p className="mt-2 text-[12px] text-[rgba(255,255,255,0.45)]">
          {totalResponses} respuesta{totalResponses === 1 ? '' : 's'}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-[13px] text-[rgba(255,255,255,0.35)]">Sin respuestas todavía.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map(([label, count]) => (
            <MetricBar
              key={label}
              label={label}
              count={count}
              total={withForm}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export default function MetricsPage() {
  const navigate = useNavigate();
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);

  const loadMetrics = useCallback(async () => {
    setError('');
    setUnauthorized(false);
    setLoading(true);
    try {
      const data = await getMetrics();
      setMetricsData(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUnauthorized(true);
      } else {
        setError(err.message || 'No se pudieron cargar las métricas.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const withForm = metricsData?.with_form ?? 0;
  const totalSessions = metricsData?.total_sessions ?? 0;

  const sections = useMemo(() => {
    if (!metricsData?.metrics) return [];

    return CHOICE_QUESTION_ORDER.map((questionKey) => {
      const counts = metricsData.metrics[questionKey] || {};
      const entries = sortMetricEntries(Object.entries(counts));
      return {
        key: questionKey,
        title: getQuestionLabel(questionKey),
        entries,
      };
    });
  }, [metricsData]);

  if (!loading && unauthorized) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout title="Métricas — ATV" fullScreen>
      <div className="dashboard-page min-h-0 flex-1 w-full bg-[#0a0a0a] text-white overflow-hidden flex flex-col" data-theme="dark">
        <div className="relative z-[1] flex flex-col flex-1 min-h-0 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 tracking-[-0.01em]">
          <div className="relative mb-8 shrink-0">
            <div className="absolute top-0 left-0 z-10">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="dashboard-btn-secondary rounded-lg px-4 py-2.5 text-[14px] cursor-pointer"
              >
                ← Dashboard
              </button>
            </div>
            <div className="absolute top-0 right-0 z-10">
              <button
                type="button"
                onClick={loadMetrics}
                className="dashboard-btn-secondary rounded-lg px-4 py-2.5 text-[14px] cursor-pointer"
              >
                Actualizar
              </button>
            </div>

            <div className="pt-12 sm:pt-14 text-center max-w-3xl mx-auto">
              <h1 className="text-[24px] md:text-[28px] font-bold tracking-[-0.03em] text-white mb-6">
                Métricas de onboarding
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                <StatCard label="Formularios completados" value={withForm} loading={loading} />
                <StatCard label="Sesiones totales" value={totalSessions} loading={loading} />
              </div>
            </div>
          </div>

          {error && (
            <p className="mb-4 text-[13px] text-[#e63946] shrink-0 text-center">{error}</p>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto pb-4">
            {loading ? (
              <p className="text-[14px] text-[rgba(255,255,255,0.45)] text-center py-8">
                Cargando métricas...
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 max-w-6xl mx-auto w-full">
                {sections.map((section) => (
                  <QuestionCard
                    key={section.key}
                    title={section.title}
                    entries={section.entries}
                    withForm={withForm}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
