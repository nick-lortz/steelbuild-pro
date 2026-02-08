import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getBackendProvider } from '@/api/client';
import { ownedRequest } from '@/api/client/ownedHttp';
import { clearOwnedSession, parseSupabaseHashTokens, setOwnedSession } from '@/api/client/ownedAuth';

function getRedirectTarget(search) {
  const params = new URLSearchParams(search || '');
  return params.get('redirect') || '/';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const provider = useMemo(() => getBackendProvider(), []);
  const redirectTarget = useMemo(() => getRedirectTarget(location.search), [location.search]);

  useEffect(() => {
    if (provider !== 'owned') {
      navigate('/', { replace: true });
      return;
    }

    const fromHash = parseSupabaseHashTokens(window.location.hash);
    if (fromHash.access_token) {
      setOwnedSession(fromHash);
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      navigate(redirectTarget, { replace: true });
    }
  }, [navigate, provider, redirectTarget]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await ownedRequest('/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password }
      });
      const session = response?.data || response;
      if (!session?.access_token) {
        throw new Error('No access token returned');
      }
      setOwnedSession(session);
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Sign In</h1>
          <p className="text-sm text-zinc-400 mt-1">Owned mode authentication</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-zinc-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 rounded-md bg-zinc-950 border border-zinc-700 px-3 text-sm"
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-zinc-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 rounded-md bg-zinc-950 border border-zinc-700 px-3 text-sm"
              placeholder="••••••••"
            />
          </div>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-md bg-amber-500 text-black font-semibold disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            clearOwnedSession();
            navigate('/', { replace: true });
          }}
          className="w-full h-10 rounded-md border border-zinc-700 text-zinc-300 text-sm"
        >
          Continue Without Token (Dev Fallback)
        </button>
      </div>
    </div>
  );
}
