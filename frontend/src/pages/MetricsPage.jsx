import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout, { ADMIN_LOGO_URL } from '../components/Layout';
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
    <div className="metrics-stat-card">
      <p className="metrics-stat-card__label">{label}</p>
      <p className="metrics-stat-card__value">{loading ? '—' : value}</p>
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
      <div className="metrics-bar-track">
        <div className="metrics-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function QuestionCard({ title, entries, withForm }) {
  const totalResponses = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <article className="metrics-question-card">
      <div>
        <h2 className="metrics-question-card__title">{title}</h2>
        <p className="metrics-question-card__meta">
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
      <div className="atv-module-page" data-theme="dark">
        <div className="atv-page__glow atv-page__glow--module" aria-hidden="true" />

        <header className="atv-module-header">
          <img
            src={ADMIN_LOGO_URL}
            alt="Aumenta Tu Valor"
            className="atv-module-logo"
            width={112}
            height={36}
          />
          <div className="atv-module-header__actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary atv-module-action-btn"
            >
              ← Dashboard
            </button>
            <button
              type="button"
              onClick={loadMetrics}
              className="btn-secondary atv-module-action-btn"
            >
              Actualizar
            </button>
          </div>
        </header>

        <main className="atv-module-main">
          <div className="atv-glass-panel">
            <div className="atv-glass-panel__intro">
              <h1 className="atv-module-title">
                Métricas de
                <strong>onboarding</strong>
              </h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mt-4">
                <StatCard label="Formularios completados" value={withForm} loading={loading} />
                <StatCard label="Sesiones totales" value={totalSessions} loading={loading} />
              </div>
            </div>

            {error && (
              <p className="mb-4 text-[13px] text-[#e63946] shrink-0">{error}</p>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto pb-1">
              {loading ? (
                <p className="text-[14px] text-[rgba(255,255,255,0.45)] py-4">
                  Cargando métricas...
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 w-full">
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
        </main>
      </div>
    </Layout>
  );
}
