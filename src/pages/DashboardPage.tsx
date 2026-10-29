import { Link, useNavigate } from 'react-router-dom';

import type { Dashboard } from '../api/types';
import { Icon } from '../components/icons';
import { Avatar, ErrorState, Loading, Metric, Progress, Well } from '../components/ui';
import { useMe } from '../lib/auth';
import { compactInr, greeting, longToday, plural, relative, shortDate } from '../lib/format';
import { useApi } from '../lib/hooks';

const activityIcon = { attendance: 'check', payment: 'rupee', exam: 'exam', staff: 'badge', student: 'users', message: 'message' } as const;

export function DashboardPage() {
  const { me, can } = useMe();
  const navigate = useNavigate();
  const { data, error, reload } = useApi<Dashboard>('/dashboard');
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Loading rows={6} />;

  const a = data.attendance;
  const remaining = data.classes.filter((c) => !c.marked).map((c) => c.name);
  const admin = me.role === 'admin';
  const schedule = [
    ...data.upcomingExams.map((e) => ({ date: e.date, title: e.name, sub: e.className, tag: 'Exam', to: `/exams/${e.id}` })),
    ...data.events.map((e) => ({ date: e.date, title: e.title, sub: e.subtitle, tag: 'Event', to: '' })),
  ].sort((x, y) => x.date.localeCompare(y.date));

  return (
    <>
      <div className="page-head">
        <div className="row">
          <Avatar name={me.name} accent large />
          <div>
            <div className="muted">{greeting()}, {me.name.split(' ')[0]}</div>
            <h1 className="h1">{me.tuition.name}</h1>
            <div className="small muted">{longToday()} · {data.yearLabel}</div>
          </div>
        </div>
        <div className="row wrap">
          {admin && <Link className="btn" to="/students/new"><Icon name="plus" />Add student</Link>}
          {can('markAttendance') && <Link className="btn primary" to="/attendance"><Icon name="check" />Mark attendance</Link>}
        </div>
      </div>

      {admin && (data.classes.length === 0 || data.students === 0) && (
        <div className="card stack" style={{ borderColor: 'var(--accent)', marginBottom: 20 }}>
          <div>
            <div className="h2">Get started</div>
            <div className="small muted">Set up {me.tuition.name} in three steps.</div>
          </div>
          <div className="row wrap">
            <Link className={`btn${data.classes.length ? '' : ' primary'}`} to="/academic">{data.classes.length ? '✓ Classes created' : '1 · Create your first class'}</Link>
            <Link className={`btn${data.classes.length && !data.students ? ' primary' : ''}`} to="/students/new">2 · Add a student</Link>
            <Link className="btn" to="/staff">3 · Invite a teacher</Link>
          </div>
        </div>
      )}

      <div className="split">
        <div className="stack">
          <div className="cream link" role="button" tabIndex={0} onClick={() => navigate('/attendance')} onKeyDown={(e) => e.key === 'Enter' && navigate('/attendance')} style={{ cursor: 'pointer' }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="label">{admin ? 'Active students' : 'Your students'}</div>
                <div className="stat-big" style={{ marginTop: 6 }}>{data.students}</div>
              </div>
              <div style={{ background: 'var(--on-cream)', color: 'var(--cream)', borderRadius: 16, padding: '12px 16px', textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)' }}>{data.classes.length}</div>
                <div className="small">{admin ? 'classes running' : 'classes assigned'}</div>
              </div>
            </div>
            <div className="divider" style={{ background: 'var(--cream-border)' }} />
            <div className="row">
              <strong style={{ flex: 1 }}>Attendance marked today</strong>
              <strong className="num">{a.classesMarked} of {a.classesTotal} classes</strong>
            </div>
            <div style={{ margin: '10px 0' }}><Progress value={a.classesTotal ? a.classesMarked / a.classesTotal : 0} /></div>
            <div className="small muted">{remaining.length ? `Remaining: ${remaining.join(', ')}` : 'All classes are done for today.'}</div>
          </div>

          <div className="grid grid-2">
            <Metric label="Present today" value={a.present} icon="check" tone="success" caption={`incl. ${a.lateOrLeave} late/leave`} onClick={() => navigate('/attendance')} />
            <Metric label="Absent today" value={a.absent} icon="alert" tone="error" caption={`${a.notMarked} not marked yet`} onClick={() => navigate('/attendance')} />
            {data.fees ? (
              <Metric label="Pending fees" value={compactInr(data.fees.outstanding)} icon="wallet" tone="warning" caption={`${compactInr(data.fees.overdue)} overdue`} onClick={() => navigate('/fees')} />
            ) : (
              <Metric label="Results pending" value={data.resultsPending} icon="exam" tone="warning" caption="Exams awaiting marks" onClick={() => navigate('/exams')} />
            )}
            <Metric label="Upcoming exams" value={data.upcomingExams.length} icon="calendar" tone="info" caption={data.upcomingExams[0] ? `Next: ${shortDate(data.upcomingExams[0].date)}` : 'Nothing scheduled'} onClick={() => navigate('/exams')} />
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="label" style={{ marginBottom: 14 }}>Today's activity</div>
            {data.activity.length === 0 ? (
              <p className="muted small">Quiet day so far.</p>
            ) : (
              data.activity.map((ev, i) => (
                <div key={i} className="row" style={{ alignItems: 'flex-start', padding: '8px 0' }}>
                  <Well icon={activityIcon[ev.type as keyof typeof activityIcon] ?? 'info'} tone={ev.type === 'payment' ? 'warning' : ev.type === 'attendance' ? 'success' : 'info'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{ev.title}</div>
                    <div className="small muted truncate">{ev.subtitle}</div>
                  </div>
                  <div className="small faint" style={{ whiteSpace: 'nowrap' }}>{relative(ev.at)}</div>
                </div>
              ))
            )}
          </div>
          <div className="card flush">
            <div className="label" style={{ padding: '18px 18px 6px' }}>Upcoming</div>
            {schedule.length === 0 && <p className="muted small" style={{ padding: '0 18px 18px' }}>Nothing scheduled.</p>}
            {schedule.slice(0, 5).map((s, i) => (
              <div key={i} className={`list-row${s.to ? ' link' : ''}`} style={{ cursor: s.to ? 'pointer' : 'default' }} onClick={() => s.to && navigate(s.to)}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--cream)', color: 'var(--on-cream)', display: 'grid', placeItems: 'center', textAlign: 'center', lineHeight: 1.05, flex: 'none' }}>
                  <div><strong>{shortDate(s.date).split(' ')[0]}</strong><div className="label" style={{ fontSize: 9, color: 'var(--on-cream-2)' }}>{shortDate(s.date).split(' ')[1]}</div></div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate" style={{ fontWeight: 600 }}>{s.title}</div>
                  <div className="small muted truncate">{s.sub}</div>
                </div>
                <span className="small faint">{s.tag}</span>
              </div>
            ))}
          </div>
          {!admin && (
            <p className="small faint">{plural(data.classes.length, 'class', 'classes')} assigned to you. Fees and staff are managed by the admin.</p>
          )}
        </div>
      </div>
    </>
  );
}
