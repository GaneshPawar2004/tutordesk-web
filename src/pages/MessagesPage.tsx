import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api/client';
import type { Batch, SchoolClass } from '../api/types';
import { Icon } from '../components/icons';
import { Chip, Empty, ErrorState, Field, Loading, Notice, PageHead, Stat, Toggles, useUi } from '../components/ui';
import { useMe } from '../lib/auth';
import { relative } from '../lib/format';
import { useApi } from '../lib/hooks';

const CATEGORY: Record<Batch['category'], string> = {
  attendance: 'Attendance alerts', examResults: 'Exam results', feeReminder: 'Fee reminders', announcement: 'Announcements',
};

export function MessagesPage() {
  const { me, can } = useMe();
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const { data, error, reload } = useApi<Batch[]>(can('sendParentMessages') ? `/messages/batches${category ? `?category=${category}` : ''}` : null, { pollMs: 4000 });
  const [composing, setComposing] = useState(false);

  if (!can('sendParentMessages')) return <Empty icon="lock" title="Messaging is disabled" message="The admin has not enabled parent messaging for your account." />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const totals = (data ?? []).reduce((a, b) => ({ failed: a.failed + b.stats.failed, pending: a.pending + b.stats.pending, sent: a.sent + b.stats.sent }), { failed: 0, pending: 0, sent: 0 });
  const cats = Object.entries(CATEGORY).filter(([k]) => me.role === 'admin' || k !== 'feeReminder');

  return (
    <>
      <PageHead title="Messages" subtitle="Parent messages & SMS centre"
        actions={me.canSendMessages && !composing && <button className="btn primary" onClick={() => setComposing(true)}><Icon name="plus" />New announcement</button>} />
      <div className="stack" style={{ marginBottom: 20 }}>
        <Notice>Demo mode · sending is simulated by the API. No SMS provider is connected and no real messages are sent.</Notice>
        {!me.canSendMessages && <Notice tone="warn">SMS sending is disabled for your account. You can view batches but not send or retry.</Notice>}
      </div>
      {composing && <Composer onDone={(id) => (id ? navigate(`/messages/${id}`) : setComposing(false))} />}
      <div className="card grid grid-3" style={{ marginBottom: 20 }}>
        <Stat label="Sent" value={totals.sent} color="var(--success)" />
        <Stat label="Failed" value={totals.failed} color="var(--error)" />
        <Stat label="Pending" value={totals.pending} color="var(--info)" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <Toggles options={[{ value: '', label: 'All' }, ...cats.map(([value, label]) => ({ value, label }))]} value={category} onChange={setCategory} />
      </div>
      {!data ? <Loading /> : data.length === 0 ? (
        <Empty icon="message" title="No messages" message="Batches appear here when you notify parents about attendance, results or announcements." />
      ) : (
        <div className="stack">
          {data.map((b) => (
            <div key={b.id} className="card link" role="button" tabIndex={0} onClick={() => navigate(`/messages/${b.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/messages/${b.id}`)}>
              <div className="row wrap">
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className="h3">{b.title}</div>
                  <div className="small muted">{CATEGORY[b.category]} · {b.createdBy} · {relative(b.createdAt)}</div>
                </div>
                {b.stats.pending ? <Chip tone="info">{b.stats.pending} pending</Chip> : b.stats.failed ? <Chip tone="error">{b.stats.failed} failed</Chip> : <Chip tone="success">Completed</Chip>}
              </div>
              <SegBar stats={b.stats} />
              <div className="small muted num">{b.stats.total} recipients · {b.stats.sent} sent · {b.stats.delivered} delivered · {b.stats.failed} failed</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function SegBar({ stats }: { stats: Batch['stats'] }) {
  const parts = [
    [stats.delivered, 'var(--success)'], [stats.sent - stats.delivered, 'var(--accent)'], [stats.failed, 'var(--error)'], [stats.pending, 'var(--surface-3)'],
  ] as const;
  return (
    <div className="seg-bar" style={{ margin: '12px 0 8px' }} aria-hidden="true">
      {parts.filter(([n]) => n > 0).map(([n, c], i) => <div key={i} style={{ flex: n, background: c }} />)}
    </div>
  );
}

function Composer({ onDone }: { onDone: (batchId?: string) => void }) {
  const { toast, confirm } = useUi();
  const { me } = useMe();
  const { data: classes } = useApi<SchoolClass[]>('/classes');
  // One key per open composer: double-clicks resolve to the same batch on the server.
  const [draftKey] = useState(() => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [all, setAll] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const active = (classes ?? []).filter((c) => c.isActive);
  const chosen = all ? active : active.filter((c) => picked.includes(c.id));
  const recipients = chosen.reduce((a, c) => a + c.students, 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 10) return toast('Add a title and a message of at least a sentence', 'error');
    if (!recipients) return toast('Choose at least one class', 'error');
    const ok = await confirm({ title: 'Send announcement?', message: `"${title}" will be queued for ${recipients} parents. Demo only — no real SMS is sent.`, confirmLabel: 'Confirm & send' });
    if (!ok || sending) return;
    setSending(true);
    try {
      const res = await api<{ batch: Batch }>('/messages/announcements', { method: 'POST', body: { draftKey, title, body, classIds: chosen.map((c) => c.id) } });
      onDone(res.batch.id);
    } catch (err) {
      toast((err as Error).message, 'error');
      setSending(false);
    }
  };

  return (
    <form className="card stack" style={{ marginBottom: 20 }} onSubmit={submit}>
      <div className="h2">New announcement</div>
      <div className="form-grid">
        <Field label="Announcement title"><input className="input" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Target audience"><Toggles options={[{ value: true, label: 'All my classes' }, { value: false, label: 'Selected classes' }]} value={all} onChange={setAll} /></Field>
        {!all && (
          <div className="full row wrap">
            {active.map((c) => (
              <button type="button" key={c.id} className={`toggle${picked.includes(c.id) ? ' on' : ''}`} aria-pressed={picked.includes(c.id)}
                onClick={() => setPicked(picked.includes(c.id) ? picked.filter((x) => x !== c.id) : [...picked, c.id])}>{c.name}</button>
            ))}
          </div>
        )}
        <Field label={`Message (${body.length}/320)`}><textarea className="textarea" rows={4} maxLength={320} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <div className="field"><span>Preview</span><div className="bubble">{`${title || '[Title]'}\n\n${body || '[Your message]'}\n\n– ${me.tuition.name}`}</div></div>
      </div>
      <div className="row">
        <strong className="spacer">Estimated recipients: {recipients}</strong>
        <button type="button" className="btn" onClick={() => onDone()}>Cancel</button>
        <button className="btn primary" disabled={sending || !recipients}><Icon name="send" />Review & send</button>
      </div>
    </form>
  );
}
