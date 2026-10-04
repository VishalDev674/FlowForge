'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, FileText, CheckCircle, AlertTriangle, Loader2, ChevronLeft,
  User, Mail, Phone, BookOpen, BarChart2, Upload,
  LogIn, LogOut, Shield, UserCheck, Terminal, Cpu, CheckCircle2
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface FormData {
  applicant_name: string;
  email: string;
  phone: string;
  program: string;
  percentage: string;
  marksheet: boolean;
  identity_proof: boolean;
  photo: boolean;
}

export default function ApplyPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [form, setForm] = useState<FormData>({
    applicant_name: user?.name || '',
    email: user?.email || '',
    phone: '',
    program: 'Computer Science & AI',
    percentage: '',
    marksheet: true,
    identity_proof: true,
    photo: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; id?: string; error?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.applicant_name.trim()) e.applicant_name = 'Name is required';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email is required';
    if (!form.program.trim()) e.program = 'Program is required';
    if (!form.percentage.trim()) e.percentage = 'Percentage is required';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const payload = {
        applicant_name: form.applicant_name,
        email: form.email,
        phone: form.phone,
        program: form.program,
        percentage: form.percentage,
        documents_json: {
          marksheet: form.marksheet,
          identity_proof: form.identity_proof,
          photo: form.photo,
        },
      };
      const res = await api.applications.submit(payload);
      setResult({ success: true, id: res.id });
    } catch (err: unknown) {
      setResult({ success: false, error: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const loadDemo = (complete: boolean) => {
    if (complete) {
      setForm({
        applicant_name: 'Alex Chen', email: 'alex.chen@flowforge.dev',
        phone: '+1 555-0192', program: 'Computer Science & AI',
        percentage: '88.5', marksheet: true, identity_proof: true, photo: true,
      });
    } else {
      setForm({
        applicant_name: 'Elena Rostova', email: 'elena.rostova@flowforge.dev',
        phone: '+1 555-0144', program: 'Autonomous Robotics',
        percentage: '73.2', marksheet: true, identity_proof: true, photo: false,
      });
    }
    setErrors({});
    setResult(null);
  };

  const Field = ({ id, label, icon: Icon, error, children }: { id: string; label: string; icon: React.ElementType; error?: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 18 }}>
      <label htmlFor={id} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 12, fontWeight: 600, color: '#7d8da0', marginBottom: 6,
      }}>
        <Icon size={12} color="#00ff66" /> {label}
      </label>
      {children}
      {error && <div style={{ fontSize: 11, color: '#ff3b5c', marginTop: 4 }}>{error}</div>}
    </div>
  );

  if (result?.success) {
    return (
      <div style={{ minHeight: '100vh', background: '#050608', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2, padding: 20 }}>
        <div className="fade-in" style={{
          background: '#0B0F15', border: '1px solid #151D2B', borderRadius: 12,
          padding: 40, maxWidth: 460, width: '100%', textAlign: 'center',
          boxShadow: '0 24px 64px -16px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: 'rgba(0,255,102,0.08)', border: '1px solid rgba(0,255,102,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CheckCircle size={28} color="#00ff66" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8', marginBottom: 8 }}>
            Application Submitted
          </h1>
          <p style={{ fontSize: 13, color: '#7d8da0', marginBottom: 24, lineHeight: 1.6 }}>
            Your application has been received and the automated review pipeline has been initiated.
          </p>
          <div style={{
            background: '#080B10', border: '1px solid #151D2B',
            borderRadius: 8, padding: '14px 18px', marginBottom: 28, textAlign: 'left',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4a5a70', marginBottom: 4 }}>
              Application ID
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#00ff66' }}>
              {result.id}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setResult(null); setForm({ applicant_name: '', email: '', phone: '', program: 'Computer Science & AI', percentage: '', marksheet: true, identity_proof: true, photo: true }); }}
              className="cyber-btn cyber-btn-secondary" style={{ flex: 1 }}
            >
              Submit Another
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="cyber-btn cyber-btn-primary" style={{ flex: 1.2 }}
            >
              Go to Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050608', position: 'relative', zIndex: 2 }}>
      {/* Header */}
      <div style={{
        background: 'rgba(8,11,16,0.88)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #151D2B',
        padding: '0 28px', display: 'flex', alignItems: 'center', gap: 16,
        height: 56, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button onClick={() => router.push('/dashboard')}
          className="cyber-btn cyber-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
          <ChevronLeft size={14} /> Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={14} color="#00ff66" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8' }}>
            Application Form
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 6,
                background: '#0B0F15', border: '1px solid #1a2435',
              }}>
                <UserCheck size={12} color="#7d8da0" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#d1dae6' }}>{user.name}</span>
                <span className="cyber-badge cyber-badge-muted" style={{ fontSize: 9, padding: '1px 5px' }}>{user.role}</span>
              </div>
              <button onClick={() => { logout(); router.push('/login'); }}
                title="Sign out" className="cyber-btn cyber-btn-ghost" style={{ padding: '6px 8px' }}>
                <LogOut size={13} color="#7d8da0" />
              </button>
            </div>
          ) : (
            <button onClick={() => router.push('/login?returnUrl=/apply')}
              className="cyber-btn cyber-btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>
              <LogIn size={13} /> Sign in
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px' }}>
        {/* Test Presets */}
        <div style={{
          background: '#0B0F15', border: '1px solid #151D2B',
          borderRadius: 10, padding: '14px 18px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f4f8', marginBottom: 2 }}>
              Test Presets
            </div>
            <div style={{ fontSize: 11, color: '#7d8da0' }}>Pre-fill with sample data for testing</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => loadDemo(true)}
              className="cyber-btn cyber-btn-secondary" style={{ fontSize: 11, padding: '5px 12px' }}>
              ✓ Complete
            </button>
            <button onClick={() => loadDemo(false)}
              className="cyber-btn cyber-btn-secondary" style={{ fontSize: 11, padding: '5px 12px' }}>
              ✕ Incomplete
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div style={{
          background: '#0B0F15', border: '1px solid #151D2B',
          borderRadius: 12, padding: 28,
        }}>
          <div style={{ marginBottom: 24, borderBottom: '1px solid #151D2B', paddingBottom: 16 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f4f8', marginBottom: 4 }}>
              Submit Application
            </h1>
            <p style={{ fontSize: 12, color: '#7d8da0' }}>
              Fill in your details to trigger the automated review pipeline
            </p>
          </div>

          {result?.error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 8, marginBottom: 20,
              background: 'rgba(255,59,92,0.06)', border: '1px solid rgba(255,59,92,0.2)',
              fontSize: 12, color: '#ff3b5c',
            }}>
              <AlertTriangle size={14} /> {result.error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Field id="applicant_name" label="Full Name" icon={User} error={errors.applicant_name}>
              <input id="applicant_name" value={form.applicant_name}
                onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                placeholder="e.g. Alex Chen" className="cyber-input"
                style={{ width: '100%', padding: '10px 12px' }} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field id="email" label="Email Address" icon={Mail} error={errors.email}>
                <input id="email" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="alex@flowforge.dev" className="cyber-input"
                  style={{ width: '100%', padding: '10px 12px' }} />
              </Field>
              <Field id="phone" label="Phone (optional)" icon={Phone}>
                <input id="phone" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 555-0192" className="cyber-input"
                  style={{ width: '100%', padding: '10px 12px' }} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field id="program" label="Program" icon={BookOpen} error={errors.program}>
                <input id="program" value={form.program}
                  onChange={(e) => setForm({ ...form, program: e.target.value })}
                  placeholder="Computer Science & AI" className="cyber-input"
                  style={{ width: '100%', padding: '10px 12px' }} />
              </Field>
              <Field id="percentage" label="Score (%)" icon={BarChart2} error={errors.percentage}>
                <input id="percentage" value={form.percentage}
                  onChange={(e) => setForm({ ...form, percentage: e.target.value })}
                  placeholder="88.5" className="cyber-input"
                  style={{ width: '100%', padding: '10px 12px' }} />
              </Field>
            </div>

            {/* Documents */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600, color: '#7d8da0', marginBottom: 10,
              }}>
                <Upload size={12} color="#00ff66" /> Required Documents
              </div>
              <div style={{
                background: '#080B10', border: '1px solid #151D2B',
                borderRadius: 8, padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {[
                  { key: 'marksheet', label: 'Academic Transcript' },
                  { key: 'identity_proof', label: 'Government ID (Aadhaar / Passport)' },
                  { key: 'photo', label: 'Passport Photograph' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form[key as keyof FormData] as boolean}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      style={{ accentColor: '#00ff66', width: 16, height: 16 }}
                    />
                    <span style={{ fontSize: 13, color: form[key as keyof FormData] ? '#d1dae6' : '#4a5a70' }}>
                      {label}
                      {form[key as keyof FormData] && (
                        <span style={{ color: '#00ff66', marginLeft: 8, fontSize: 10, fontFamily: 'var(--font-mono)' }}>✓ ATTACHED</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="cyber-btn cyber-btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: 14 }}>
              {submitting ? (
                <><Loader2 size={16} className="spin" /> Submitting...</>
              ) : (
                <><FileText size={15} /> Submit Application</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
