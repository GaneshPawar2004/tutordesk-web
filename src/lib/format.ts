const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function compactInr(n: number) {
  const trim = (v: number) => v.toFixed(1).replace(/\.0$/, '');
  if (n >= 1e7) return `₹${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)}L`;
  if (n >= 1e3) return `₹${trim(n / 1e3)}K`;
  return inr(n);
}

/** Parses YYYY-MM-DD as a local date (not UTC). */
export function parseDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function fmtDate(s: string) {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function shortDate(s: string) {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function longToday() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function relative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${Math.round(diff)} min ago`;
  if (diff < 60 * 24 && new Date(iso).getDate() === new Date().getDate()) return fmtTime(iso);
  return `${shortDate(iso)}, ${fmtTime(iso)}`;
}

export const phone = (p: string) => (p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p);

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export const pct = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}%`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', bankTransfer: 'Bank transfer', cheque: 'Cheque', card: 'Card',
};

export const PERMISSION_INFO: Record<string, [string, string]> = {
  viewStudents: ['View student profiles', 'See student details and parent contacts for assigned classes'],
  markAttendance: ['Mark attendance', 'Take and save attendance for assigned classes'],
  viewExamResults: ['View exam results', 'Open exams and published results'],
  enterMarks: ['Enter marks', 'Create exams, enter and publish marks'],
  sendParentMessages: ['Send parent messages', 'Open the Messages centre and prepare notifications'],
  sendSms: ['Send SMS notifications', 'Allow prepared messages to be queued for SMS delivery'],
  editStudents: ['Edit student information', 'Update student and parent details (no fee access)'],
};
