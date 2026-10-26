import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { Icon } from '../components/icons';
import { ErrorState, Loading, useUi } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/hooks';

interface DemoAccounts {
  tuition: { name: string };
  admin: { name: string };
  staff: { id: string; name: string; designation: string; permissionCount: number }[];
}

export function LoginPage() {
  const { me, loginAs } = useAuth();
  const { toast } = useUi();
  const navigate = useNavigate();
  const { data, error, reload } = useApi<DemoAccounts>('/auth/demo-accounts');
  const [busy, setBusy] = useState(false);
  const [staffId, setStaffId] = useState('');

  if (me) return <Navigate to="/" replace />;

  const go = async (role: 'admin' | 'staff') => {
    setBusy(true);
    try {
      await loginAs(role, role === 'staff' ? staffId || data?.staff[0]?.id : undefined);
      navigate('/');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <svg className="login-lines" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${520 + i * 60} -10 C ${420 + i * 50} 200, ${700 + i * 30} 380, ${560 + i * 40} 620`} fill="none" stroke="#00d9a6" strokeOpacity={0.25 - i * 0.04} strokeWidth="1.3" />
        ))}
      </svg>
      <div className="stack" style={{ gap: 24, position: 'relative' }}>
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">T</span>
          <span>Tutor<span className="accent-text">Desk</span></span>
        </div>
        <h1 className="display">
          Everything your tuition needs, <span className="accent-text">in one place.</span>
        </h1>
        <p className="muted" style={{ fontSize: 17, maxWidth: 520, margin: 0 }}>
          Students, attendance, fees, exams and parent messages — built for tuition owners and teachers.
        </p>
        <div className="feature-tiles">
          <div className="feature-tile" style={{ background: 'var(--cream)', color: 'var(--on-cream)' }}>
            <span className="well" style={{ background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: '50%' }}><Icon name="check" /></span>
            <div><div className="h2">Attendance in a minute</div><div className="small" style={{ opacity: 0.75 }}>Mark a class, lock it, notify parents.</div></div>
          </div>
          <div className="feature-tile" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
            <span className="well" style={{ background: 'var(--on-accent)', color: 'var(--accent)', borderRadius: '50%' }}><Icon name="chart" /></span>
            <div><div className="h2">Results to parents</div><div className="small" style={{ opacity: 0.75 }}>Marks become ready-to-send messages.</div></div>
          </div>
        </div>
      </div>

      <div className="card stack" style={{ position: 'relative', padding: 28 }}>
        <div>
          <div className="label">Choose a preview</div>
          <h2 className="h2" style={{ marginTop: 6 }}>{data?.tuition.name ?? 'Demo tuition'}</h2>
        </div>
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data ? (
          <Loading rows={3} />
        ) : (
          <>
            <button className="btn cream-btn pill-cta" disabled={busy} onClick={() => go('admin')}>
              <span style={{ flex: 1, textAlign: 'left' }}>Admin · {data.admin.name}</span>
              <span className="dot"><Icon name="arrow" /></span>
            </button>
            <div className="divider" style={{ margin: '4px 0' }} />
            <label className="field">
              <span>Staff member</span>
              <select className="select" value={staffId || data.staff[0]?.id} onChange={(e) => setStaffId(e.target.value)}>
                {data.staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.designation} ({s.permissionCount} permissions)</option>
                ))}
              </select>
            </label>
            <button className="btn pill-cta" disabled={busy} onClick={() => go('staff')}>
              <span style={{ flex: 1, textAlign: 'left' }}>Staff preview</span>
              <span className="dot" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}><Icon name="arrow" /></span>
            </button>
          </>
        )}
        <p className="small faint" style={{ margin: 0 }}>
          Demo access modes — no password. Sample data lives in the API's memory and resets when it restarts. No real SMS is sent.
        </p>
      </div>
    </div>
  );
}
