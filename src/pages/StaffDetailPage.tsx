import { Link, useParams } from 'react-router-dom';

import { api } from '../api/client';
import type { Permission, SchoolClass, StaffMember } from '../api/types';
import { Icon } from '../components/icons';
import { Avatar, Chip, ErrorState, Loading, PageHead, Switch, useUi } from '../components/ui';
import { fmtDate, PERMISSION_INFO, phone } from '../lib/format';
import { useApi } from '../lib/hooks';

export function StaffDetailPage() {
  const { id } = useParams();
  const { toast } = useUi();
  const { data: m, error, reload } = useApi<StaffMember & { availablePermissions: Permission[] }>(`/staff/${id}`);
  const { data: classes } = useApi<SchoolClass[]>('/classes');
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!m) return <Loading />;

  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast(message);
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const togglePermission = (p: Permission, on: boolean) =>
    run(
      () => api(`/staff/${m.id}/permissions`, { method: 'PUT', body: { permissions: on ? [...m.permissions, p] : m.permissions.filter((x) => x !== p) } }),
      p === 'sendSms' && !on ? `${m.name.split(' ')[0]} can no longer send messages — applies on their next request` : 'Permission updated',
    );
  const toggleClass = (cid: string) =>
    run(
      () => api(`/staff/${m.id}`, { method: 'PATCH', body: { assignedClassIds: m.assignedClassIds.includes(cid) ? m.assignedClassIds.filter((x) => x !== cid) : [...m.assignedClassIds, cid] } }),
      'Assigned classes updated',
    );

  return (
    <>
      <Link to="/staff" className="btn ghost small" style={{ marginBottom: 12 }}><Icon name="back" />Staff</Link>
      <PageHead title={m.name} subtitle={m.designation} actions={<Avatar name={m.name} large />} />
      <div className="split">
        <div className="card">
          <div className="label" style={{ marginBottom: 6 }}>Permissions</div>
          <p className="small muted" style={{ marginTop: 0 }}>Enforced by the API on every request — changes take effect immediately.</p>
          {m.availablePermissions.map((p) => (
            <div key={p} className="row" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{PERMISSION_INFO[p][0]}</div><div className="small muted">{PERMISSION_INFO[p][1]}</div></div>
              <Switch label={PERMISSION_INFO[p][0]} checked={m.permissions.includes(p)} onChange={(on) => togglePermission(p, on)} />
            </div>
          ))}
          <div className="row" style={{ padding: '12px 0', opacity: 0.6 }}>
            <Icon name="lock" style={{ width: 18 }} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>Fees & financial reports</div><div className="small muted">Admin only · cannot be granted</div></div>
            <Switch label="Fees and financial reports" checked={false} disabled />
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="row wrap" style={{ marginBottom: 10 }}>
              {m.isActive ? <Chip tone="success">Active</Chip> : <Chip tone="muted">Inactive</Chip>}
              {m.accountStatus === 'invitationPending' && <Chip tone="warning">Invitation pending</Chip>}
            </div>
            <div className="small">{phone(m.phone)}</div>
            <div className="small">{m.email}</div>
            <div className="small muted">Joined {fmtDate(m.joinedOn)}</div>
            <div className="divider" />
            <div className="row">
              <span style={{ flex: 1, fontWeight: 600 }}>Account active</span>
              <Switch label="Account active" checked={m.isActive} onChange={(on) => run(() => api(`/staff/${m.id}`, { method: 'PATCH', body: { isActive: on } }), on ? 'Account activated' : 'Account deactivated')} />
            </div>
            {m.accountStatus === 'invitationPending' ? (
              <div className="cream" style={{ marginTop: 14, padding: 18 }}>
                <div className="label">Invite code</div>
                <div className="num" style={{ fontSize: 30, fontWeight: 800, letterSpacing: 4, margin: '4px 0 8px' }}>{m.inviteCode ?? '—'}</div>
                <p className="small muted" style={{ margin: '0 0 12px' }}>
                  Share this with {m.name.split(' ')[0]}. They choose "I have an invite code", enter {phone(m.phone)}, this code and a new password.
                </p>
                <button className="btn small" onClick={() => run(() => api(`/staff/${m.id}/reset-invite`, { method: 'POST' }), 'New invite code created')}>Create a new code</button>
              </div>
            ) : (
              <button className="btn small" style={{ marginTop: 12 }} onClick={() => run(() => api(`/staff/${m.id}/reset-invite`, { method: 'POST' }), 'Password reset · new invite code created')}>
                Reset password (new invite code)
              </button>
            )}
          </div>
          <div className="card">
            <div className="label" style={{ marginBottom: 10 }}>Assigned classes</div>
            <div className="row wrap">
              {(classes ?? []).filter((c) => c.isActive).map((c) => (
                <button key={c.id} className={`toggle${m.assignedClassIds.includes(c.id) ? ' on' : ''}`} aria-pressed={m.assignedClassIds.includes(c.id)} onClick={() => toggleClass(c.id)}>{c.name}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
