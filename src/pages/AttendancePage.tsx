import { Link } from 'react-router-dom';

import type { AttendanceToday } from '../api/types';
import { Icon } from '../components/icons';
import { Chip, Empty, ErrorState, Loading, PageHead, Progress, Stat } from '../components/ui';
import { useMe } from '../lib/auth';
import { fmtTime, longToday, plural } from '../lib/format';
import { useApi } from '../lib/hooks';

export function AttendancePage() {
  const { can } = useMe();
  const { data, error, reload } = useApi<AttendanceToday>('/attendance/today', { pollMs: 15000 });
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  let present = 0, absent = 0, notMarked = 0, marked = 0;
  for (const c of data.classes) {
    if (!c.session) { notMarked += c.students; continue; }
    marked++;
    present += c.session.counts.present + c.session.counts.late;
    absent += c.session.counts.absent;
  }
  const canMark = can('markAttendance');

  return (
    <>
      <PageHead eyebrow={longToday()} title="Attendance" subtitle={`${data.yearLabel} · ${marked} of ${data.classes.length} classes marked`} />
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="grid grid-3">
          <Stat label="Present" value={present} color="var(--success)" />
          <Stat label="Absent" value={absent} color="var(--error)" />
          <Stat label="Not marked" value={notMarked} />
        </div>
        <div style={{ marginTop: 16 }}><Progress value={data.classes.length ? marked / data.classes.length : 0} /></div>
      </div>
      {data.classes.length === 0 ? (
        <Empty icon="users" title="No classes assigned" message="Ask the admin to assign you to a class to take attendance." />
      ) : (
        <div className="grid grid-3">
          {data.classes.map((c) => (
            <div key={c.classId} className="card stack" style={{ gap: 12 }}>
              <div className="row">
                <div style={{ flex: 1 }}>
                  <div className="h2">{c.className}</div>
                  <div className="small muted">{c.sessionLabel} · {plural(c.students, 'student')}</div>
                </div>
                {c.session ? <Chip tone="success">Locked</Chip> : <Chip tone="warning">Not marked</Chip>}
              </div>
              {c.session ? (
                <>
                  <div className="small">
                    <strong className="num">{c.session.counts.present + c.session.counts.late}</strong> present ·{' '}
                    <strong className="num">{c.session.counts.absent}</strong> absent ·{' '}
                    <strong className="num">{c.session.counts.leave}</strong> leave
                  </div>
                  <div className="small faint">Marked by {c.session.markedBy} · {fmtTime(c.session.markedAt)}</div>
                  <Link className="btn small" to={`/attendance/sessions/${c.session.id}`}>View session</Link>
                </>
              ) : canMark ? (
                <Link className="btn primary" to={`/attendance/mark/${c.classId}`}><Icon name="check" />Start attendance</Link>
              ) : (
                <div className="small muted">Waiting for the class teacher.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
