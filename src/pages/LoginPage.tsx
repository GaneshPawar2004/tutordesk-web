import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { ApiError } from '../api/client';
import { Icon } from '../components/icons';
import { Field, Toggles, useUi } from '../components/ui';
import { useAuth } from '../lib/auth';

type Mode = 'login' | 'register' | 'invite';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^[6-9]\d{9}$/;

export function LoginPage() {
  const { me, login, register, acceptInvite } = useAuth();
  const { toast } = useUi();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState({ identifier: '', password: '', confirm: '', tuitionName: '', city: '', adminName: '', phone: '', email: '', code: '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  if (me) return <Navigate to="/" replace />;

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === 'login') {
      if (!f.identifier.trim()) e.identifier = 'Enter your mobile number or email';
      if (!f.password) e.password = 'Enter your password';
    } else {
      if (mode === 'register') {
        if (!f.tuitionName.trim()) e.tuitionName = 'Enter the tuition name';
        if (!f.adminName.trim()) e.adminName = 'Enter your name';
        if (f.email && !EMAIL.test(f.email.trim())) e.email = 'Enter a valid email';
      } else if (!f.code.trim()) {
        e.code = 'Enter the invite code';
      }
      if (!PHONE.test(f.phone)) e.phone = 'Enter a 10-digit mobile number';
      if (f.password.length < 8) e.password = 'Use at least 8 characters';
      if (f.confirm !== f.password) e.confirm = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy || !validate()) return;
    setBusy(true);
    try {
      if (mode === 'login') await login(f.identifier.trim(), f.password);
      else if (mode === 'register') {
        await register({ tuitionName: f.tuitionName.trim(), city: f.city.trim(), adminName: f.adminName.trim(), phone: f.phone, email: f.email.trim(), password: f.password });
      } else await acceptInvite(f.phone, f.code.trim(), f.password);
      navigate('/');
    } catch (e) {
      const field = ((e as ApiError).details as { field?: string } | undefined)?.field;
      if (field) setErrors({ [field]: (e as Error).message });
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const input = (k: keyof typeof f, props: Record<string, unknown> = {}) => (
    <input className={`input${errors[k] ? ' invalid' : ''}`} value={f[k]} onChange={set(k)} {...props} />
  );
  const phoneInput = (
    <div className="input-prefix">
      <b>+91</b>
      <input className={`input${errors.phone ? ' invalid' : ''}`} style={{ paddingLeft: 52 }} inputMode="numeric" maxLength={10}
        value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} />
    </div>
  );
  const passwordFields = (
    <>
      <Field label="Choose a password" error={errors.password}>{input('password', { type: 'password', autoComplete: 'new-password', placeholder: 'At least 8 characters' })}</Field>
      <Field label="Confirm password" error={errors.confirm}>{input('confirm', { type: 'password', autoComplete: 'new-password' })}</Field>
    </>
  );

  return (
    <div className="login">
      <svg className="login-lines" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${520 + i * 60} -10 C ${420 + i * 50} 200, ${700 + i * 30} 380, ${560 + i * 40} 620`} fill="none" stroke="#00d9a6" strokeOpacity={0.25 - i * 0.04} strokeWidth="1.3" />
        ))}
      </svg>
      <div className="stack" style={{ gap: 24, position: 'relative' }}>
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">T</span>
          <span>Tutor<span className="accent-text">Desk</span></span>
        </div>
        <h1 className="display">
          Everything your tuition needs, <span className="accent-text">in one place.</span>
        </h1>
        <p className="muted" style={{ fontSize: 17, maxWidth: 520, margin: 0 }}>
          Students, attendance, fees, exams and parent messages — built for tuition owners and teachers.
        </p>
        <div className="feature-tiles">
          <div className="feature-tile" style={{ background: 'var(--cream)', color: 'var(--on-cream)' }}>
            <span className="well" style={{ background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: '50%' }}><Icon name="check" /></span>
            <div><div className="h2">Attendance in a minute</div><div className="small" style={{ opacity: 0.75 }}>Mark a class, lock it, notify parents.</div></div>
          </div>
          <div className="feature-tile" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
            <span className="well" style={{ background: 'var(--on-accent)', color: 'var(--accent)', borderRadius: '50%' }}><Icon name="chart" /></span>
            <div><div className="h2">Results to parents</div><div className="small" style={{ opacity: 0.75 }}>Marks become ready-to-send messages.</div></div>
          </div>
        </div>
      </div>

      <form className="card stack" style={{ position: 'relative', padding: 28 }} onSubmit={submit} noValidate>
        <div>
          <h2 className="h2">{mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Register your tuition' : 'Join your tuition'}</h2>
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            {mode === 'login'
              ? 'Log in with your mobile number or email.'
              : mode === 'register'
                ? 'Create your tuition account. You will be its admin.'
                : 'Enter the invite code your admin shared and choose a password.'}
          </p>
        </div>
        <Toggles<Mode>
          options={[{ value: 'login', label: 'Log in' }, { value: 'register', label: 'Register tuition' }, { value: 'invite', label: 'I have an invite code' }]}
          value={mode}
          onChange={(m) => { setMode(m); setErrors({}); }}
        />
        {mode === 'login' && (
          <>
            <Field label="Mobile number or email" error={errors.identifier}>{input('identifier', { autoComplete: 'username', placeholder: '98765 43210' })}</Field>
            <Field label="Password" error={errors.password}>{input('password', { type: 'password', autoComplete: 'current-password' })}</Field>
          </>
        )}
        {mode === 'register' && (
          <>
            <Field label="Tuition name" error={errors.tuitionName}>{input('tuitionName', { placeholder: 'e.g. Bright Future Classes' })}</Field>
            <Field label="City" optional>{input('city', { placeholder: 'e.g. Nashik' })}</Field>
            <Field label="Your name" error={errors.adminName}>{input('adminName')}</Field>
            <Field label="Your mobile number" error={errors.phone}>{phoneInput}</Field>
            <Field label="Email" optional error={errors.email}>{input('email', { type: 'email', autoComplete: 'email' })}</Field>
            {passwordFields}
          </>
        )}
        {mode === 'invite' && (
          <>
            <Field label="Your mobile number" error={errors.phone}>{phoneInput}</Field>
            <Field label="Invite code" error={errors.code}>{input('code', { placeholder: 'e.g. K7P2QM', style: { textTransform: 'uppercase' } })}</Field>
            {passwordFields}
          </>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'register' ? 'Create tuition account' : 'Set password & join'}
        </button>
      </form>
    </div>
  );
}
