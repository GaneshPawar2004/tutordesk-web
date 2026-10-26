import { useDeferredValue, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import type { AcademicYear, SchoolClass, StudentRow } from '../api/types';
import { Icon } from '../components/icons';
import { Avatar, Chip, Empty, ErrorState, FilterSelect, Loading, PageHead } from '../components/ui';
import { useMe } from '../lib/auth';
import { plural } from '../lib/format';
import { useApi } from '../lib/hooks';

export function StudentsPage() {
  const { me, can } = useMe();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const query = useDeferredValue(q);
  const [search] = useSearchParams();
  const [classId, setClassId] = useState(search.get('classId') ?? '');
  const [yearId, setYearId] = useState(me.currentYearId);
  const [status, setStatus] = useState('active');
  const params = new URLSearchParams({ yearId, status, ...(classId ? { classId } : {}), ...(query ? { q: query } : {}) });
  const { data, error, loading, reload } = useApi<StudentRow[]>(can('viewStudents') ? `/students?${params}` : null);
  const { data: classes } = useApi<SchoolClass[]>(`/classes?yearId=${yearId}`);
  const { data: years } = useApi<AcademicYear[]>('/academic-years');

  if (!can('viewStudents')) {
    return <Empty icon="lock" title="Student profiles are restricted" message="Ask the admin to enable student access for your account." />;
  }
  const filtered = !!(q || classId || status !== 'active');

  return (
    <>
      <PageHead
        eyebrow={years?.find((y) => y.id === yearId)?.label}
        title="Students"
        subtitle={data ? `${plural(data.length, 'student')}${me.role === 'staff' ? ' in your classes' : ''}` : ' '}
        actions={me.role === 'admin' && <Link className="btn primary" to="/students/new"><Icon name="plus" />Add student</Link>}
      />
      <div className="row wrap" style={{ marginBottom: 16 }}>
        <input className="input search" style={{ maxWidth: 380 }} placeholder="Search name, ID, parent or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" />
        <FilterSelect label="Class" value={classId} onChange={setClassId} options={[{ value: '', label: 'All' }, ...(classes ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
        <FilterSelect label="Year" value={yearId} onChange={setYearId} options={(years ?? []).map((y) => ({ value: y.id, label: y.label }))} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'all', label: 'All' }]} />
        {filtered && <button className="btn ghost small" onClick={() => { setQ(''); setClassId(''); setStatus('active'); }}>Clear filters</button>}
      </div>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data || (loading && !data.length) ? (
        <Loading />
      ) : data.length === 0 ? (
        filtered ? (
          <Empty icon="search" title="No matching students" message="Try another name, student ID or phone number, or clear the filters." />
        ) : (
          <Empty icon="users" title="No students in this year" message="Add a student or promote students into this academic year."
            action={me.role === 'admin' ? <Link className="btn primary" to="/students/new">Add student</Link> : undefined} />
        )
      ) : (
        <div className="card flush table-wrap">
          <table className="table">
            <thead>
              <tr><th>Student</th><th>ID</th><th>Class</th><th>Parent</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="clickable" onClick={() => navigate(`/students/${s.id}`)}>
                  <td>
                    <div className="row">
                      <Avatar name={`${s.firstName} ${s.lastName}`} />
                      <Link to={`/students/${s.id}`} style={{ fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>{s.firstName} {s.lastName}</Link>
                    </div>
                  </td>
                  <td className="num muted">{s.id}</td>
                  <td>{s.className}</td>
                  <td className="muted">{s.parentName} · ••• {s.parentPhoneSuffix}</td>
                  <td>{s.active ? <Chip tone="success">Active</Chip> : <Chip tone="muted">Inactive</Chip>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
