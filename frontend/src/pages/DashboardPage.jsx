import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout, { LOGO_URL } from '../components/Layout';
import FormResponsesModal from '../components/FormResponsesModal';
import {
  ApiError,
  getDashboard,
  getSessionForm,
  markCallCompleted,
  markCallScheduled,
  updateSessionEstado,
} from '../api/client';

const THEME_STORAGE_KEY = 'atv-dashboard-theme';

const PLAN_OPTIONS = ['Todos', 'Boost', 'Mentoría', 'Advantage'];
const ESTADO_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'formulario_completo', label: 'Formulario completo' },
  { value: 'call_agendada', label: 'Call agendada' },
  { value: 'call_realizada', label: 'Call realizada' },
];

const ESTADO_ROW_OPTIONS = ESTADO_OPTIONS.filter(({ value }) => value !== 'todos');

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return 'dark';
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18" aria-hidden="true">
      <path d="M21 14.5A8.5 8.5 0 1112.5 3a6.5 6.5 0 009 11.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SortIndicator({ active, direction }) {
  if (!active) return <span className="opacity-40">↕</span>;
  return <span>{direction === 'asc' ? '↑' : '↓'}</span>;
}

export default function DashboardPage() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('Todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalSession, setFormModalSession] = useState(null);
  const [formModalData, setFormModalData] = useState(null);
  const [formModalLoading, setFormModalLoading] = useState(false);
  const [formModalError, setFormModalError] = useState('');

  const loadDashboard = useCallback(async () => {
    setError('');
    setUnauthorized(false);
    try {
      const data = await getDashboard();
      setSessions(data.sessions || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUnauthorized(true);
      } else {
        setError(err.message || 'No se pudo cargar el dashboard.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sessions.filter((session) => {
      if (query) {
        const name = (session.client_name || '').toLowerCase();
        const email = (session.client_email || '').toLowerCase();
        if (!name.includes(query) && !email.includes(query)) return false;
      }

      if (planFilter !== 'Todos' && session.plan !== planFilter) return false;
      if (estadoFilter !== 'todos' && session.estado_actual !== estadoFilter) return false;
      if (alertsOnly && !session.alerta) return false;

      return true;
    });
  }, [sessions, search, planFilter, estadoFilter, alertsOnly]);

  const sortedSessions = useMemo(() => {
    const sorted = [...filteredSessions];

    sorted.sort((a, b) => {
      let aValue;
      let bValue;

      if (sortField === 'dias_en_estado') {
        aValue = a.dias_en_estado ?? 0;
        bValue = b.dias_en_estado ?? 0;
      } else {
        aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
        bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredSessions, sortField, sortDirection]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  function toggleSort(field) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('desc');
  }

  async function handleMarkScheduled(sessionId) {
    setActionLoadingId(`${sessionId}-scheduled`);
    try {
      await markCallScheduled(sessionId);
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'No se pudo marcar la call como agendada.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleMarkCompleted(sessionId) {
    setActionLoadingId(`${sessionId}-completed`);
    try {
      await markCallCompleted(sessionId);
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'No se pudo marcar la call como realizada.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleEstadoChange(session, newEstado) {
    if (newEstado === session.estado_actual) return;

    setActionLoadingId(`${session.id}-estado`);
    setError('');
    try {
      await updateSessionEstado(session.id, newEstado);
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado.');
    } finally {
      setActionLoadingId(null);
    }
  }

  function isEstadoOptionDisabled(session, estado) {
    if (estado === 'enviado') return session.form_submitted;
    if (estado === 'formulario_completo') return !session.form_submitted;
    if (estado === 'call_agendada' || estado === 'call_realizada') {
      return !session.form_submitted;
    }
    return false;
  }

  async function handleOpenForm(session) {
    if (!session.form_submitted) return;

    setFormModalOpen(true);
    setFormModalSession(session);
    setFormModalData(null);
    setFormModalError('');
    setFormModalLoading(true);

    try {
      const data = await getSessionForm(session.id);
      setFormModalData(data);
    } catch (err) {
      setFormModalError(err.message || 'No se pudieron cargar las respuestas.');
    } finally {
      setFormModalLoading(false);
    }
  }

  function closeFormModal() {
    setFormModalOpen(false);
    setFormModalSession(null);
    setFormModalData(null);
    setFormModalError('');
    setFormModalLoading(false);
  }

  if (!loading && unauthorized) {
    return (
      <Layout title="Dashboard — ATV" fullScreen>
        <div className="dashboard-page" data-theme="dark">
          <div className="shell-card shell-fullscreen dashboard-shell flex flex-col w-full min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <img
                src={LOGO_URL}
                alt="Aumenta Tu Valor"
                width="160"
                className="dashboard-logo mb-8 max-w-[160px] h-auto"
              />
              <h1 className="dashboard-title text-[28px] md:text-[36px] font-bold tracking-[-0.03em] mb-3">
                Acceso no autorizado
              </h1>
              <p className="dashboard-muted text-[15px] md:text-[16px] max-w-sm leading-relaxed">
                Ingresá desde ATV Ecosystem
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard — ATV" fullScreen>
      <div className="dashboard-page" data-theme={theme}>
        <div className="shell-card shell-fullscreen dashboard-shell flex flex-col w-full min-h-0 flex-1 overflow-hidden">
          <div className="relative z-[1] flex flex-col flex-1 min-h-0 p-5 sm:p-6 md:p-8 tracking-[-0.01em]">
            <div className="relative mb-6 shrink-0">
              <div className="absolute top-0 right-0 z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="dashboard-theme-btn w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                  aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
                  title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                >
                  {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                </button>
                <button
                  type="button"
                  onClick={loadDashboard}
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
                  Dashboard de onboarding
                </h1>
                <p className="dashboard-muted text-[14px]">
                  Seguimiento del equipo sobre el avance de cada cliente.
                </p>
              </div>
            </div>

            <div className="shrink-0 mb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="dashboard-input w-full px-4 py-2.5 md:col-span-2 xl:col-span-1"
              />
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="dashboard-select w-full px-4 py-2.5"
                aria-label="Filtrar por plan"
              >
                {PLAN_OPTIONS.map((plan) => (
                  <option key={plan} value={plan}>{plan === 'Todos' ? 'Plan: Todos' : `Plan: ${plan}`}</option>
                ))}
              </select>
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="dashboard-select w-full px-4 py-2.5"
                aria-label="Filtrar por estado"
              >
                {ESTADO_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {value === 'todos' ? 'Estado: Todos' : `Estado: ${label}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setAlertsOnly((prev) => !prev)}
                className={`dashboard-toggle px-4 py-2.5 text-[13px] cursor-pointer ${alertsOnly ? 'active' : ''}`}
              >
                Solo alertas 🔴
              </button>
            </div>

            <div className="shrink-0 mb-4 flex items-center justify-between gap-3">
              <p className="dashboard-muted text-[13px]">
                {sortedSessions.length} cliente{sortedSessions.length === 1 ? '' : 's'}
                {filteredSessions.length !== sessions.length && ` · ${sessions.length} en total`}
              </p>
            </div>

            {error && (
              <p className="mb-4 text-[13px] text-[#e63946] shrink-0">{error}</p>
            )}

            <div className="dashboard-table-wrap flex-1 min-h-0 overflow-auto rounded-xl">
              {loading ? (
                <p className="dashboard-muted p-6">Cargando clientes...</p>
              ) : sortedSessions.length === 0 ? (
                <p className="dashboard-muted p-6">
                  {sessions.length === 0
                    ? 'No hay clientes en onboarding todavía.'
                    : 'Ningún cliente coincide con los filtros.'}
                </p>
              ) : (
                <div className="overflow-x-auto min-h-0">
                  <table className="w-full min-w-[1080px] border-collapse">
                    <thead className="dashboard-thead sticky top-0 z-[1] backdrop-blur-sm">
                      <tr className="dashboard-row">
                        <th className="dashboard-th text-left text-[11px] uppercase tracking-[0.08em] font-semibold py-2.5 px-3">
                          Cliente
                        </th>
                        <th className="dashboard-th text-left text-[11px] uppercase tracking-[0.08em] font-semibold py-2.5 px-3">
                          Email
                        </th>
                        <th className="dashboard-th text-left text-[11px] uppercase tracking-[0.08em] font-semibold py-2.5 px-3">
                          Plan
                        </th>
                        <th className="dashboard-th text-left text-[11px] uppercase tracking-[0.08em] font-semibold py-2.5 px-3">
                          Estado
                        </th>
                        <th className="text-left py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => toggleSort('created_at')}
                            className={`dashboard-sort-btn ${sortField === 'created_at' ? 'active' : ''}`}
                          >
                            Fecha de envío
                            <SortIndicator active={sortField === 'created_at'} direction={sortDirection} />
                          </button>
                        </th>
                        <th className="text-left py-2.5 px-3 min-w-[140px] whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleSort('dias_en_estado')}
                            className={`dashboard-sort-btn ${sortField === 'dias_en_estado' ? 'active' : ''}`}
                          >
                            Días en estado
                            <SortIndicator active={sortField === 'dias_en_estado'} direction={sortDirection} />
                          </button>
                        </th>
                        <th className="dashboard-th text-center text-[11px] uppercase tracking-[0.08em] font-semibold py-2.5 px-3 w-[72px]">
                          Formulario
                        </th>
                        <th className="dashboard-th text-left text-[11px] uppercase tracking-[0.08em] font-semibold py-2.5 px-3 min-w-[220px]">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSessions.map((session) => {
                        const canSchedule = session.form_submitted && !session.call_scheduled_at;
                        const canComplete = Boolean(session.call_scheduled_at) && !session.call_completed_at;
                        const scheduling = actionLoadingId === `${session.id}-scheduled`;
                        const completing = actionLoadingId === `${session.id}-completed`;
                        const hasForm = Boolean(session.form_submitted);

                        return (
                          <tr
                            key={session.id}
                            className="dashboard-row transition-colors"
                          >
                            <td className="py-2.5 px-3 text-[14px] dashboard-title font-medium min-w-[160px]">
                              {session.client_name || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-[13px] dashboard-text">
                              {session.client_email || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-[13px] dashboard-text">
                              {session.plan || '—'}
                            </td>
                            <td className="py-2.5 px-3 min-w-[180px]">
                              <select
                                value={session.estado_actual}
                                onChange={(e) => handleEstadoChange(session, e.target.value)}
                                disabled={actionLoadingId === `${session.id}-estado`}
                                className="dashboard-select dashboard-select--compact w-full max-w-[200px]"
                                aria-label={`Estado de ${session.client_name || 'cliente'}`}
                              >
                                {ESTADO_ROW_OPTIONS.map(({ value, label }) => (
                                  <option
                                    key={value}
                                    value={value}
                                    disabled={isEstadoOptionDisabled(session, value)}
                                  >
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-[13px] dashboard-text-strong font-mono-num whitespace-nowrap">
                              {formatDate(session.created_at)}
                            </td>
                            <td className="py-2.5 px-3 text-[13px] dashboard-text-strong font-mono-num min-w-[72px] whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                {session.alerta && <span aria-hidden="true">🔴</span>}
                                {session.dias_en_estado}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                disabled={!hasForm}
                                onClick={() => handleOpenForm(session)}
                                title={hasForm ? 'Ver formulario' : 'Sin respuestas aún'}
                                aria-label={hasForm ? 'Ver formulario' : 'Formulario pendiente'}
                                className={`dashboard-form-icon-btn ${hasForm ? 'dashboard-form-icon-btn--active' : 'dashboard-form-btn--disabled'}`}
                              >
                                <DocumentIcon />
                              </button>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-row gap-1.5 min-w-[220px]">
                                <button
                                  type="button"
                                  disabled={!canSchedule || scheduling}
                                  onClick={() => handleMarkScheduled(session.id)}
                                  className="dashboard-table-action-btn dashboard-btn-secondary"
                                >
                                  {scheduling ? '...' : 'Call agendada'}
                                </button>
                                <button
                                  type="button"
                                  disabled={!canComplete || completing}
                                  onClick={() => handleMarkCompleted(session.id)}
                                  className="dashboard-table-action-btn btn-primary border-0 text-white"
                                >
                                  {completing ? '...' : 'Call realizada'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <FormResponsesModal
          open={formModalOpen}
          theme={theme}
          sessionMeta={formModalSession}
          formData={formModalData}
          loading={formModalLoading}
          error={formModalError}
          onClose={closeFormModal}
        />
      </div>
    </Layout>
  );
}
