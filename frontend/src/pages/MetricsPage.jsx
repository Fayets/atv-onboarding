import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout, { LOGO_URL } from '../components/Layout';
import { ApiError, getMetrics } from '../api/client';

const THEME_STORAGE_KEY = 'atv-dashboard-theme';

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

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return 'dark';
}

function getQuestionLabel(key) {
  return QUESTION_LABELS[key] ?? QUESTION_LABELS[String(key)] ?? `Pregunta ${key}`;
}

function sortMetricEntries(entries) {
  return [...entries].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function MetricBar({ label, count, total, theme }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-3">
        <span className={`text-[13px] leading-snug ${theme === 'light' ? 'text-[rgba(17,24,39,0.88)]' : 'text-[rgba(255,255,255,0.85)]'}`}>
          {label}
        </span>
        <span className={`text-[12px] tabular-nums shrink-0 ${theme === 'light' ? 'text-[rgba(17,24,39,0.55)]' : 'text-[rgba(255,255,255,0.45)]'}`}>
          {count} ({percent}%)
        </span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${theme === 'light' ? 'bg-[rgba(17,24,39,0.08)]' : 'bg-[rgba(255,255,255,0.08)]'}`}>
        <div
          className="h-full rounded-full bg-[#e63946] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function MetricsPage() {
  const navigate = useNavigate();
  const [theme] = useState(getInitialTheme);
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
      <div className="dashboard-page" data-theme={theme}>
        <div className="shell-card shell-fullscreen dashboard-shell flex flex-col w-full min-h-0 flex-1 overflow-hidden">
          <div className="relative z-[1] flex flex-col flex-1 min-h-0 p-5 sm:p-6 md:p-8 tracking-[-0.01em]">
            <div className="relative mb-6 shrink-0">
              <div className="absolute top-0 right-0 z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="dashboard-btn-secondary rounded-lg px-4 py-2.5 text-[14px] cursor-pointer"
                >
                  ← Dashboard
                </button>
                <button
                  type="button"
                  onClick={loadMetrics}
                  className="dashboard-btn-secondary rounded-lg px-4 py-2.5 text-[14px] cursor-pointer"
                >
                  Actualizar
                </button>
              </div>
              <div className="flex justify-center pt-1 pb-5">
                <img
                  src={LOGO_URL}
                  alt="Aumenta Tu Valor"
                  width="140"
                  className={`dashboard-logo ${theme === 'light' ? 'dashboard-logo--light' : ''}`}
                />
              </div>
              <div className="text-center">
                <h1 className="dashboard-title text-[24px] md:text-[28px] font-bold tracking-[-0.03em] mb-2">
                  Métricas de onboarding
                </h1>
                <p className="dashboard-muted text-[14px]">
                  {loading
                    ? 'Cargando métricas...'
                    : `Basado en ${withForm} formulario${withForm === 1 ? '' : 's'} completado${withForm === 1 ? '' : 's'}`}
                </p>
                {metricsData && (
                  <p className="dashboard-muted text-[12px] mt-1">
                    {metricsData.total_sessions} sesión{metricsData.total_sessions === 1 ? '' : 'es'} en total
                  </p>
                )}
              </div>
            </div>

            {error && (
              <p className="mb-4 text-[13px] text-[#e63946] shrink-0">{error}</p>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto rounded-xl dashboard-table-wrap p-4 sm:p-5">
              {loading ? (
                <p className="dashboard-muted p-2">Cargando métricas...</p>
              ) : (
                <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
                  {sections.map((section) => (
                    <section key={section.key} className="flex flex-col gap-4">
                      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#e63946]">
                        {section.title}
                      </h2>
                      {section.entries.length === 0 ? (
                        <p className="dashboard-muted text-[13px]">Sin respuestas todavía.</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {section.entries.map(([label, count]) => (
                            <MetricBar
                              key={`${section.key}-${label}`}
                              label={label}
                              count={count}
                              total={withForm}
                              theme={theme}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
