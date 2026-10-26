export type Role = 'admin' | 'staff';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type ExamStatus = 'draft' | 'upcoming' | 'completed' | 'published';
export type DeliveryStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed';
export type PaymentMethod = 'cash' | 'upi' | 'bankTransfer' | 'cheque' | 'card';
export type Frequency = 'monthly' | 'quarterly' | 'halfYearly' | 'custom';
export type Permission =
  | 'viewStudents'
  | 'markAttendance'
  | 'viewExamResults'
  | 'enterMarks'
  | 'sendParentMessages'
  | 'sendSms'
  | 'editStudents';

export interface Tuition { id: string; name: string; city: string; address: string; phone: string; email: string }

export interface Me {
  role: Role;
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  permissions: Permission[] | 'all';
  assignedClassIds: string[];
  canSeeFinance: boolean;
  canSendMessages: boolean;
  tuition: Tuition;
  currentYearId: string;
}

export interface FeeSummary {
  agreed: number;
  paid: number;
  outstanding: number;
  overdue: number;
  status?: PaymentStatus;
  hasPlan?: boolean;
}

export interface Activity { type: string; title: string; subtitle: string; at: string }

export interface Dashboard {
  yearLabel: string;
  students: number;
  classes: { id: string; name: string; sessionLabel: string; students: number; marked: boolean }[];
  attendance: { classesMarked: number; classesTotal: number; present: number; absent: number; lateOrLeave: number; notMarked: number };
  upcomingExams: { id: string; name: string; date: string; className: string }[];
  resultsPending: number;
  activity: Activity[];
  events: { title: string; date: string; endDate?: string; subtitle: string }[];
  fees?: FeeSummary;
}

export interface AcademicYear { id: string; label: string; startDate: string; endDate: string; status: 'active' | 'upcoming' | 'closed'; enrollments: number }
export interface SchoolClass {
  id: string; name: string; grade: number; sessionLabel: string; room: string; subjectIds: string[];
  isActive: boolean; students: number; staff: { id: string; name: string }[];
}
export interface Subject { id: string; name: string; code: string }

export interface StudentRow {
  id: string; firstName: string; lastName: string; parentName: string; parentPhoneSuffix: string;
  classId: string; className: string; enrollmentId: string; active: boolean;
}

export interface Student {
  id: string; firstName: string; lastName: string; gender: string | null; dateOfBirth: string;
  parentName: string; parentPhone: string; altPhone: string | null; address: string | null;
  admittedOn: string; isActive: boolean;
}

export interface Enrollment {
  id: string; studentId: string; academicYearId: string; classId: string; enrolledOn: string;
  status: 'active' | 'promoted' | 'completed' | 'withdrawn'; className: string; yearLabel: string; fees?: FeeSummary;
}

export interface SubjectResult { subjectId: string; subject: string; maxMarks: number; marks: number | null; absent: boolean; entered: boolean }
export interface StudentResult {
  studentId: string; name?: string; subjects: SubjectResult[]; obtained: number; maxTotal: number; percent: number;
  complete: boolean; absentInAll: boolean; grade: { label: string; remark: string };
}

export interface StudentProfile {
  student: Student;
  enrollments: Enrollment[];
  attendance: {
    yearLabel: string; present: number; absent: number; late: number; leave: number; total: number; percent: number;
    history: { date: string; status: AttendanceStatus }[];
  };
  exams: { id: string; name: string; date: string; published: boolean; result: StudentResult }[];
}

export interface Installment { number: number; dueDate: string; amount: number; paid: number; state: 'paid' | 'partial' | 'due' | 'overdue' }
export interface Payment {
  id: string; enrollmentId: string; amount: number; date: string; method: PaymentMethod;
  reference: string | null; note: string | null; recordedBy: string; studentName?: string; studentId?: string;
}
export interface FeePlan { id: string; enrollmentId: string; annualFee: number; installmentCount: number; frequency: Frequency; firstDueDate: string; note: string | null }

export interface FeeRow extends FeeSummary {
  enrollmentId: string; studentId: string; studentName: string; classId: string; className: string; active: boolean;
}

export interface FeeDetail {
  enrollment: Enrollment; student: { id: string; name: string }; className: string; yearLabel: string;
  plan: FeePlan | null; summary: FeeSummary; installments: Installment[]; payments: Payment[];
  otherYears: (FeeSummary & { enrollmentId: string; yearLabel: string; className: string })[];
}

export interface AttendanceToday {
  date: string; yearLabel: string;
  classes: {
    classId: string; className: string; sessionLabel: string; students: number;
    session: { id: string; markedBy: string; markedAt: string; counts: Record<AttendanceStatus, number> } | null;
  }[];
}

export interface AttendanceSession {
  id: string; classId: string; className: string; date: string; markedBy: string; markedAt: string;
  counts: Record<AttendanceStatus, number>; total: number; locked: boolean;
  audit: { at: string; by: string; note: string }[];
  students: { id: string; name: string; status: AttendanceStatus }[];
  records: Record<string, AttendanceStatus>;
  notificationBatchId: string | null;
}

export interface ExamSummary {
  id: string; name: string; classId: string; className: string; academicYearId: string; date: string;
  subjects: { subjectId: string; maxMarks: number; name: string }[]; totalMax: number; status: ExamStatus;
  resultsPublished: boolean; revision: number; progress: { entered: number; total: number };
}
export interface MarkEntry { marks: number | null; absent: boolean }
export interface ExamDetail extends ExamSummary {
  description: string; createdBy: string; publishedAt: string | null; correctionLog: string[];
  marks: Record<string, Record<string, MarkEntry>>; students: { id: string; name: string }[];
  results: StudentResult[]; classAverage: number | null; notificationBatchId: string | null;
}

export interface BatchStats { total: number; delivered: number; sent: number; failed: number; pending: number }
export interface Recipient {
  id: string; studentId: string; studentName: string; parentName: string; phone: string; body: string;
  status: DeliveryStatus; attempts: number; failureReason: string | null; updatedAt: string;
}
export interface Batch {
  id: string; sourceKey: string; title: string; category: 'attendance' | 'examResults' | 'feeReminder' | 'announcement';
  classIds: string[]; createdBy: string; createdAt: string; previewBody: string; stats: BatchStats; recipients?: Recipient[];
}

export interface StaffMember {
  id: string; name: string; phone: string; email: string; designation: string; assignedClassIds: string[];
  permissions: Permission[]; joinedOn: string; isActive: boolean; accountStatus: 'active' | 'invitationPending';
}

export interface AppNotification { id: string; type: string; title: string; body: string; createdAt: string; isRead: boolean }
