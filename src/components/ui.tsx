import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import type { AttendanceStatus, DeliveryStatus, ExamStatus, PaymentStatus } from '../api/types';
import { initials as toInitials } from '../lib/format';
import { Icon, type IconName } from './icons';

// ------------------------------------------------------------------ chips
const COLORS = {
  success: '#39c98a', warning: '#f4b84a', error: '#f16f70', info: '#76b7ff', accent: '#00d9a6', muted: '#a4ada7',
} as const;
type Tone = keyof typeof COLORS;

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  const c = COLORS[tone];
  return (
    <span className="chip" style={{ color: c, background: `${c}22` }}>
      {children}
    </span>
  );
}

const attendanceTone: Record<AttendanceStatus, Tone> = { present: 'success', absent: 'error', late: 'warning', leave: 'info' };
export const attendanceColor = (s: AttendanceStatus) => COLORS[attendanceTone[s]];
export const AttendanceChip = ({ status }: { status: AttendanceStatus }) => (
  <Chip tone={attendanceTone[status]}>{status[0].toUpperCase() + status.slice(1)}</Chip>
);

const paymentTone: Record<PaymentStatus, Tone> = { paid: 'success', partial: 'warning', unpaid: 'error' };
export const PaymentChip = ({ status }: { status: PaymentStatus }) => (
  <Chip tone={paymentTone[status]}>{status[0].toUpperCase() + status.slice(1)}</Chip>
);

const examTone: Record<ExamStatus, [Tone, string]> = {
  draft: ['muted', 'Draft'], upcoming: ['info', 'Upcoming'], completed: ['warning', 'Results pending'], published: ['success', 'Published'],
};
export const ExamChip = ({ status }: { status: ExamStatus }) => <Chip tone={examTone[status][0]}>{examTone[status][1]}</Chip>;

const deliveryTone: Record<DeliveryStatus, Tone> = { queued: 'muted', sending: 'info', sent: 'accent', delivered: 'success', failed: 'error' };
export const DeliveryChip = ({ status }: { status: DeliveryStatus }) => (
  <Chip tone={deliveryTone[status]}>{status[0].toUpperCase() + status.slice(1)}</Chip>
);

// ------------------------------------------------------------- primitives
export function Well({ icon, tone = 'accent' }: { icon: IconName; tone?: Tone }) {
  const c = COLORS[tone];
  return (
    <span className="well" style={{ color: c, background: `${c}22` }}>
      <Icon name={icon} />
    </span>
  );
}

export function Metric({ label, value, icon, tone, caption, onClick }: {
  label: string; value: ReactNode; icon: IconName; tone: Tone; caption?: string; onClick?: () => void;
}) {
  return (
    <div className={`card metric${onClick ? ' link' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && onClick()}>
      <Well icon={icon} tone={tone} />
      <div className="value" style={{ marginTop: 8 }}>{value}</div>
      <div>{label}</div>
      {caption && <div className="small muted">{caption}</div>}
    </div>
  );
}

export function Avatar({ name, large, accent }: { name: string; large?: boolean; accent?: boolean }) {
  const palette = ['#2a3b34', '#33302a', '#2b3340', '#3a2c30', '#2e3a2a', '#353046'];
  const bg = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  return (
    <span className={`avatar${large ? ' lg' : ''}${accent ? ' accent' : ''}`} style={accent ? undefined : { background: bg }} aria-hidden="true">
      {toInitials(name)}
    </span>
  );
}

export const Progress = ({ value }: { value: number }) => (
  <div className="progress" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
    <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
  </div>
);

export function Empty({ icon = 'info', title, message, action }: { icon?: IconName; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ring"><Icon name={icon} /></div>
      <div className="h3">{title}</div>
      <p className="muted small" style={{ maxWidth: 380, margin: '6px auto 16px' }}>{message}</p>
      {action}
    </div>
  );
}

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 56, width: `${92 - (i % 3) * 12}%` }} />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const status = (error as { status?: number }).status;
  return (
    <Empty
      icon={status === 403 ? 'lock' : 'alert'}
      title={status === 403 ? 'Not available for your account' : 'Something went wrong'}
      message={error.message}
      action={onRetry && status !== 403 ? <button className="btn small" onClick={onRetry}>Try again</button> : undefined}
    />
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'ok'; children: ReactNode }) {
  return (
    <div className={`notice ${tone}`}>
      <Icon name={tone === 'warn' ? 'alert' : tone === 'ok' ? 'check' : 'info'} style={{ width: 18, height: 18, flex: 'none', color: tone === 'warn' ? COLORS.warning : tone === 'ok' ? COLORS.success : COLORS.info }} />
      <div>{children}</div>
    </div>
  );
}

export function Field({ label, optional, error, children }: { label: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}{optional && <em>Optional</em>}</span>
      {children}
      {error && <span className="error-text">{error}</span>}
    </label>
  );
}

export function Toggles<T extends string | number | boolean>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="toggle-group" role="radiogroup">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value}
          className={`toggle${o.value === value ? ' on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} aria-label={label} onChange={(e) => onChange?.(e.target.checked)} />
      <span />
    </label>
  );
}

export function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="filter-pill">
      <span className="muted">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function PageHead({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="label" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h1 className="h1">{title}</h1>
        {subtitle && <div className="muted small" style={{ marginTop: 4 }}>{subtitle}</div>}
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </div>
  );
}

export const Stat = ({ label, value, color }: { label: string; value: ReactNode; color?: string }) => (
  <div>
    <div className="label" style={{ fontSize: 10.5 }}>{label}</div>
    <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color }}>{value}</div>
  </div>
);

// ----------------------------------------------------- dialogs and toasts
interface ConfirmOptions { title: string; message: string; confirmLabel?: string; danger?: boolean; note?: string }
interface UiApi {
  toast: (message: string, kind?: 'ok' | 'error') => void;
  /** Resolves true/false, or the entered note when `note` (a label) is given; null if cancelled. */
  confirm: (o: ConfirmOptions) => Promise<boolean | string | null>;
}
const UiContext = createContext<UiApi | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string; kind: 'ok' | 'error' }[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const [noteText, setNoteText] = useState('');
  const resolver = useRef<(v: boolean | string | null) => void>(() => {});
  const nextId = useRef(0);

  const toast = useCallback((message: string, kind: 'ok' | 'error' = 'ok') => {
    const id = ++nextId.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => {
    setNoteText('');
    setDialog(o);
    return new Promise<boolean | string | null>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean | string | null) => {
    setDialog(null);
    resolver.current(v);
  };

  return (
    <UiContext.Provider value={{ toast, confirm }}>
      {children}
      {dialog && (
        <div className="backdrop" onClick={() => close(dialog.note ? null : false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="dlg-title" className="h2">{dialog.title}</h2>
            <p className="muted" style={{ whiteSpace: 'pre-line' }}>{dialog.message}</p>
            {dialog.note && (
              <Field label={dialog.note}>
                <input className="input" autoFocus value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              </Field>
            )}
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn ghost" style={{ color: 'var(--text-2)' }} onClick={() => close(dialog.note ? null : false)}>Cancel</button>
              <button
                className={`btn ${dialog.danger ? 'danger' : 'primary'}`}
                autoFocus={!dialog.note}
                disabled={!!dialog.note && noteText.trim().length < 3}
                onClick={() => close(dialog.note ? noteText.trim() : true)}
              >
                {dialog.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : ''}`}>{t.message}</div>)}
      </div>
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi outside UiProvider');
  return ctx;
}
