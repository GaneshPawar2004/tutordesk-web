import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { ApiError, api } from '../api/client';
import type { AttendanceSession, AttendanceStatus } from '../api/types';
import { Icon } from '../components/icons';
import { Avatar, ErrorState, Loading, PageHead, Progress, attendanceColor, useUi } from '../components/ui';
import { longToday, plural } from '../lib/format';
import { useApi } from '../lib/hooks';

const STATUSES: [AttendanceStatus, string][] = [['present', 'P'], ['absent', 'A'], ['late', 'L'], ['leave', 'LV']];

interface Roster { date: string; existingSessionId: string | null; students: { id: string; name: string }[] }

export function MarkAttendancePage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const { data, error, reload } = useApi<Roster>(`/attendance/classes/${classId}/roster`);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = Object.keys(marks).length > 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const visible = useMemo(
    () => (data?.students ?? []).filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.id.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  if (data.existingSessionId) return <Navigate to={`/attendance/sessions/${data.existingSessionId}`} replace />;

  const counts = Object.fromEntries(STATUSES.map(([s]) => [s, Object.values(marks).filter((v) => v === s).length])) as Record<AttendanceStatus, number>;
  const unmarked = data.students.length - Object.keys(marks).length;

  const save = async () => {
    if (saving) return;
    let records = marks;
    if (unmarked > 0) {
      const ok = await confirm({ title: `${plural(unmarked, 'student')} not marked`, message: 'Mark the remaining students as present?', confirmLabel: 'Mark present & continue' });
      if (!ok) return;
      records = { ...Object.fromEntries(data.students.map((s) => [s.id, 'present' as AttendanceStatus])), ...marks };
    }
    const attended = Object.values(records).filter((v) => v === 'present' || v === 'late').length;
    const ok = await confirm({
      title: 'Save & lock attendance?',
      message: `${attended} present · ${data.students.length - attended} absent or on leave.\nAfter saving the session is locked; corrections need the admin and a reason.`,
      confirmLabel: 'Save & lock',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const session = await api<AttendanceSession>('/attendance/sessions', { method: 'POST', body: { classId, records } });
      toast('Attendance saved and locked');
      navigate(`/attendance/sessions/${session.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const existing = (e.details as { session: AttendanceSession }).session;
        toast(`${existing.markedBy} already saved this class — your copy was not submitted.`, 'error');
        navigate(`/attendance/sessions/${existing.id}`, { replace: true });
      } else {
        toast((e as Error).message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Link to="/attendance" className="btn ghost small" style={{ marginBottom: 12 }}><Icon name="back" />Attendance</Link>
      <PageHead
        eyebrow={longToday()}
        title="Mark attendance"
        subtitle={plural(data.students.length, 'student')}
        actions={
          <>
            <button className="btn cream-btn" onClick={() => setMarks(Object.fromEntries(data.students.map((s) => [s.id, 'present'])))}>
              <Icon name="check" />All present
            </button>
            <button className="btn primary" disabled={saving || !data.students.length} onClick={save}>
              {saving ? 'Saving…' : unmarked ? `Save · ${unmarked} unmarked` : 'Save attendance'}
            </button>
          </>
        }
      />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row wrap" style={{ gap: 24 }}>
          {STATUSES.map(([s]) => (
            <div key={s}><span className="num" style={{ fontSize: 20, fontWeight: 800, color: attendanceColor(s) }}>{counts[s]}</span> <span className="small muted">{s}</span></div>
          ))}
          <div><span className="num" style={{ fontSize: 20, fontWeight: 800 }}>{unmarked}</span> <span className="small muted">unmarked</span></div>
          <div className="spacer" />
          <input className="input search" style={{ maxWidth: 260 }} placeholder="Find student" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find student" />
        </div>
        <div style={{ marginTop: 14 }}><Progress value={data.students.length ? 1 - unmarked / data.students.length : 0} /></div>
      </div>
      <div className="card flush">
        {visible.map((s) => (
          <div key={s.id} className="list-row">
            <Avatar name={s.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate" style={{ fontWeight: 600 }}>{s.name}</div>
              <div className="small faint">{s.id}</div>
            </div>
            <div className="row" style={{ gap: 6 }} role="radiogroup" aria-label={`Attendance for ${s.name}`}>
              {STATUSES.map(([status, short]) => {
                const on = marks[s.id] === status;
                return (
                  <button key={status} role="radio" aria-checked={on} aria-label={`${s.name} ${status}`}
                    className={`mark-btn${on ? ' on' : ''}`} style={on ? { background: attendanceColor(status), borderColor: attendanceColor(status) } : undefined}
                    onClick={() => setMarks({ ...marks, [s.id]: status })}>
                    {short}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {visible.length === 0 && <p className="muted small" style={{ padding: 18 }}>No matching students.</p>}
      </div>
    </>
  );
}
