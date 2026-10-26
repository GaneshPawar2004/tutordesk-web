import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { api } from '../api/client';
import type { Batch, ExamDetail, MarkEntry } from '../api/types';
import { Icon } from '../components/icons';
import { Chip, ErrorState, ExamChip, Loading, Notice, PageHead, Progress, Stat, Toggles, useUi } from '../components/ui';
import { useMe } from '../lib/auth';
import { fmtDate, pct, plural } from '../lib/format';
import { useApi } from '../lib/hooks';

type Draft = Record<string, { marks: string; absent: boolean }>;

export function ExamDetailPage() {
  const { id } = useParams();
  const { me, can } = useMe();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const { data: exam, error, reload } = useApi<ExamDetail>(`/exams/${id}`);
  const [tab, setTab] = useState<'results' | 'marks'>('results');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!exam) return <Loading />;

  const subject = exam.subjects.find((s) => s.subjectId === (subjectId ?? exam.subjects[0].subjectId))!;
  const canEnter = can('enterMarks') && exam.status !== 'upcoming' && exam.status !== 'draft';

  const startEditing = (sid: string) => {
    const existing = exam.marks[sid] ?? {};
    setSubjectId(sid);
    setDraft(Object.fromEntries(exam.students.map((s) => {
      const e: MarkEntry | undefined = existing[s.id];
      return [s.id, { marks: e?.marks === null || e?.marks === undefined ? '' : String(e.marks), absent: !!e?.absent }];
    })));
  };
  const errorFor = (v: { marks: string; absent: boolean }) => {
    if (v.absent || v.marks === '') return null;
    const n = Number(v.marks);
    if (!Number.isFinite(n)) return 'Invalid';
    if (n < 0) return 'Below 0';
    if (n > subject.maxMarks) return `Max ${subject.maxMarks}`;
    return null;
  };
  const invalid = draft ? Object.values(draft).filter((v) => errorFor(v)).length : 0;
  const entered = draft ? Object.values(draft).filter((v) => v.absent || v.marks !== '').length : 0;

  const saveMarks = async () => {
    if (!draft || invalid) return;
    let correctionNote: string | undefined;
    if (exam.resultsPublished) {
      const note = await confirm({ title: 'Correct published results?', message: 'Parents may already have these results. The change is logged with your name and reason, and corrected results can be sent once more.', confirmLabel: 'Save correction', note: 'Reason for correction' });
      if (typeof note !== 'string') return;
      correctionNote = note;
    }
    setBusy(true);
    try {
      const entries = Object.fromEntries(Object.entries(draft).map(([sid, v]) => [sid, v.absent ? { absent: true } : { marks: v.marks === '' ? null : Number(v.marks) }]));
      await api(`/exams/${exam.id}/marks/${subject.subjectId}`, { method: 'PUT', body: { entries, correctionNote } });
      toast(exam.resultsPublished ? 'Correction saved and logged' : 'Draft saved');
      setDraft(null);
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    const ok = await confirm({ title: 'Publish results?', message: 'Results become visible on student profiles and can be sent to parents. Later corrections need a reason.', confirmLabel: 'Publish' });
    if (!ok) return;
    try {
      await api(`/exams/${exam.id}/publish`, { method: 'POST' });
      toast('Results published');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const sendResults = async () => {
    const ok = await confirm({ title: `Send results to ${plural(exam.students.length, 'parent')}?`, message: "Each parent gets their child's subject marks, total and percentage. Demo only — no SMS is actually sent.", confirmLabel: 'Confirm & send' });
    if (!ok) return;
    try {
      const res = await api<{ created: boolean; batch: Batch }>(`/messages/exam-results/${exam.id}`, { method: 'POST', body: {} });
      if (!res.created) toast('These results were already sent — nothing was resent.', 'error');
      navigate(`/messages/${res.batch.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const sample = exam.results.find((r) => r.complete);

  return (
    <>
      <Link to="/exams" className="btn ghost small" style={{ marginBottom: 12 }}><Icon name="back" />Exams</Link>
      <PageHead
        title={exam.name}
        subtitle={`${exam.className} · ${fmtDate(exam.date)} · created by ${exam.createdBy}`}
        actions={
          <>
            <ExamChip status={exam.status} />
            {!exam.resultsPublished && can('enterMarks') && exam.status === 'completed' && <button className="btn" onClick={publish}>Publish results</button>}
            {exam.resultsPublished && me.canSendMessages && (exam.notificationBatchId
              ? <Link className="btn" to={`/messages/${exam.notificationBatchId}`}><Icon name="check" />Results sent · status</Link>
              : <button className="btn primary" onClick={sendResults}><Icon name="send" />{exam.revision ? 'Send corrected results' : 'Send results to parents'}</button>)}
          </>
        }
      />
      <div className="cream grid grid-4" style={{ marginBottom: 20 }}>
        <Stat label="Students" value={exam.students.length} />
        <Stat label="Max marks" value={exam.totalMax} />
        <Stat label="Marks entered" value={`${exam.progress.entered}/${exam.progress.total}`} />
        <Stat label="Class average" value={exam.classAverage === null ? '—' : pct(exam.classAverage)} />
      </div>
      {(exam.status === 'upcoming' || exam.status === 'draft') && <div style={{ marginBottom: 16 }}><Notice>Marks entry opens on the exam day ({fmtDate(exam.date)}).</Notice></div>}

      <div className="tabs">
        <button className={`tab${tab === 'results' ? ' on' : ''}`} onClick={() => setTab('results')}>Results</button>
        {canEnter && <button className={`tab${tab === 'marks' ? ' on' : ''}`} onClick={() => setTab('marks')}>{exam.resultsPublished ? 'Correct marks' : 'Enter marks'}</button>}
      </div>

      {tab === 'results' && (
        <div className="split">
          <div className="card flush table-wrap">
            <table className="table">
              <thead><tr><th>#</th><th>Student</th>{exam.subjects.map((s) => <th key={s.subjectId} className="right">{s.name} /{s.maxMarks}</th>)}<th className="right">Total</th><th className="right">%</th><th>Grade</th></tr></thead>
              <tbody>
                {exam.results.map((r, i) => (
                  <tr key={r.studentId}>
                    <td className="faint num">{i + 1}</td>
                    <td style={{ fontWeight: 600 }}><Link to={`/students/${r.studentId}`}>{r.name}</Link></td>
                    {r.subjects.map((s) => <td key={s.subjectId} className="right num">{s.absent ? <span className="faint">AB</span> : s.marks ?? '—'}</td>)}
                    <td className="right num" style={{ fontWeight: 700 }}>{r.obtained}/{r.maxTotal}</td>
                    <td className="right num">{r.absentInAll ? '—' : pct(r.percent)}</td>
                    <td>{!r.absentInAll && r.complete ? <Chip tone={r.percent >= 75 ? 'success' : r.percent >= 45 ? 'accent' : r.percent >= 35 ? 'warning' : 'error'}>{r.grade.label}</Chip> : <span className="small faint">{r.absentInAll ? 'Absent' : 'Incomplete'}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="stack">
            {!exam.resultsPublished && <Notice tone="warn">Draft — results are not visible to parents until published.</Notice>}
            {sample && (
              <div className="card">
                <div className="label" style={{ marginBottom: 8 }}>Parent message preview · {sample.name}</div>
                <div className="bubble">
                  {`Dear Parent, the ${exam.name} results for ${sample.name} are available.\n\n${sample.subjects.map((s) => `${s.subject}: ${s.absent ? 'Absent' : `${s.marks}/${s.maxMarks}`}`).join('\n')}\n\nTotal: ${sample.obtained}/${sample.maxTotal}\nPercentage: ${pct(sample.percent)}\n\nRegards,\n${me.tuition.name}`}
                </div>
              </div>
            )}
            {exam.correctionLog.length > 0 && (
              <div className="card"><div className="label" style={{ marginBottom: 8 }}>Correction log</div>{exam.correctionLog.map((c, i) => <p key={i} className="small" style={{ margin: '4px 0' }}>{c}</p>)}</div>
            )}
          </div>
        </div>
      )}

      {tab === 'marks' && canEnter && (
        <div className="stack">
          <div className="row wrap">
            <Toggles options={exam.subjects.map((s) => ({ value: s.subjectId, label: `${s.name} /${s.maxMarks}` }))} value={draft ? subject.subjectId : ''} onChange={startEditing} />
            {!draft && <span className="small muted">Pick a subject to enter marks.</span>}
          </div>
          {exam.resultsPublished && <Notice tone="warn">Results are published. Saving changes asks for a reason and is logged.</Notice>}
          {draft && (
            <>
              <div className="card row wrap">
                <div style={{ flex: 1 }}><strong>{subject.name}</strong> · max {subject.maxMarks}</div>
                <span className="small num">{entered}/{exam.students.length} entered · {exam.students.length - entered} remaining</span>
                <div style={{ width: 160 }}><Progress value={exam.students.length ? entered / exam.students.length : 0} /></div>
                <button className="btn" onClick={() => setDraft(null)}>Discard</button>
                <button className="btn primary" disabled={busy || invalid > 0} onClick={saveMarks}>{invalid ? `${invalid} invalid` : exam.resultsPublished ? 'Save correction' : 'Save draft'}</button>
              </div>
              <div className="card flush">
                {exam.students.map((s) => {
                  const v = draft[s.id];
                  const err = errorFor(v);
                  return (
                    <div key={s.id} className="list-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 600 }}>{s.name}</div>
                        <div className="small" style={{ color: err ? 'var(--error)' : 'var(--text-3)' }}>{err ?? s.id}</div>
                      </div>
                      <input className={`input num${err ? ' invalid' : ''}`} style={{ width: 100, minHeight: 40, textAlign: 'center' }} inputMode="decimal" disabled={v.absent}
                        aria-label={`Marks for ${s.name}`} placeholder={v.absent ? 'AB' : '—'} value={v.marks}
                        onChange={(e) => setDraft({ ...draft, [s.id]: { ...v, marks: e.target.value.replace(/[^0-9.]/g, '') } })} />
                      <span className="small faint">/{subject.maxMarks}</span>
                      <button type="button" className={`toggle${v.absent ? ' on' : ''}`} aria-pressed={v.absent}
                        style={v.absent ? { background: 'var(--error)', borderColor: 'var(--error)', color: 'var(--bg)' } : undefined}
                        onClick={() => setDraft({ ...draft, [s.id]: { marks: '', absent: !v.absent } })}>Absent</button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
