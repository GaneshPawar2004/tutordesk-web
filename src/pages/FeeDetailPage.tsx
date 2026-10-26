import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api/client';
import type { FeeDetail, Frequency, PaymentMethod } from '../api/types';
import { Icon } from '../components/icons';
import { Chip, ErrorState, Field, Loading, Notice, PageHead, PaymentChip, Progress, Stat, Toggles, useUi } from '../components/ui';
import { fmtDate, inr, isoDate, METHOD_LABEL } from '../lib/format';
import { useApi } from '../lib/hooks';

const stateChip = { paid: ['success', 'Paid'], partial: ['warning', 'Partial'], due: ['muted', 'Upcoming'], overdue: ['error', 'Overdue'] } as const;

export function FeeDetailPage() {
  const { enrollmentId } = useParams();
  const { data: d, error, reload } = useApi<FeeDetail>(`/fees/enrollments/${enrollmentId}`);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!d) return <Loading />;

  return (
    <>
      <Link to="/fees" className="btn ghost small" style={{ marginBottom: 12 }}><Icon name="back" />Fees</Link>
      <PageHead title={d.student.name} subtitle={`${d.className} · ${d.yearLabel} · ${d.student.id}`}
        actions={<Link className="btn" to={`/students/${d.student.id}`}>Student profile</Link>} />
      {!d.plan ? (
        <PlanForm enrollmentId={d.enrollment.id} yearLabel={d.yearLabel} onSaved={reload} />
      ) : (
        <div className="split">
          <div className="stack">
            <div className="cream">
              <div className="row"><div className="label" style={{ flex: 1 }}>Annual fee · {d.yearLabel}</div>{d.summary.status && <PaymentChip status={d.summary.status} />}</div>
              <div className="grid grid-3" style={{ margin: '14px 0' }}>
                <Stat label="Agreed" value={inr(d.summary.agreed)} />
                <Stat label="Received" value={inr(d.summary.paid)} />
                <Stat label="Balance" value={inr(d.summary.outstanding)} color={d.summary.outstanding ? '#b4541f' : '#138a5e'} />
              </div>
              <Progress value={d.summary.agreed ? d.summary.paid / d.summary.agreed : 0} />
              {d.summary.overdue > 0 && <div className="small" style={{ marginTop: 8, color: '#b4541f', fontWeight: 700 }}>{inr(d.summary.overdue)} overdue</div>}
            </div>
            <div className="card flush">
              <div className="label" style={{ padding: '16px 18px 4px' }}>Instalment schedule · {d.plan.installmentCount} × {d.plan.frequency}</div>
              {d.installments.map((i) => (
                <div key={i.number} className="list-row">
                  <span className="num faint" style={{ width: 24 }}>#{i.number}</span>
                  <div style={{ flex: 1 }}><strong className="num">{inr(i.amount)}</strong><div className="small muted">Due {fmtDate(i.dueDate)}</div></div>
                  <Chip tone={stateChip[i.state][0]}>{i.state === 'partial' ? `${inr(i.amount - i.paid)} left` : stateChip[i.state][1]}</Chip>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="label" style={{ marginBottom: 8 }}>Payment history</div>
              {d.payments.length === 0 ? <p className="small muted">No payments yet.</p> : d.payments.map((p) => (
                <div key={p.id} className="row" style={{ padding: '8px 0' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{METHOD_LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ''}</div>
                    <div className="small muted">{fmtDate(p.date)} · recorded by {p.recordedBy}{p.note ? ` · ${p.note}` : ''}</div>
                  </div>
                  <strong className="num" style={{ color: 'var(--success)' }}>+{inr(p.amount)}</strong>
                </div>
              ))}
              <p className="small faint" style={{ marginBottom: 0 }}>Payments are never edited or deleted; corrections are recorded as new entries.</p>
            </div>
          </div>
          <div className="stack">
            {d.summary.outstanding > 0 ? <PaymentForm detail={d} onSaved={reload} /> : <Notice tone="ok">This enrollment is fully paid.</Notice>}
            {d.otherYears.length > 0 && (
              <div className="card">
                <div className="label" style={{ marginBottom: 8 }}>Other academic years</div>
                {d.otherYears.map((o) => (
                  <Link key={o.enrollmentId} to={`/fees/${o.enrollmentId}`} className="row" style={{ padding: '8px 0' }}>
                    <div style={{ flex: 1 }}><strong>{o.yearLabel}</strong><div className="small muted">{o.className}</div></div>
                    {o.hasPlan ? <span className="num" style={{ color: o.outstanding ? 'var(--warning)' : 'var(--success)', fontWeight: 700 }}>{o.outstanding ? `${inr(o.outstanding)} due` : 'Settled'}</span> : <Chip tone="muted">Fee not set</Chip>}
                  </Link>
                ))}
                <p className="small faint" style={{ marginBottom: 0 }}>Each year has its own agreement; unpaid amounts stay with their year.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PaymentForm({ detail, onSaved }: { detail: FeeDetail; onSaved: () => void }) {
  const { toast, confirm } = useUi();
  const today = isoDate(new Date());
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const next = detail.installments.find((i) => i.state !== 'paid');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return setErr('Enter the amount received');
    if (value > detail.summary.outstanding) return setErr(`Exceeds the outstanding balance of ${inr(detail.summary.outstanding)}`);
    setErr('');
    const ok = await confirm({ title: `Record ${inr(value)}?`, message: `${detail.student.name} · ${detail.yearLabel} · ${METHOD_LABEL[method]}`, confirmLabel: 'Record payment' });
    if (!ok || saving) return;
    setSaving(true);
    try {
      const res = await api<{ summary: { outstanding: number } }>('/fees/payments', {
        method: 'POST',
        body: { enrollmentId: detail.enrollment.id, amount: value, date, method, reference: reference || undefined, note: note || undefined },
      });
      toast(res.summary.outstanding ? `Payment recorded · ${inr(res.summary.outstanding)} remaining` : 'Payment recorded · fully paid');
      setAmount(''); setReference(''); setNote('');
      onSaved();
    } catch (e2) {
      toast((e2 as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit} noValidate>
      <div className="h2">Record payment</div>
      <Field label="Amount received" error={err}>
        <div className="input-prefix"><b>₹</b><input className={`input num${err ? ' invalid' : ''}`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} /></div>
      </Field>
      <div className="row wrap" style={{ gap: 8 }}>
        {next && next.amount - next.paid < detail.summary.outstanding && (
          <button type="button" className="btn small" onClick={() => setAmount(String(next.amount - next.paid))}>Next instalment {inr(next.amount - next.paid)}</button>
        )}
        <button type="button" className="btn small" onClick={() => setAmount(String(detail.summary.outstanding))}>Full balance {inr(detail.summary.outstanding)}</button>
      </div>
      <Field label="Payment date"><input type="date" max={today} className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Payment method">
        <Toggles options={Object.entries(METHOD_LABEL).map(([value, label]) => ({ value: value as PaymentMethod, label }))} value={method} onChange={setMethod} />
      </Field>
      <Field label="Transaction / reference number" optional><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
      <Field label="Notes" optional><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save payment'}</button>
    </form>
  );
}

function PlanForm({ enrollmentId, yearLabel, onSaved }: { enrollmentId: string; yearLabel: string; onSaved: () => void }) {
  const { toast } = useUi();
  const [fee, setFee] = useState('');
  const [count, setCount] = useState(4);
  const [frequency, setFrequency] = useState<Frequency>('quarterly');
  const [firstDueDate, setFirst] = useState(isoDate(new Date()));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/fees/enrollments/${enrollmentId}/plan`, { method: 'POST', body: { annualFee: Number(fee), installmentCount: count, frequency, firstDueDate } });
      toast('Fee agreement saved');
      onSaved();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };
  return (
    <form className="card stack" style={{ maxWidth: 560 }} onSubmit={submit}>
      <Notice tone="warn">No fee has been agreed for {yearLabel}. Enter it separately — previous years' fees are not copied or changed.</Notice>
      <Field label="Agreed annual fee"><div className="input-prefix"><b>₹</b><input className="input num" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} /></div></Field>
      <Field label="Number of instalments"><input type="number" min={1} max={36} className="input num" value={count} onChange={(e) => setCount(Number(e.target.value))} /></Field>
      <Field label="Frequency"><Toggles options={[{ value: 'monthly' as Frequency, label: 'Monthly' }, { value: 'quarterly' as Frequency, label: 'Quarterly' }, { value: 'halfYearly' as Frequency, label: 'Half-yearly' }, { value: 'custom' as Frequency, label: 'Custom' }]} value={frequency} onChange={setFrequency} /></Field>
      <Field label="First instalment due"><input type="date" className="input" value={firstDueDate} onChange={(e) => setFirst(e.target.value)} /></Field>
      <button className="btn primary" disabled={!Number(fee)}>Save fee agreement</button>
    </form>
  );
}
