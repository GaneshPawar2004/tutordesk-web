import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { StudentProfile } from '../api/types';
import { Icon } from '../components/icons';
import { AttendanceChip, Avatar, Chip, ErrorState, Loading, PageHead, PaymentChip, Progress, Stat, attendanceColor } from '../components/ui';
import { useMe } from '../lib/auth';
import { fmtDate, inr, pct, phone } from '../lib/format';
import { useApi } from '../lib/hooks';

type Tab = 'overview' | 'attendance' | 'exams' | 'history' | 'fees';

export function StudentProfilePage() {
  const { id } = useParams();
  const { me, can } = useMe();
  const { data, error, reload } = useApi<StudentProfile>(`/students/${id}`);
  const [tab, setTab] = useState<Tab>('overview');
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Loading rows={5} />;

  const { student: s, enrollments, attendance: att, exams } = data;
  const name = `${s.firstName} ${s.lastName}`;
  const current = enrollments.find((e) => e.academicYearId === me.currentYearId) ?? enrollments.at(-1);
  const tabs: [Tab, string][] = [
    ['overview', 'Overview'],
    ['attendance', 'Attendance'],
    ...(can('viewExamResults') ? [['exams', 'Exams & Marks'] as [Tab, string]] : []),
    ['history', 'Academic History'],
    ...(me.role === 'admin' ? [['fees', 'Fees'] as [Tab, string]] : []),
  ];

  return (
    <>
      <Link to="/students" className="btn ghost small" style={{ marginBottom: 12 }}><Icon name="back" />Students</Link>
      <PageHead
        title={name}
        subtitle={`${s.id} · ${current?.className ?? 'Not enrolled'} · ${current?.yearLabel ?? ''}`}
        actions={<>{s.isActive && current?.status !== 'withdrawn' ? <Chip tone="success">Active</Chip> : <Chip tone="muted">Inactive</Chip>}<Avatar name={name} large /></>}
      />
      <div className="tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={`tab${tab === key ? ' on' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-2">
          <div className="card">
            <div className="label" style={{ marginBottom: 10 }}>Parent & contact</div>
            <Info k="Parent / guardian" v={s.parentName} />
            <Info k="Mobile" v={phone(s.parentPhone)} />
            <Info k="Alternate" v={s.altPhone ? phone(s.altPhone) : 'Not provided'} />
            <Info k="Address" v={s.address ?? 'Not provided'} />
          </div>
          <div className="card">
            <div className="label" style={{ marginBottom: 10 }}>Enrollment & personal</div>
            <Info k="Class" v={current?.className ?? '—'} />
            <Info k="Enrolled on" v={current ? fmtDate(current.enrolledOn) : '—'} />
            <Info k="First admitted" v={fmtDate(s.admittedOn)} />
            <Info k="Date of birth" v={fmtDate(s.dateOfBirth)} />
            <Info k="Gender" v={s.gender ? s.gender[0].toUpperCase() + s.gender.slice(1) : 'Not specified'} />
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="stack">
          <div className="cream row wrap" style={{ gap: 28 }}>
            <div>
              <div className="label">Attendance · {att.yearLabel}</div>
              <div className="stat-big">{pct(att.percent)}</div>
            </div>
            <Stat label="Present" value={att.present} />
            <Stat label="Absent" value={att.absent} />
            <Stat label="Late" value={att.late} />
            <Stat label="Leave" value={att.leave} />
          </div>
          <div className="card">
            <div className="label" style={{ marginBottom: 12 }}>Recent sessions</div>
            {att.history.length === 0 ? (
              <p className="muted small">No attendance yet.</p>
            ) : (
              <div className="row wrap" style={{ gap: 6 }}>
                {att.history.slice(0, 40).reverse().map((h) => (
                  <span key={h.date} title={`${fmtDate(h.date)}: ${h.status}`} aria-label={`${fmtDate(h.date)}: ${h.status}`}
                    style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, background: `${attendanceColor(h.status)}2a`, color: attendanceColor(h.status) }}>
                    {Number(h.date.slice(8))}
                  </span>
                ))}
              </div>
            )}
            <div className="row wrap small muted" style={{ marginTop: 12 }}>
              {(['present', 'absent', 'late', 'leave'] as const).map((st) => <AttendanceChip key={st} status={st} />)}
            </div>
          </div>
        </div>
      )}

      {tab === 'exams' && (
        <div className="grid grid-2">
          {exams.length === 0 && <p className="muted">No marks yet.</p>}
          {exams.map((ex) => (
            <div key={ex.id} className="card">
              <div className="row">
                <div style={{ flex: 1 }}>
                  <div className="h3">{ex.name}</div>
                  <div className="small muted">{fmtDate(ex.date)}</div>
                </div>
                {ex.published ? <Chip tone="success">Grade {ex.result.grade.label}</Chip> : <Chip tone="muted">Draft</Chip>}
              </div>
              <div className="stack" style={{ gap: 10, marginTop: 14 }}>
                {ex.result.subjects.map((sub) => (
                  <div key={sub.subjectId} className="row">
                    <span className="small" style={{ width: 110 }}>{sub.subject}</span>
                    <div style={{ flex: 1 }}><Progress value={sub.marks === null ? 0 : sub.marks / sub.maxMarks} /></div>
                    <span className="num small" style={{ width: 64, textAlign: 'right' }}>{sub.absent ? 'Absent' : sub.marks === null ? '—' : `${sub.marks}/${sub.maxMarks}`}</span>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="row"><strong className="num">Total {ex.result.obtained}/{ex.result.maxTotal}</strong><span className="spacer" /><strong className="num accent-text">{pct(ex.result.percent)}</strong></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="stack">
          <p className="small muted" style={{ margin: 0 }}>One permanent record — each academic year adds an enrollment; promotion never duplicates the student.</p>
          {[...enrollments].reverse().map((e) => (
            <div key={e.id} className="card row">
              <div style={{ flex: 1 }}>
                <div className="label">{e.yearLabel}</div>
                <div className="h2">{e.className}</div>
                <div className="small muted">Enrolled {fmtDate(e.enrolledOn)}</div>
              </div>
              <Chip tone={e.status === 'active' ? 'accent' : e.status === 'promoted' ? 'success' : 'muted'}>{e.status}</Chip>
            </div>
          ))}
        </div>
      )}

      {tab === 'fees' && me.role === 'admin' && (
        <div className="stack">
          {[...enrollments].reverse().map((e) => (
            <Link key={e.id} to={`/fees/${e.id}`} className="card link row wrap" style={{ gap: 24 }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div className="label">{e.yearLabel}</div>
                <div className="h3">{e.className}</div>
              </div>
              {e.fees?.hasPlan ? (
                <>
                  <Stat label="Agreed" value={inr(e.fees.agreed)} />
                  <Stat label="Paid" value={inr(e.fees.paid)} />
                  <Stat label="Balance" value={inr(e.fees.outstanding)} color={e.fees.outstanding ? 'var(--warning)' : 'var(--success)'} />
                  {e.fees.status && <PaymentChip status={e.fees.status} />}
                </>
              ) : (
                <Chip tone="muted">Fee not set</Chip>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

const Info = ({ k, v }: { k: string; v: string }) => (
  <div className="row" style={{ padding: '8px 0', alignItems: 'flex-start' }}>
    <span className="muted small" style={{ width: 140, flex: 'none' }}>{k}</span>
    <span style={{ fontWeight: 600 }}>{v}</span>
  </div>
);
