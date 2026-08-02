import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout, { ADMIN_LOGO_URL } from '../components/Layout';
import { getSession, login } from '../api/client';

function LoginSpinner() {
  return <span className="login-spinner" aria-hidden="true" />;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const passwordRef = useRef(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getSession()
      .then(() => navigate('/start', { replace: true }))
      .catch(() => setCheckingSession(false));
  }, [navigate]);

  useEffect(() => {
    if (!checkingSession) {
      passwordRef.current?.focus();
    }
  }, [checkingSession]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(password.trim());
      navigate('/start');
    } catch (err) {
      setError(err.message || 'Contraseña incorrecta o expirada.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Acceso — ATV" fullScreen>
      <div className="login-page">
        <div className="atv-page__glow atv-page__glow--login" aria-hidden="true" />

        <main className="login-main">
          <div className={`login-panel${checkingSession ? ' login-panel--loading' : ''}`}>
            <div className="login-hero">
              {checkingSession ? (
                <>
                  <h1 className="login-hero__title">
                    Verificando
                    <strong>sesión</strong>
                  </h1>
                  <p className="login-hero__lead">
                    Un momento mientras comprobamos tu acceso.
                  </p>
                </>
              ) : (
                <img
                  src={ADMIN_LOGO_URL}
                  alt="Aumenta Tu Valor"
                  className="login-hero__logo"
                  width={176}
                  height={56}
                />
              )}
            </div>

            {checkingSession ? (
              <LoginSpinner />
            ) : (
              <form
                className={`login-form${error ? ' login-form--error' : ''}`}
                onSubmit={handleSubmit}
              >
                {error ? (
                  <p className="login-error" role="alert">
                    {error}
                  </p>
                ) : null}

                <label className="login-field">
                  <span className="login-field__label">Contraseña</span>
                  <span className="login-input">
                    <input
                      ref={passwordRef}
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                  </span>
                </label>

                <button type="submit" className="login-submit btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <LoginSpinner />
                      Ingresando…
                    </>
                  ) : (
                    'Ingresar'
                  )}
                </button>

                <p className="login-footer">
                  ¿Problemas para acceder?{' '}
                  <a href="mailto:hola@atvos.io">Contactanos</a>
                </p>
              </form>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}
