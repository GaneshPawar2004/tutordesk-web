import { useDeferredValue, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api/client';
import type { AcademicYear, Batch, FeeRow, FeeSummary, Payment, SchoolClass } from '../api/types';
import { Icon } from '../components/icons';
import { Chip, Empty, ErrorState, FilterSelect, Loading, Metric, PageHead, PaymentChip, Progress, Stat, useUi } from '../components/ui';
import { useMe } from '../lib/auth';
import { compactInr, fmtDate, inr, METHOD_LABEL, plural } from '../lib/format';
import { useApi } from '../lib/hooks';

interface Summary {
  totals: FeeSummary;
  collectedThisMonth: number;
  statusCounts: { paid: number; partial: number; unpaid: number; noPlan: number; overdue: number };
  recentPayments: Payment[];
}

export function FeesPage() {
  const { me } = useMe();
  const navigate = useNavigate();
  const { toast, confirm } = useUi();
  const [yearId, setYearId] = useState(me.currentYearId);
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const query = useDeferredValue(q);
  const base = new URLSearchParams({ yearId, ...(classId ? { classId } : {}) });
  const { data: sum, error } = useApi<Summary>(`/fees/summary?${base}`);
  const list = useApi<FeeRow[]>(`/fees/students?${new URLSearchParams({ ...Object.fromEntries(base), ...(status ? { status } : {}), ...(query ? { q: query } : {}) })}`);
  const { data: years } = useApi<AcademicYear[]>('/academic-years');
  const { data: classes } = useApi<SchoolClass[]>('/classes');

  if (error) return <ErrorState error={error} />;

  const sendReminders = async () => {
    const ok = await confirm({
      title: 'Send fee reminders?',
      message: `A reminder with each student's overdue amount is queued for ${plural(sum?.statusCounts.overdue ?? 0, 'parent')}. Only one reminder batch per day. SMS sending is simulated for now.`,
      confirmLabel: 'Queue reminders',
    });
    if (!ok) return;
    try {
      const res = await api<{ created: boolean; batch: Batch }>('/messages/fee-reminders', { method: 'POST' });
      if (!res.created) toast("Today's reminders were already sent — nothing was resent.", 'error');
      navigate(`/messages/${res.batch.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Admin only"
        title="Fees & payments"
        actions={<button className="btn" onClick={sendReminders} disabled={yearId !== me.currentYearId}><Icon name="send" />Send reminders</button>}
      />
      <div className="row wrap" style={{ marginBottom: 16 }}>
        <FilterSelect label="Year" value={yearId} onChange={setYearId} options={(years ?? []).map((y) => ({ value: y.id, label: y.label }))} />
        <FilterSelect label="Class" value={classId} onChange={setClassId} options={[{ value: '', label: 'All' }, ...(classes ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
      </div>
      {!sum ? (
        <Loading rows={3} />
      ) : (
        <div className="split" style={{ marginBottom: 24 }}>
          <div className="cream">
            <div className="label">Total fees agreed</div>
            <div className="stat-big" style={{ margin: '8px 0 16px' }}>{inr(sum.totals.agreed)}</div>
            <Progress value={sum.totals.agreed ? sum.totals.paid / sum.totals.agreed : 0} />
            <div className="grid grid-3" style={{ marginTop: 16 }}>
              <Stat label="Collected" value={inr(sum.totals.paid)} />
              <Stat label="Outstanding" value={inr(sum.totals.outstanding)} color="#b4541f" />
              <Stat label="Overdue" value={inr(sum.totals.overdue)} color="#c03a3b" />
            </div>
          </div>
          <div className="grid grid-2">
            <Metric label="Collected this month" value={compactInr(sum.collectedThisMonth)} icon="chart" tone="success" />
            <Metric label="Students overdue" value={sum.statusCounts.overdue} icon="alert" tone="error" onClick={() => setStatus('overdue')} />
            <Metric label="Partially paid" value={sum.statusCounts.partial} icon="wallet" tone="warning" onClick={() => setStatus('partial')} />
            <Metric label="Fee not set" value={sum.statusCounts.noPlan} icon="info" tone="muted" onClick={() => setStatus('none')} />
          </div>
        </div>
      )}

      <div className="split">
        <div>
          <div className="row wrap" style={{ marginBottom: 12 }}>
            <h2 className="h2" style={{ flex: 1 }}>Student fees</h2>
            <input className="input search" style={{ maxWidth: 240 }} placeholder="Search student" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search student fees" />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={[
              { value: '', label: 'All' }, { value: 'paid', label: 'Paid' }, { value: 'partial', label: 'Partial' },
              { value: 'unpaid', label: 'Unpaid' }, { value: 'overdue', label: 'Overdue' }, { value: 'none', label: 'Fee not set' },
            ]} />
          </div>
          {!list.data ? <Loading /> : list.data.length === 0 ? (
            <Empty icon="search" title="No matching students" message="Change the filters to see fee records." />
          ) : (
            <div className="card flush table-wrap">
              <table className="table">
                <thead><tr><th>Student</th><th>Class</th><th className="right">Agreed</th><th className="right">Paid</th><th className="right">Balance</th><th>Status</th></tr></thead>
                <tbody>
                  {list.data.map((r) => (
                    <tr key={r.enrollmentId} className="clickable" onClick={() => navigate(`/fees/${r.enrollmentId}`)}>
                      <td style={{ fontWeight: 600 }}>{r.studentName}<div className="small faint">{r.studentId}</div></td>
                      <td>{r.className}</td>
                      <td className="right num">{r.hasPlan ? inr(r.agreed) : '—'}</td>
                      <td className="right num">{r.hasPlan ? inr(r.paid) : '—'}</td>
                      <td className="right num" style={{ fontWeight: 700 }}>{r.hasPlan ? inr(r.outstanding) : '—'}</td>
                      <td>{!r.hasPlan ? <Chip tone="muted">Fee not set</Chip> : r.status && <PaymentChip status={r.status} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          <div className="label" style={{ marginBottom: 10 }}>Recent transactions</div>
          {!sum?.recentPayments.length ? <p className="small muted">No payment history.</p> : sum.recentPayments.map((p) => (
            <div key={p.id} className="row" style={{ padding: '9px 0', cursor: 'pointer' }} onClick={() => navigate(`/fees/${p.enrollmentId}`)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontWeight: 600 }}>{p.studentName}</div>
                <div className="small muted">{fmtDate(p.date)} · {METHOD_LABEL[p.method]}</div>
              </div>
              <strong className="num" style={{ color: 'var(--success)' }}>+{inr(p.amount)}</strong>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
