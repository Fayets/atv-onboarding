import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout, { ADMIN_LOGO_URL } from '../components/Layout';
import FormResponsesModal from '../components/FormResponsesModal';
import {
  ApiError,
  deleteSession,
  getDashboard,
  getSessionAccessPassword,
  getSessionForm,
  resendSessionAccess,
  updateSessionEstado,
} from '../api/client';

const THEME_STORAGE_KEY = 'atv-dashboard-theme';

const PLAN_OPTIONS = ['Todos', 'Boost', 'Mentoría', 'Advantage'];
const ESTADO_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'formulario_completo', label: 'Formulario completo' },
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

function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="14" height="14" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14.12 14.12a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="14" height="14" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
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
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getInitialTheme);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [revealedPasswordIds, setRevealedPasswordIds] = useState({});

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('Todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
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

      return true;
    });
  }, [sessions, search, planFilter, estadoFilter]);

  const sortedSessions = useMemo(() => {
    const sorted = [...filteredSessions];

    sorted.sort((a, b) => {
      const aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bValue = b.created_at ? new Date(b.created_at).getTime() : 0;

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredSessions, sortDirection]);

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

  async function handleDeleteSession(session) {
    const clientLabel = session.client_name || session.client_email || 'este cliente';
    const confirmed = window.confirm(
      `¿Eliminar a ${clientLabel}? Se borrarán sus datos de onboarding y no se puede deshacer.`,
    );
    if (!confirmed) return;

    setActionLoadingId(`${session.id}-delete`);
    setError('');
    try {
      await deleteSession(session.id);
      if (formModalSession?.id === session.id) {
        closeFormModal();
      }
      setVisiblePasswords((prev) => {
        const next = { ...prev };
        delete next[session.id];
        return next;
      });
      setRevealedPasswordIds((prev) => {
        const next = { ...prev };
        delete next[session.id];
        return next;
      });
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el cliente.');
    } finally {
      setActionLoadingId(null);
    }
  }

  function isEstadoOptionDisabled(session, estado) {
    if (estado === 'enviado') return session.form_submitted;
    if (estado === 'formulario_completo') return !session.form_submitted;
    return false;
  }

  async function handleTogglePassword(session) {
    const sessionId = session.id;

    if (revealedPasswordIds[sessionId] && visiblePasswords[sessionId]) {
      setRevealedPasswordIds((prev) => ({ ...prev, [sessionId]: false }));
      return;
    }

    if (visiblePasswords[sessionId]) {
      setRevealedPasswordIds((prev) => ({ ...prev, [sessionId]: true }));
      return;
    }

    setActionLoadingId(`${sessionId}-password`);
    setError('');
    try {
      const data = await getSessionAccessPassword(sessionId);
      setVisiblePasswords((prev) => ({ ...prev, [sessionId]: data.password }));
      setRevealedPasswordIds((prev) => ({ ...prev, [sessionId]: true }));
    } catch (err) {
      setError(err.message || 'No se pudo obtener la clave de acceso.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleResendAccess(session) {
    const clientLabel = session.client_name || session.client_email || 'este cliente';
    const confirmed = window.confirm(
      `¿Generar y reenviar una nueva clave de acceso a ${clientLabel}? La clave anterior dejará de funcionar.`,
    );
    if (!confirmed) return;

    setActionLoadingId(`${session.id}-resend`);
    setError('');
    try {
      const data = await resendSessionAccess(session.id);
      setVisiblePasswords((prev) => ({ ...prev, [session.id]: data.password }));
      setRevealedPasswordIds((prev) => ({ ...prev, [session.id]: true }));
      setSessions((prev) =>
        prev.map((item) =>
          item.id === session.id
            ? { ...item, has_access_password: true, expires_at: data.expires_at }
            : item,
        ),
      );
      if (!data.email_sent) {
        setError('Clave generada, pero no se pudo enviar el email. Revisá la configuración SMTP.');
      }
    } catch (err) {
      setError(err.message || 'No se pudo reenviar la clave de acceso.');
    } finally {
      setActionLoadingId(null);
    }
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
          </header>
          <main className="atv-module-main">
            <div className="atv-glass-panel atv-glass-panel--center">
              <h1 className="atv-module-title">
                Acceso no
                <strong>autorizado</strong>
              </h1>
              <p className="atv-module-lead">Ingresá desde ATV Ecosystem</p>
            </div>
          </main>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard — ATV" fullScreen>
      <div className="atv-module-page dashboard-page" data-theme={theme}>
        <div className="atv-page__glow atv-page__glow--module" aria-hidden="true" />

        <header className="atv-module-header">
          <div className="atv-module-brand">
            <img
              src={ADMIN_LOGO_URL}
              alt="Aumenta Tu Valor"
              className={`atv-module-logo ${theme === 'light' ? 'dashboard-logo--light' : ''}`}
              width={96}
              height={32}
            />
            <h1 className="atv-module-header-title">Dashboard de onboarding</h1>
          </div>
          <div className="atv-module-header__actions">
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-secondary atv-module-action-btn atv-module-action-btn--icon dashboard-theme-btn"
              aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              onClick={() => navigate('/metrics')}
              className="btn-secondary atv-module-action-btn dashboard-btn-secondary"
            >
              Métricas
            </button>
            <button
              type="button"
              onClick={loadDashboard}
              className="btn-secondary atv-module-action-btn dashboard-btn-secondary"
            >
              Actualizar
            </button>
          </div>
        </header>

        <main className="atv-module-main">
          <div className="atv-glass-panel">
            <div className="shrink-0 mb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
                  <table className="w-full min-w-[980px] border-collapse">
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
                        <th className="dashboard-th text-left text-[11px] uppercase tracking-[0.08em] font-semibold py-2.5 px-3 min-w-[150px]">
                          Clave de acceso
                        </th>
                        <th className="dashboard-th text-center text-[11px] uppercase tracking-[0.08em] font-semibold py-2.5 px-3 w-[72px]">
                          Formulario
                        </th>
                        <th className="dashboard-th text-left text-[11px] uppercase tracking-[0.08em] font-semibold py-2.5 px-3 min-w-[200px]">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSessions.map((session) => {
                        const deleting = actionLoadingId === `${session.id}-delete`;
                        const resending = actionLoadingId === `${session.id}-resend`;
                        const loadingPassword = actionLoadingId === `${session.id}-password`;
                        const hasForm = Boolean(session.form_submitted);
                        const passwordValue = visiblePasswords[session.id];
                        const isRevealed = Boolean(revealedPasswordIds[session.id] && passwordValue);
                        const maskedLabel = session.has_access_password ? '••••••••' : 'Sin clave';

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
                            <td className="py-2.5 px-3 min-w-[150px]">
                              <div className="dashboard-access-key">
                                <span className="dashboard-access-key__value font-mono-num">
                                  {loadingPassword
                                    ? '...'
                                    : isRevealed
                                      ? passwordValue
                                      : maskedLabel}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePassword(session)}
                                  disabled={loadingPassword || (!session.has_access_password && !passwordValue)}
                                  className="dashboard-access-key__toggle btn-secondary"
                                  aria-label={isRevealed ? 'Ocultar clave' : 'Ver clave de acceso'}
                                  title={
                                    session.has_access_password || passwordValue
                                      ? isRevealed
                                        ? 'Ocultar clave'
                                        : 'Ver clave'
                                      : 'Reenviá una clave nueva'
                                  }
                                >
                                  <EyeIcon hidden={isRevealed} />
                                </button>
                              </div>
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
                              <div className="flex flex-row flex-wrap gap-1.5 min-w-[200px]">
                                <button
                                  type="button"
                                  disabled={resending}
                                  onClick={() => handleResendAccess(session)}
                                  className="dashboard-table-action-btn btn-secondary"
                                >
                                  {resending ? '...' : 'Reenviar clave'}
                                </button>
                                <button
                                  type="button"
                                  disabled={deleting}
                                  onClick={() => handleDeleteSession(session)}
                                  className="dashboard-table-action-btn btn-danger"
                                  title="Eliminar cliente"
                                >
                                  {deleting ? '...' : 'Eliminar'}
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
        </main>

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
