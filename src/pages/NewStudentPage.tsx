import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError, api } from '../api/client';
import type { AcademicYear, Frequency, PaymentMethod, SchoolClass } from '../api/types';
import { Icon } from '../components/icons';
import { Field, PageHead, Stat, Switch, Toggles, useUi } from '../components/ui';
import { useMe } from '../lib/auth';
import { inr, isoDate, METHOD_LABEL } from '../lib/format';
import { useApi } from '../lib/hooks';

const FREQS: { value: Frequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' },
  { value: 'halfYearly', label: 'Half-yearly' }, { value: 'custom', label: 'Custom' },
];

export function NewStudentPage() {
  const { me } = useMe();
  const { toast } = useUi();
  const navigate = useNavigate();
  const { data: years } = useApi<AcademicYear[]>('/academic-years');
  const { data: classes } = useApi<SchoolClass[]>('/classes');
  const { data: nextId } = useApi<{ id: string }>('/students/next-id');
  const today = isoDate(new Date());

  const [f, setF] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: '', parentName: '', parentPhone: '', altPhone: '', address: '',
    yearId: me.currentYearId, classId: '', enrolledOn: today, active: true,
  });
  const [withFee, setWithFee] = useState(true);
  const [fee, setFee] = useState({ annualFee: '', installmentCount: 6, frequency: 'monthly' as Frequency, firstDueDate: today, initialAmount: '', paymentDate: today, method: 'upi' as PaymentMethod, note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const annual = Number(fee.annualFee) || 0;
  const initial = Number(fee.initialAmount) || 0;
  const perInstalment = fee.installmentCount ? Math.floor(annual / fee.installmentCount) : 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.firstName.trim()) e.firstName = 'Enter first name';
    if (!f.lastName.trim()) e.lastName = 'Enter last name';
    if (!f.dateOfBirth) e.dateOfBirth = 'Select date of birth';
    if (!f.parentName.trim()) e.parentName = 'Enter parent or guardian name';
    if (!/^[6-9]\d{9}$/.test(f.parentPhone)) e.parentPhone = 'Enter a 10-digit mobile number';
    if (f.altPhone && !/^[6-9]\d{9}$/.test(f.altPhone)) e.altPhone = 'Enter a 10-digit mobile number';
    if (!f.classId) e.classId = 'Select a class';
    if (withFee) {
      if (annual <= 0) e.annualFee = 'Enter the agreed annual fee';
      if (initial > annual) e.initialAmount = 'Cannot exceed the annual fee';
      if (fee.installmentCount < 1 || fee.installmentCount > 36) e.installmentCount = '1 to 36 instalments';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const res = await api<{ student: { id: string } }>('/students', {
        method: 'POST',
        body: {
          ...f,
          gender: f.gender || undefined,
          altPhone: f.altPhone || undefined,
          address: f.address || undefined,
          fee: withFee
            ? { annualFee: annual, installmentCount: fee.installmentCount, frequency: fee.frequency, firstDueDate: fee.firstDueDate, initialAmount: initial, paymentDate: fee.paymentDate, method: fee.method, note: fee.note || undefined }
            : undefined,
        },
      });
      toast(`Student ${res.student.id} added`);
      navigate(`/students/${res.student.id}`);
    } catch (e) {
      const field = ((e as ApiError).details as { field?: string } | undefined)?.field;
      if (field) setErrors({ [field]: (e as Error).message });
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Link to="/students" className="btn ghost small" style={{ marginBottom: 12 }}><Icon name="back" />Students</Link>
      <PageHead title="New admission" subtitle={`Student ID ${nextId?.id ?? '…'} (generated)`}
        actions={<><Link className="btn" to="/students">Cancel</Link><button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save student'}</button></>} />

      <div className="stack" style={{ maxWidth: 860 }}>
        <section className="card">
          <h2 className="h2" style={{ marginBottom: 16 }}>A · Student information</h2>
          <div className="form-grid">
            <Field label="First name" error={errors.firstName}><input className={`input${errors.firstName ? ' invalid' : ''}`} value={f.firstName} onChange={set('firstName')} /></Field>
            <Field label="Last name" error={errors.lastName}><input className={`input${errors.lastName ? ' invalid' : ''}`} value={f.lastName} onChange={set('lastName')} /></Field>
            <Field label="Date of birth" error={errors.dateOfBirth}><input type="date" max={today} className={`input${errors.dateOfBirth ? ' invalid' : ''}`} value={f.dateOfBirth} onChange={set('dateOfBirth')} /></Field>
            <Field label="Gender" optional>
              <select className="select" value={f.gender} onChange={set('gender')}>
                <option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
              </select>
            </Field>
            <Field label="Parent / guardian name" error={errors.parentName}><input className={`input${errors.parentName ? ' invalid' : ''}`} value={f.parentName} onChange={set('parentName')} /></Field>
            <Field label="Parent mobile number" error={errors.parentPhone}>
              <div className="input-prefix"><b>+91</b><input className={`input${errors.parentPhone ? ' invalid' : ''}`} style={{ paddingLeft: 52 }} inputMode="numeric" maxLength={10} value={f.parentPhone} onChange={(e) => setF({ ...f, parentPhone: e.target.value.replace(/\D/g, '') })} /></div>
            </Field>
            <Field label="Alternate mobile number" optional error={errors.altPhone}>
              <div className="input-prefix"><b>+91</b><input className="input" style={{ paddingLeft: 52 }} inputMode="numeric" maxLength={10} value={f.altPhone} onChange={(e) => setF({ ...f, altPhone: e.target.value.replace(/\D/g, '') })} /></div>
            </Field>
            <Field label="Address" optional><input className="input" value={f.address} onChange={set('address')} /></Field>
          </div>
        </section>

        <section className="card">
          <h2 className="h2" style={{ marginBottom: 16 }}>B · Enrollment</h2>
          <div className="form-grid">
            <Field label="Academic year">
              <select className="select" value={f.yearId} onChange={set('yearId')}>
                {(years ?? []).filter((y) => y.status !== 'closed').map((y) => <option key={y.id} value={y.id}>{y.label} · {y.status}</option>)}
              </select>
            </Field>
            <Field label="Class" error={errors.classId}>
              <select className={`select${errors.classId ? ' invalid' : ''}`} value={f.classId} onChange={set('classId')}>
                <option value="">Select class</option>
                {(classes ?? []).filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.sessionLabel}</option>)}
              </select>
            </Field>
            <Field label="Enrollment date"><input type="date" className="input" value={f.enrolledOn} onChange={set('enrolledOn')} /></Field>
            <Field label="Enrollment status"><Toggles options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} value={f.active} onChange={(v) => setF({ ...f, active: v })} /></Field>
          </div>
        </section>

        <section className="card">
          <div className="row" style={{ marginBottom: 16 }}>
            <h2 className="h2" style={{ flex: 1 }}>C · Fees <span className="small muted">(admin only)</span></h2>
            <span className="small muted">Add fee agreement now</span>
            <Switch checked={withFee} onChange={setWithFee} label="Add fee agreement now" />
          </div>
          {withFee && (
            <>
              <div className="form-grid">
                <Field label="Agreed annual fee" error={errors.annualFee}>
                  <div className="input-prefix"><b>₹</b><input className={`input num${errors.annualFee ? ' invalid' : ''}`} inputMode="numeric" value={fee.annualFee} onChange={(e) => setFee({ ...fee, annualFee: e.target.value.replace(/\D/g, '') })} /></div>
                </Field>
                <Field label="Number of instalments" error={errors.installmentCount}>
                  <input type="number" min={1} max={36} className="input num" value={fee.installmentCount} onChange={(e) => setFee({ ...fee, installmentCount: Number(e.target.value) })} />
                </Field>
                <Field label="Payment frequency"><Toggles options={FREQS} value={fee.frequency} onChange={(v) => setFee({ ...fee, frequency: v })} /></Field>
                <Field label="First instalment due"><input type="date" className="input" value={fee.firstDueDate} onChange={(e) => setFee({ ...fee, firstDueDate: e.target.value })} /></Field>
                <Field label="Initial amount received" optional error={errors.initialAmount}>
                  <div className="input-prefix"><b>₹</b><input className={`input num${errors.initialAmount ? ' invalid' : ''}`} inputMode="numeric" value={fee.initialAmount} onChange={(e) => setFee({ ...fee, initialAmount: e.target.value.replace(/\D/g, '') })} /></div>
                </Field>
                {initial > 0 && <Field label="Payment date"><input type="date" max={today} className="input" value={fee.paymentDate} onChange={(e) => setFee({ ...fee, paymentDate: e.target.value })} /></Field>}
                {initial > 0 && (
                  <Field label="Payment method">
                    <Toggles options={Object.entries(METHOD_LABEL).map(([value, label]) => ({ value: value as PaymentMethod, label }))} value={fee.method} onChange={(v) => setFee({ ...fee, method: v })} />
                  </Field>
                )}
                <Field label="Note" optional><input className="input" placeholder="e.g. Sibling concession" value={fee.note} onChange={(e) => setFee({ ...fee, note: e.target.value })} /></Field>
              </div>
              <div className="cream" style={{ marginTop: 20 }}>
                <div className="label" style={{ marginBottom: 12 }}>Live calculation</div>
                <div className="grid grid-3">
                  <Stat label="Total agreed" value={inr(annual)} />
                  <Stat label="Received" value={inr(Math.min(initial, annual))} />
                  <Stat label="Remaining" value={inr(Math.max(0, annual - initial))} color={annual - initial > 0 ? '#b4541f' : '#138a5e'} />
                </div>
                {annual > 0 && fee.installmentCount > 0 && (
                  <p className="small muted" style={{ marginBottom: 0 }}>
                    {fee.installmentCount} instalments of about {inr(perInstalment)}. The initial payment does not have to equal one instalment.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </form>
  );
}
