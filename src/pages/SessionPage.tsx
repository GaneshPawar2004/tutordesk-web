import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { api } from '../api/client';
import type { AttendanceSession, AttendanceStatus, Batch } from '../api/types';
import { Icon } from '../components/icons';
import { AttendanceChip, ErrorState, Loading, Notice, PageHead, Stat, Toggles, useUi } from '../components/ui';
import { useMe } from '../lib/auth';
import { fmtDate, fmtTime, pct, plural, relative } from '../lib/format';
import { useApi } from '../lib/hooks';

const AUDIENCES: { value: string; label: string; statuses: AttendanceStatus[] }[] = [
  { value: 'absent', label: 'Absent & leave', statuses: ['absent', 'leave'] },
  { value: 'exceptions', label: 'Absent, late & leave', statuses: ['absent', 'late', 'leave'] },
  { value: 'all', label: 'All parents', statuses: ['present', 'absent', 'late', 'leave'] },
];

export function SessionPage() {
  const { id } = useParams();
  const { me } = useMe();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const { data: s, error, reload } = useApi<AttendanceSession>(`/attendance/sessions/${id}`);
  const [filter, setFilter] = useState<AttendanceStatus | 'all'>('all');
  const [audience, setAudience] = useState('absent');
  const [editing, setEditing] = useState<Record<string, AttendanceStatus> | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!s) return <Loading />;

  const attended = s.counts.present + s.counts.late;
  const statuses = AUDIENCES.find((a) => a.value === audience)!.statuses;
  const recipients = s.students.filter((st) => statuses.includes(st.status)).length;

  const notify = async () => {
    const ok = await confirm({ title: `Send to ${plural(recipients, 'parent')}?`, message: 'Messages are queued on the simulated sender. Demo only — no SMS is actually sent.', confirmLabel: 'Send messages' });
    if (!ok || busy) return;
    setBusy(true);
    try {
      const res = await api<{ created: boolean; batch: Batch }>(`/messages/attendance/${s.id}`, { method: 'POST', body: { statuses } });
      if (!res.created) toast('A batch already exists for this session — nothing was resent.', 'error');
      navigate(`/messages/${res.batch.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveCorrection = async () => {
    if (!editing) return;
    const note = await confirm({ title: 'Save correction?', message: 'This changes a locked session. Your name, the time and this reason go into the audit trail.', confirmLabel: 'Save correction', note: 'Reason for change' });
    if (typeof note !== 'string') return;
    try {
      await api(`/attendance/sessions/${s.id}`, { method: 'PATCH', body: { records: editing, note } });
      setEditing(null);
      toast('Correction saved with audit note');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const rows = s.students.filter((st) => filter === 'all' || st.status === filter);

  return (
    <>
      <Link to="/attendance" className="btn ghost small" style={{ marginBottom: 12 }}><Icon name="back" />Attendance</Link>
      <PageHead
        title={`${s.className} attendance`}
        subtitle={fmtDate(s.date)}
        actions={me.role === 'admin' && !editing && (
          <button className="btn" onClick={() => setEditing({ ...s.records })}><Icon name="refresh" />Correct attendance</button>
        )}
      />
      <div className="split">
        <div className="stack">
          <Notice tone="ok">Locked · marked by {s.markedBy} at {fmtTime(s.markedAt)}. A second submission for this class today is rejected by the server.</Notice>
          <div className="cream row wrap" style={{ gap: 32 }}>
            <div><div className="label">Attendance</div><div className="stat-big">{pct(s.total ? Math.round((attended * 1000) / s.total) / 10 : 0)}</div></div>
            <Stat label="Present" value={s.counts.present} />
            <Stat label="Absent" value={s.counts.absent} />
            <Stat label="Late / leave" value={s.counts.late + s.counts.leave} />
          </div>
          <div className="card flush">
            <div className="row wrap" style={{ padding: 16 }}>
              <Toggles
                options={[{ value: 'all' as const, label: `All ${s.total}` }, ...(['present', 'absent', 'late', 'leave'] as const).map((k) => ({ value: k, label: `${k[0].toUpperCase()}${k.slice(1)} ${s.counts[k]}` }))]}
                value={filter}
                onChange={setFilter}
              />
            </div>
            {rows.map((st) => (
              <div key={st.id} className="list-row">
                <Link to={`/students/${st.id}`} style={{ flex: 1, fontWeight: 600 }}>{st.name}</Link>
                {editing ? (
                  <select className="select" style={{ width: 140, minHeight: 38 }} value={editing[st.id]} aria-label={`Status for ${st.name}`}
                    onChange={(e) => setEditing({ ...editing, [st.id]: e.target.value as AttendanceStatus })}>
                    {['present', 'absent', 'late', 'leave'].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : (
                  <AttendanceChip status={st.status} />
                )}
              </div>
            ))}
          </div>
          {editing && (
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn primary" onClick={saveCorrection}>Save correction</button>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card stack" style={{ borderColor: s.notificationBatchId ? undefined : 'var(--accent)' }}>
            <div className="h2">{s.notificationBatchId ? 'Parents notified' : 'Notify parents'}</div>
            {s.notificationBatchId ? (
              <>
                <p className="small muted" style={{ margin: 0 }}>A batch already exists for this session, so sending again is blocked.</p>
                <Link className="btn" to={`/messages/${s.notificationBatchId}`}>View message status</Link>
              </>
            ) : me.canSendMessages ? (
              <>
                <Toggles options={AUDIENCES.map(({ value, label }) => ({ value, label }))} value={audience} onChange={setAudience} />
                <div className="bubble">
                  {statuses.includes('absent')
                    ? `Dear Parent, your child [Student Name] was marked ABSENT at ${me.tuition.name} today. Please contact us if this is incorrect.`
                    : `Dear Parent, your child [Student Name] was marked PRESENT at ${me.tuition.name} today.`}
                </div>
                <button className="btn primary" disabled={!recipients || busy} onClick={notify}><Icon name="send" />Send to {plural(recipients, 'parent')}</button>
              </>
            ) : (
              <p className="small" style={{ color: 'var(--warning)', margin: 0 }}>Sending messages is not enabled for your account.</p>
            )}
          </div>
          {s.audit.length > 0 && (
            <div className="card">
              <div className="label" style={{ marginBottom: 10 }}>Audit trail</div>
              {s.audit.map((a, i) => (
                <div key={i} style={{ padding: '6px 0' }}>
                  <div>{a.note}</div>
                  <div className="small faint">{a.by} · {relative(a.at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
