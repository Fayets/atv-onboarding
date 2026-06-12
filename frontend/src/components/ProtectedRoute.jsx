import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSession } from '../api/client';

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    getSession()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('denied'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-3.5 font-sans text-white">
        <span className="text-[rgba(255,255,255,0.4)]">Cargando...</span>
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/" replace />;
  }

  return children;
}
