import { useMemo, useState, type FormEvent } from 'react';

type Props = {
  onAuthed: () => void;
};

const ADMIN_ID = 'ADMIN';
const ADMIN_PASSWORD = 'hahaha1234nothere';

export function AdminGate({ onAuthed }: Props) {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => Boolean(adminId.trim() && password.trim()), [adminId, password]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;

    if (adminId.trim().toUpperCase() === ADMIN_ID && password === ADMIN_PASSWORD) {
      onAuthed();
      return;
    }
    setError('Invalid admin credentials');
  }

  return (
    <div className="wrap admin-gate-wrap">
      <div className="card admin-gate-card">
        <div className="admin-gate-head">
          <span className="badge">Secure Access</span>
          <div className="admin-gate-title">Admin Gate</div>
          <div className="admin-gate-sub">
            Enter admin credentials to access warranty workspace.
          </div>
        </div>

        <form onSubmit={onSubmit} className="admin-gate-form">
          <div className="admin-grid">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Admin ID</label>
              <input
                className="input"
                value={adminId}
                placeholder="ADMIN"
                onChange={(e) => setAdminId(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Password</label>
              <div className="password-field-wrap">
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="••••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 4l16 16" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                      <path d="M10.7 10.7A3 3 0 0013.3 13.3" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                      <path d="M9.9 5.2A10.7 10.7 0 0112 5c4.5 0 8 2.8 9.5 7a10.8 10.8 0 01-3.5 4.8" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                      <path d="M6.1 6.1A10.8 10.8 0 002.5 12c1.5 4.2 5 7 9.5 7 1.6 0 3.1-.4 4.4-1.1" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2.5 12c1.5-4.2 5-7 9.5-7s8 2.8 9.5 7c-1.5 4.2-5 7-9.5 7s-8-2.8-9.5-7z" stroke="#333" strokeWidth="2" />
                      <circle cx="12" cy="12" r="3" stroke="#333" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error ? <div className="status" style={{ marginTop: 14 }}>{error}</div> : null}

          <div className="admin-gate-actions">
            <button className={`btn-submit ${canSubmit ? 'active' : ''}`} type="submit">
              Enter Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

