import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { Empty, Loading, UiProvider } from './components/ui';
import { AuthProvider, useAuth } from './lib/auth';
import { AcademicPage } from './pages/AcademicPage';
import { AttendancePage } from './pages/AttendancePage';
import { BatchPage } from './pages/BatchPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExamDetailPage } from './pages/ExamDetailPage';
import { ExamsPage } from './pages/ExamsPage';
import { FeeDetailPage } from './pages/FeeDetailPage';
import { FeesPage } from './pages/FeesPage';
import { LoginPage } from './pages/LoginPage';
import { MarkAttendancePage } from './pages/MarkAttendancePage';
import { MessagesPage } from './pages/MessagesPage';
import { NewStudentPage } from './pages/NewStudentPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SessionPage } from './pages/SessionPage';
import { StaffDetailPage } from './pages/StaffDetailPage';
import { StaffPage } from './pages/StaffPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { StudentsPage } from './pages/StudentsPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { me, ready } = useAuth();
  if (!ready) return <div className="content"><Loading /></div>;
  if (!me) return <Navigate to="/login" replace />;
  return children;
}

/** Hides admin routes from staff. The API also rejects them with 403. */
function AdminOnly({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  if (me?.role !== 'admin') {
    return <Empty icon="lock" title="Admin only" message="Fees, staff and setup are managed by the tuition admin." />;
  }
  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UiProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<DashboardPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/new" element={<AdminOnly><NewStudentPage /></AdminOnly>} />
              <Route path="students/:id" element={<StudentProfilePage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="attendance/mark/:classId" element={<MarkAttendancePage />} />
              <Route path="attendance/sessions/:id" element={<SessionPage />} />
              <Route path="exams" element={<ExamsPage />} />
              <Route path="exams/:id" element={<ExamDetailPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="messages/:id" element={<BatchPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="fees" element={<AdminOnly><FeesPage /></AdminOnly>} />
              <Route path="fees/:enrollmentId" element={<AdminOnly><FeeDetailPage /></AdminOnly>} />
              <Route path="staff" element={<AdminOnly><StaffPage /></AdminOnly>} />
              <Route path="staff/:id" element={<AdminOnly><StaffDetailPage /></AdminOnly>} />
              <Route path="academic" element={<AdminOnly><AcademicPage /></AdminOnly>} />
              <Route path="*" element={<Empty title="Page not found" message="This page does not exist." />} />
            </Route>
          </Routes>
        </UiProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
