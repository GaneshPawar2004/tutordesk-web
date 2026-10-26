import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api/client';
import type { Batch, DeliveryStatus } from '../api/types';
import { Icon } from '../components/icons';
import { DeliveryChip, ErrorState, Loading, Notice, PageHead, Stat, Toggles, useUi } from '../components/ui';
import { useMe } from '../lib/auth';
import { fmtDate, fmtTime } from '../lib/format';
import { useApi } from '../lib/hooks';
import { SegBar } from './MessagesPage';

export function BatchPage() {
  const { id } = useParams();
  const { me } = useMe();
  const { toast, confirm } = useUi();
  const { data: b, error, reload } = useApi<Batch>(`/messages/batches/${id}`, { pollMs: 1500 });
  const [filter, setFilter] = useState<'all' | DeliveryStatus>('all');
  const [open, setOpen] = useState<string | null>(null);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!b?.recipients) return <Loading />;

  const stuck = b.recipients.some((r) => r.status === 'queued' && r.attempts === 0);
  const retry = async () => {
    const ok = await confirm({ title: `Retry ${b.stats.failed} failed messages?`, message: 'Only failed (and stuck pending) recipients are sent again. Parents who already received this message are not messaged twice.', confirmLabel: 'Retry' });
    if (!ok) return;
    try {
      const res = await api<{ retried: number; pending: number }>(`/messages/batches/${b.id}/retry`, { method: 'POST' });
      toast(`Retrying ${res.retried + res.pending} messages`);
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const rows = b.recipients.filter((r) => filter === 'all' || r.status === filter || (filter === 'queued' && r.status === 'sending'));

  return (
    <>
      <Link to="/messages" className="btn ghost small" style={{ marginBottom: 12 }}><Icon name="back" />Messages</Link>
      <PageHead title={b.title} subtitle={`${b.createdBy} · ${fmtDate(b.createdAt)}, ${fmtTime(b.createdAt)}`}
        actions={me.canSendMessages && (b.stats.failed > 0 || stuck) && <button className="btn primary" onClick={retry}><Icon name="refresh" />Retry failed{stuck ? ' & pending' : ''}</button>} />
      <div className="split">
        <div className="stack">
          <div className="cream">
            <div className="grid grid-4">
              <Stat label="Recipients" value={b.stats.total} />
              <Stat label="Sent" value={b.stats.sent} />
              <Stat label="Failed" value={b.stats.failed} color={b.stats.failed ? '#c03a3b' : undefined} />
              <Stat label="Pending" value={b.stats.pending} />
            </div>
            <SegBar stats={b.stats} />
            <div className="small muted">{b.stats.delivered} delivered (reported by the device) · {b.stats.sent - b.stats.delivered} sent without a delivery report</div>
          </div>
          <div className="card flush">
            <div style={{ padding: 16 }}>
              <Toggles options={[
                { value: 'all' as const, label: `All ${b.stats.total}` }, { value: 'delivered' as const, label: `Delivered ${b.stats.delivered}` },
                { value: 'sent' as const, label: `Sent ${b.stats.sent - b.stats.delivered}` }, { value: 'failed' as const, label: `Failed ${b.stats.failed}` },
                { value: 'queued' as const, label: `Pending ${b.stats.pending}` },
              ]} value={filter} onChange={setFilter} />
            </div>
            {rows.map((r) => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <button className="list-row" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', cursor: 'pointer' }} aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 600 }}>{r.studentName}</div>
                    <div className="small muted">{r.parentName} · ••• {r.phone.slice(-4)}{r.failureReason ? <span style={{ color: 'var(--error)' }}> · {r.failureReason}</span> : null}</div>
                  </div>
                  <DeliveryChip status={r.status} />
                </button>
                {open === r.id && <div style={{ padding: '0 18px 16px' }}><div className="bubble">{r.body}</div><div className="small faint" style={{ marginTop: 6 }}>Attempts: {r.attempts}</div></div>}
              </div>
            ))}
          </div>
        </div>
        <div className="stack">
          <Notice>Simulated sending. Statuses update live; "Delivered" only appears when a device would report it.</Notice>
          <div className="card"><div className="label" style={{ marginBottom: 8 }}>Message preview</div><div className="bubble">{b.previewBody}</div></div>
        </div>
      </div>
    </>
  );
}
