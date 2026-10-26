import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError, api } from '../api/client';
import type { SchoolClass, StaffMember } from '../api/types';
import { Icon } from '../components/icons';
import { Avatar, Chip, ErrorState, Field, Loading, Notice, PageHead, useUi } from '../components/ui';
import { phone } from '../lib/format';
import { useApi } from '../lib/hooks';

export function StaffPage() {
  const navigate = useNavigate();
  const { data, error, reload } = useApi<StaffMember[]>('/staff');
  const { data: classes } = useApi<SchoolClass[]>('/classes');
  const [adding, setAdding] = useState(false);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const className = (id: string) => classes?.find((c) => c.id === id)?.name ?? id;

  return (
    <>
      <PageHead eyebrow="Admin only" title="Staff" subtitle={`${data.length} team members`} actions={!adding && <button className="btn primary" onClick={() => setAdding(true)}><Icon name="plus" />Add staff</button>} />
      <div style={{ marginBottom: 16 }}><Notice tone="warn">Fees, payments and financial reports are admin-only and cannot be granted to staff.</Notice></div>
      {adding && classes && <AddStaff classes={classes} onDone={(id) => (id ? navigate(`/staff/${id}`) : setAdding(false))} />}
      <div className="grid grid-3">
        {data.map((s) => (
          <div key={s.id} className="card link stack" style={{ gap: 10 }} role="button" tabIndex={0} onClick={() => navigate(`/staff/${s.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/staff/${s.id}`)}>
            <div className="row">
              <Avatar name={s.name} />
              <div style={{ flex: 1, minWidth: 0 }}><div className="h3 truncate">{s.name}</div><div className="small muted truncate">{s.designation}</div></div>
              {!s.isActive ? <Chip tone="muted">Inactive</Chip> : s.accountStatus === 'invitationPending' ? <Chip tone="warning">Invite pending</Chip> : <Chip tone="success">Active</Chip>}
            </div>
            <div className="small muted">{phone(s.phone)} · {s.email}</div>
            <div className="small">{s.assignedClassIds.length ? s.assignedClassIds.map(className).join(', ') : 'No classes assigned'}</div>
            <div className="small accent-text">{s.permissions.length} of 7 permissions · no fee access</div>
          </div>
        ))}
      </div>
    </>
  );
}

function AddStaff({ classes, onDone }: { classes: SchoolClass[]; onDone: (id?: string) => void }) {
  const { toast } = useUi();
  const [f, setF] = useState({ name: '', email: '', phone: '', designation: '' });
  const [picked, setPicked] = useState<string[]>([]);
  const [err, setErr] = useState<Record<string, string>>({});
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const m = await api<StaffMember>('/staff', { method: 'POST', body: { ...f, assignedClassIds: picked } });
      toast('Staff added · invitation pending (demo — no email sent)');
      onDone(m.id);
    } catch (e2) {
      const field = ((e2 as ApiError).details as { field?: string } | undefined)?.field;
      if (field) setErr({ [field]: (e2 as Error).message });
      toast((e2 as Error).message, 'error');
    }
  };
  return (
    <form className="card stack" style={{ marginBottom: 20 }} onSubmit={submit}>
      <div className="h2">Add staff</div>
      <div className="form-grid">
        {(['name', 'designation', 'email', 'phone'] as const).map((k) => (
          <Field key={k} label={{ name: 'Full name', designation: 'Role / designation', email: 'Email', phone: 'Phone number' }[k]} error={err[k]}>
            <input className={`input${err[k] ? ' invalid' : ''}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </Field>
        ))}
        <div className="field full">
          <span>Assigned classes</span>
          <div className="row wrap">
            {classes.filter((c) => c.isActive).map((c) => (
              <button type="button" key={c.id} className={`toggle${picked.includes(c.id) ? ' on' : ''}`} aria-pressed={picked.includes(c.id)}
                onClick={() => setPicked(picked.includes(c.id) ? picked.filter((x) => x !== c.id) : [...picked, c.id])}>{c.name}</button>
            ))}
          </div>
        </div>
      </div>
      <Notice>The staff member appears as "Invitation pending" and sets their own password when they accept. No password is created or shown here.</Notice>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={() => onDone()}>Cancel</button>
        <button className="btn primary">Add & send invite</button>
      </div>
    </form>
  );
}
