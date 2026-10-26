import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import type { AppNotification } from '../api/types';
import { useMe } from '../lib/auth';
import { useApi } from '../lib/hooks';
import { Icon, type IconName } from './icons';
import { Avatar, Chip } from './ui';

interface NavItem { to: string; label: string; icon: IconName; show: boolean }

/** Role-aware shell: staff never get links to admin-only areas. */
export function Layout() {
  const { me, can, logout } = useMe();
  const navigate = useNavigate();
  const admin = me.role === 'admin';
  const { data: notes } = useApi<AppNotification[]>('/notifications', { pollMs: 20000 });
  const unread = notes?.filter((n) => !n.isRead).length ?? 0;

  const main: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: 'home', show: true },
    { to: '/students', label: 'Students', icon: 'users', show: can('viewStudents') },
    { to: '/attendance', label: 'Attendance', icon: 'check', show: true },
    { to: '/exams', label: 'Exams & marks', icon: 'exam', show: can('viewExamResults') || can('enterMarks') },
    { to: '/messages', label: 'Messages', icon: 'message', show: can('sendParentMessages') },
  ];
  const manage: NavItem[] = [
    { to: '/fees', label: 'Fees & payments', icon: 'wallet', show: admin },
    { to: '/staff', label: 'Staff', icon: 'badge', show: admin },
    { to: '/academic', label: 'Years & classes', icon: 'layers', show: admin },
  ];

  const link = (n: NavItem) =>
    n.show && (
      <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <Icon name={n.icon} />
        {n.label}
      </NavLink>
    );

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <span className="brand-mark">T</span>
          <span>Tutor<span className="accent-text">Desk</span></span>
        </div>
        {main.map(link)}
        {admin && <div className="label nav-section">Manage</div>}
        {manage.map(link)}
        <div className="sidebar-foot">
          <div className="row">
            <Avatar name={me.name} accent />
            <div className="truncate">
              <div className="truncate" style={{ fontWeight: 700, fontSize: 14 }}>{me.name}</div>
              <div className="truncate small muted">{me.designation}</div>
            </div>
          </div>
          <button className="btn small" style={{ marginTop: 12, width: '100%' }} onClick={() => { logout(); navigate('/login'); }}>
            <Icon name="logout" /> Switch preview
          </button>
        </div>
      </nav>
      <div className="main">
        <header className="topbar">
          <div className="truncate">
            <div style={{ fontWeight: 800 }} className="truncate">{me.tuition.name}</div>
            <div className="small muted">{admin ? 'Admin' : 'Staff'} preview · demo data</div>
          </div>
          <div className="spacer" />
          {!admin && <Chip tone="info">Staff view</Chip>}
          <button className="icon-btn" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} onClick={() => navigate('/notifications')}>
            <Icon name="bell" />
            {unread > 0 && <span className="badge-dot" />}
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
