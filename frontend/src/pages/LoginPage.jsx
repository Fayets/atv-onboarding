import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout, { LOGO_URL } from '../components/Layout';
import { getSession, login } from '../api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getSession()
      .then(() => navigate('/start', { replace: true }))
      .catch(() => setCheckingSession(false));
  }, [navigate]);

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

  if (checkingSession) {
    return (
      <Layout>
        <div className="text-[rgba(255,255,255,0.4)]">Cargando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Acceso — ATV">
      <div className="shell-card flex items-center justify-center w-full max-w-[420px] min-h-[480px] p-6 sm:p-10 mx-auto sm:mx-0">
        <div className="w-full flex flex-col items-center text-center gap-6">
          <img src={LOGO_URL} alt="ATV" width="120" className="mb-2" />

          <div>
            <h1 className="text-[22px] font-bold text-white tracking-[-0.03em] mb-1">
              Acceso al onboarding
            </h1>
            <p className="text-[13.5px] text-[rgba(255,255,255,0.4)] leading-[1.6]">
              Ingresá la contraseña que recibiste por mail.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-lg text-[14.5px] text-white placeholder-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] outline-none focus:border-[rgba(230,57,70,0.5)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)] transition-all duration-150"
            />

            {error && (
              <p className="text-[12.5px] text-[#e63946] text-left px-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-lg text-[14.5px] font-semibold text-white border-0 cursor-pointer mt-1 disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-[11.5px] text-[rgba(255,255,255,0.2)] mt-2">
            ¿Problemas para acceder?{' '}
            <a
              href="mailto:hola@atvos.io"
              className="text-[rgba(230,57,70,0.7)] hover:text-[#e63946] transition-colors"
            >
              Contactanos
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
