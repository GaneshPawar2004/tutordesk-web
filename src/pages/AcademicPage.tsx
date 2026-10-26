import { useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/client';
import type { AcademicYear, SchoolClass, StudentRow } from '../api/types';
import { Chip, ErrorState, Field, Loading, Notice, PageHead, Stat, useUi } from '../components/ui';
import { fmtDate, plural } from '../lib/format';
import { useApi } from '../lib/hooks';

export function AcademicPage() {
  const { toast, confirm } = useUi();
  const years = useApi<AcademicYear[]>('/academic-years');
  const classes = useApi<SchoolClass[]>('/classes');
  if (years.error) return <ErrorState error={years.error} />;
  if (!years.data || !classes.data) return <Loading />;
  const current = years.data.find((y) => y.status === 'active')!;

  const makeCurrent = async (y: AcademicYear) => {
    const ok = await confirm({ title: `Make ${y.label} the current year?`, message: `${current.label} will be closed. Past enrollments, fees and results are kept.`, confirmLabel: 'Make current' });
    if (!ok) return;
    await api(`/academic-years/${y.id}/make-current`, { method: 'POST' });
    toast(`${y.label} is now the current year`);
    years.reload();
  };

  return (
    <>
      <PageHead eyebrow="Admin only" title="Years & classes" />
      <div className="split">
        <div className="stack">
          <div className="cream">
            <div className="label">Current year</div>
            <div className="stat-big" style={{ margin: '6px 0' }}>{current.label}</div>
            <div className="small muted">{fmtDate(current.startDate)} – {fmtDate(current.endDate)} · {plural(current.enrollments, 'enrollment')}</div>
          </div>
          {years.data.filter((y) => y.id !== current.id).map((y) => (
            <div key={y.id} className="card row">
              <div style={{ flex: 1 }}><div className="h2">{y.label}</div><div className="small muted">{fmtDate(y.startDate)} – {fmtDate(y.endDate)} · {plural(y.enrollments, 'enrollment')}</div></div>
              <Chip tone={y.status === 'upcoming' ? 'info' : 'muted'}>{y.status}</Chip>
              {y.status === 'upcoming' && <button className="btn small" onClick={() => makeCurrent(y)}>Make current</button>}
            </div>
          ))}
          <Promotion years={years.data} classes={classes.data} onDone={() => { years.reload(); classes.reload(); }} />
        </div>
        <div className="card flush">
          <div className="label" style={{ padding: '16px 18px 6px' }}>Classes · {current.label}</div>
          {classes.data.map((c) => (
            <div key={c.id} className="list-row">
              <span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', fontWeight: 800, background: c.isActive ? 'var(--cream)' : 'var(--surface-2)', color: c.isActive ? 'var(--on-cream)' : 'var(--text-2)' }}>{c.grade}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{c.name} {!c.isActive && <span className="small faint">· not running</span>}</div>
                <div className="small muted truncate">{c.sessionLabel} · {plural(c.students, 'student')} · {c.staff.map((s) => s.name).join(', ') || 'No staff'}</div>
              </div>
              <Link className="btn small" to={`/students?classId=${c.id}`}>Students</Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Promotion({ years, classes, onDone }: { years: AcademicYear[]; classes: SchoolClass[]; onDone: () => void }) {
  const { toast, confirm } = useUi();
  const current = years.find((y) => y.status === 'active')!;
  const next = years.filter((y) => y.startDate > current.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const [fromClass, setFromClass] = useState('');
  const [toClass, setToClass] = useState('');
  const [fee, setFee] = useState('');
  const [selected, setSelected] = useState<string[] | null>(null);
  const { data: students } = useApi<StudentRow[]>(fromClass ? `/students?yearId=${current.id}&classId=${fromClass}` : null);
  const chosen = selected ?? students?.map((s) => s.id) ?? [];

  if (!next) return <Notice tone="warn">Create the next academic year before promoting students.</Notice>;

  const pickFrom = (id: string) => {
    setFromClass(id);
    setSelected(null);
    const grade = classes.find((c) => c.id === id)?.grade;
    setToClass(classes.find((c) => c.grade === (grade ?? 0) + 1)?.id ?? '');
  };
  const submit = async () => {
    const ok = await confirm({
      title: `Promote ${plural(chosen.length, 'student')}?`,
      message: `Each gets a new ${classes.find((c) => c.id === toClass)?.name} enrollment for ${next.label}. IDs, history, last year's fee and unpaid dues stay unchanged.`,
      confirmLabel: 'Confirm promotion',
    });
    if (!ok) return;
    try {
      const res = await api<{ promoted: unknown[]; skipped: string[] }>('/promotions', {
        method: 'POST',
        body: { fromYearId: current.id, toYearId: next.id, toClassId: toClass, studentIds: chosen, annualFee: Number(fee) || undefined, installments: 4 },
      });
      toast(`${res.promoted.length} promoted${res.skipped.length ? ` · ${res.skipped.length} already enrolled (skipped)` : ''}`);
      setFromClass('');
      onDone();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div className="card stack">
      <div className="h2">Promote students · {current.label} → {next.label}</div>
      <div className="form-grid">
        <Field label="Source class">
          <select className="select" value={fromClass} onChange={(e) => pickFrom(e.target.value)}>
            <option value="">Select class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.students})</option>)}
          </select>
        </Field>
        <Field label="Destination class">
          <select className="select" value={toClass} onChange={(e) => setToClass(e.target.value)}>
            <option value="">Select class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={`New annual fee for ${next.label}`} optional>
          <div className="input-prefix"><b>₹</b><input className="input num" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} /></div>
        </Field>
        <div className="field"><span>Selected</span><Stat label="Students" value={`${chosen.length}/${students?.length ?? 0}`} /></div>
      </div>
      {students && (
        <div className="row wrap" style={{ gap: 6, maxHeight: 220, overflowY: 'auto' }}>
          {students.map((s) => {
            const on = chosen.includes(s.id);
            return (
              <button key={s.id} type="button" className={`toggle${on ? ' on' : ''}`} aria-pressed={on}
                onClick={() => setSelected(on ? chosen.filter((x) => x !== s.id) : [...chosen, s.id])}>
                {s.firstName} {s.lastName}
              </button>
            );
          })}
        </div>
      )}
      <Notice tone="ok">Promotion adds an enrollment; it never duplicates a student. A new fee is a separate agreement for the new year.</Notice>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn primary" disabled={!fromClass || !toClass || !chosen.length} onClick={submit}>Review & promote</button>
      </div>
    </div>
  );
}
