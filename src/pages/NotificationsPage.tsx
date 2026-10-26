import { api } from '../api/client';
import type { AppNotification } from '../api/types';
import { Empty, ErrorState, Loading, PageHead, Well } from '../components/ui';
import { relative } from '../lib/format';
import { useApi } from '../lib/hooks';

const ICONS = { attendance: 'check', exam: 'exam', student: 'users', messageFailed: 'alert', payment: 'rupee', staff: 'badge' } as const;

export function NotificationsPage() {
  const { data, error, reload } = useApi<AppNotification[]>('/notifications');
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const unread = data.filter((n) => !n.isRead).length;

  const markRead = async (n: AppNotification) => {
    if (n.isRead) return;
    await api(`/notifications/${n.id}/read`, { method: 'POST' });
    reload();
  };

  return (
    <>
      <PageHead title="Notifications" subtitle={unread ? `${unread} unread` : 'All caught up'}
        actions={unread > 0 && <button className="btn" onClick={async () => { await api('/notifications/read-all', { method: 'POST' }); reload(); }}>Mark all read</button>} />
      {data.length === 0 ? (
        <Empty icon="bell" title="No notifications" message="Attendance, results and message alerts will appear here." />
      ) : (
        <div className="card flush">
          {data.map((n) => (
            <button key={n.id} className="list-row" style={{ width: '100%', background: n.isRead ? 'none' : 'rgba(0,217,166,0.04)', border: 0, borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', cursor: 'pointer' }}
              aria-label={`${n.isRead ? 'Read' : 'Unread'}: ${n.title}`} onClick={() => markRead(n)}>
              <Well icon={ICONS[n.type as keyof typeof ICONS] ?? 'info'} tone={n.type === 'messageFailed' ? 'error' : n.type === 'payment' ? 'warning' : 'accent'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.isRead ? 500 : 700, color: n.isRead ? 'var(--text-2)' : undefined }}>{n.title}</div>
                <div className="small muted">{n.body}</div>
                <div className="small faint">{relative(n.createdAt)}</div>
              </div>
              {!n.isRead && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
