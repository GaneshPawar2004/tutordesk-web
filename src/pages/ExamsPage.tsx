import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api/client';
import type { ExamStatus, ExamSummary, SchoolClass, Subject } from '../api/types';
import { Icon } from '../components/icons';
import { Empty, ErrorState, ExamChip, Field, FilterSelect, Loading, PageHead, Progress, Toggles, useUi } from '../components/ui';
import { useMe } from '../lib/auth';
import { fmtDate, isoDate } from '../lib/format';
import { useApi } from '../lib/hooks';

const SECTIONS: [ExamStatus, string][] = [['upcoming', 'Upcoming'], ['completed', 'Completed · results pending'], ['draft', 'Drafts'], ['published', 'Recently published']];

export function ExamsPage() {
  const { can } = useMe();
  const navigate = useNavigate();
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, error, reload } = useApi<ExamSummary[]>(`/exams?${new URLSearchParams({ ...(classId ? { classId } : {}), ...(status ? { status } : {}) })}`);
  const { data: classes } = useApi<SchoolClass[]>('/classes');
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHead title="Exams & marks" actions={can('enterMarks') && !creating && <button className="btn primary" onClick={() => setCreating(true)}><Icon name="plus" />Create exam</button>} />
      {creating && classes && <CreateExam classes={classes} onCancel={() => setCreating(false)} onCreated={(id) => navigate(`/exams/${id}`)} />}
      <div className="row wrap" style={{ marginBottom: 8 }}>
        <FilterSelect label="Class" value={classId} onChange={setClassId} options={[{ value: '', label: 'All' }, ...(classes ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, ...SECTIONS.map(([v, l]) => ({ value: v, label: l.split(' ·')[0] }))]} />
      </div>
      {!data ? <Loading /> : data.length === 0 ? (
        <Empty icon="exam" title="No exams" message="No exams match these filters." />
      ) : (
        SECTIONS.map(([key, label]) => {
          const list = data.filter((e) => e.status === key);
          if (!list.length) return null;
          return (
            <section key={key}>
              <div className="label section-title">{label} · {list.length}</div>
              <div className="grid grid-3">
                {list.map((e) => (
                  <div key={e.id} className="card link stack" style={{ gap: 10 }} role="button" tabIndex={0}
                    onClick={() => navigate(`/exams/${e.id}`)} onKeyDown={(ev) => ev.key === 'Enter' && navigate(`/exams/${e.id}`)}>
                    <div className="row"><div className="h3" style={{ flex: 1 }}>{e.name}</div><ExamChip status={e.status} /></div>
                    <div className="small muted">{e.className} · {fmtDate(e.date)} · max {e.totalMax}</div>
                    <div className="small faint truncate">{e.subjects.map((s) => s.name).join(', ')}</div>
                    {e.status === 'completed' && (
                      <div className="row"><div style={{ flex: 1 }}><Progress value={e.progress.total ? e.progress.entered / e.progress.total : 0} /></div><span className="small num">{e.progress.entered}/{e.progress.total}</span></div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}

function CreateExam({ classes, onCancel, onCreated }: { classes: SchoolClass[]; onCancel: () => void; onCreated: (id: string) => void }) {
  const { toast } = useUi();
  const { data: subjects } = useApi<Subject[]>('/subjects');
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(isoDate(new Date()));
  const [max, setMax] = useState<Record<string, number>>({});
  const [isDraft, setIsDraft] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const pickClass = (id: string) => {
    setClassId(id);
    const cls = classes.find((c) => c.id === id);
    setMax(Object.fromEntries((cls?.subjectIds ?? []).map((s) => [s, 50])));
  };
  const total = Object.values(max).reduce((a, b) => a + b, 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3 || !classId || !Object.keys(max).length) return toast('Enter a name, class and at least one subject', 'error');
    if (Object.values(max).some((m) => !(m > 0 && m <= 1000))) return toast('Maximum marks must be between 1 and 1000', 'error');
    setSaving(true);
    try {
      const exam = await api<{ id: string }>('/exams', {
        method: 'POST',
        body: { name, classId, date, isDraft, description, subjects: Object.entries(max).map(([subjectId, maxMarks]) => ({ subjectId, maxMarks })) },
      });
      toast(isDraft ? 'Exam saved as draft' : 'Exam scheduled');
      onCreated(exam.id);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card stack" style={{ marginBottom: 24 }} onSubmit={submit}>
      <div className="h2">Create exam</div>
      <div className="form-grid">
        <Field label="Exam name"><input className="input" placeholder="e.g. Sunday Weekly Test" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Class">
          <select className="select" value={classId} onChange={(e) => pickClass(e.target.value)}>
            <option value="">Select class</option>
            {classes.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Exam date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Status"><Toggles options={[{ value: false, label: 'Scheduled' }, { value: true, label: 'Draft · not announced' }]} value={isDraft} onChange={setIsDraft} /></Field>
        <div className="field full">
          <span>Subjects & maximum marks <em>{Object.keys(max).length} selected · total {total}</em></span>
          <div className="row wrap">
            {(subjects ?? []).map((s) => {
              const on = s.id in max;
              return (
                <div key={s.id} className="row" style={{ gap: 6 }}>
                  <button type="button" className={`toggle${on ? ' on' : ''}`} aria-pressed={on}
                    onClick={() => setMax(on ? Object.fromEntries(Object.entries(max).filter(([k]) => k !== s.id)) : { ...max, [s.id]: 50 })}>
                    {s.name}
                  </button>
                  {on && <input className="input num" style={{ width: 84, minHeight: 38 }} type="number" min={1} max={1000} aria-label={`${s.name} maximum marks`} value={max[s.id]} onChange={(e) => setMax({ ...max, [s.id]: Number(e.target.value) })} />}
                </div>
              );
            })}
          </div>
        </div>
        <Field label="Description" optional><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Results stay unpublished until marks are entered and you publish them.</p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn primary" disabled={saving}>{isDraft ? 'Save draft' : 'Schedule exam'}</button>
      </div>
    </form>
  );
}
