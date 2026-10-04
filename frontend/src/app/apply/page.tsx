'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, FileText, CheckCircle, AlertTriangle, Loader2, ChevronLeft,
  User, Mail, Phone, BookOpen, BarChart2, Upload
} from 'lucide-react';
import api from '@/lib/api';

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
  const [form, setForm] = useState<FormData>({
    applicant_name: '', email: '', phone: '', program: '', percentage: '',
    marksheet: false, identity_proof: false, photo: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; id?: string; error?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.applicant_name.trim()) e.applicant_name = 'Name is required';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required';
    if (!form.program.trim()) e.program = 'Program is required';
    if (!form.percentage.trim()) e.percentage = 'Percentage/Score is required';
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
        applicant_name: 'Aarav Kumar', email: 'aarav@example.com',
        phone: '+91 98765 43210', program: 'Computer Science',
        percentage: '84.2', marksheet: true, identity_proof: true, photo: true,
      });
    } else {
      setForm({
        applicant_name: 'Priya Sharma', email: 'priya@example.com',
        phone: '+91 98765 00000', program: 'Engineering',
        percentage: '76.5', marksheet: true, identity_proof: true, photo: false,
      });
    }
    setErrors({});
    setResult(null);
  };

  const Field = ({ id, label, icon: Icon, error, children }: { id: string; label: string; icon: React.ElementType; error?: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 18 }}>
      <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#8b91a8', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <Icon size={11} /> {label}
      </label>
      {children}
      {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</div>}
    </div>
  );

  const inputStyle = (hasError?: boolean) => ({
    width: '100%', background: '#0f1117',
    border: `1px solid ${hasError ? '#ef4444' : '#1f2335'}`,
    borderRadius: 8, padding: '10px 12px',
    color: '#e8eaf0', fontSize: 13, outline: 'none',
  });

  if (result?.success) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0b0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: '#0f1117', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 16, padding: 40, maxWidth: 440, width: '100%', textAlign: 'center',
          animation: 'fadeIn 0.4s ease',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(16,185,129,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 24px rgba(16,185,129,0.2)',
          }}>
            <CheckCircle size={32} color="#10b981" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e8eaf0', marginBottom: 10 }}>
            Application Submitted!
          </h1>
          <p style={{ fontSize: 14, color: '#8b91a8', marginBottom: 6, lineHeight: 1.6 }}>
            Your application has been received and is now being processed by FlowForge.
          </p>
          <div style={{
            background: '#13151d', border: '1px solid #1f2335',
            borderRadius: 8, padding: '12px 16px', marginBottom: 24, textAlign: 'left',
          }}>
            <div style={{ fontSize: 11, color: '#4a5068', marginBottom: 4 }}>Application ID</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#6366f1', fontFamily: 'monospace' }}>
              {result.id}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setResult(null); setForm({ applicant_name: '', email: '', phone: '', program: '', percentage: '', marksheet: false, identity_proof: false, photo: false }); }}
              style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#13151d', border: '1px solid #1f2335', color: '#8b91a8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Submit Another
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0f', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: '#0f1117', borderBottom: '1px solid #1f2335',
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, background: 'transparent', border: '1px solid #1f2335', color: '#8b91a8', fontSize: 12, cursor: 'pointer' }}
        >
          <ChevronLeft size={13} /> Dashboard
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} color="#6366f1" />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf0' }}>Submit Application</span>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px' }}>
        {/* Demo shortcuts */}
        <div style={{
          background: 'rgba(99,102,246,0.06)', border: '1px solid rgba(99,102,246,0.2)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', marginBottom: 2 }}>Demo Presets</div>
            <div style={{ fontSize: 11, color: '#4a5068' }}>Load test data to quickly demo the workflow</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => loadDemo(true)} style={{ padding: '6px 12px', borderRadius: 7, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              ✓ Complete App
            </button>
            <button onClick={() => loadDemo(false)} style={{ padding: '6px 12px', borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              ✕ Incomplete App
            </button>
          </div>
        </div>

        <div style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 16, padding: 28 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0', marginBottom: 6 }}>Application Form</h1>
            <p style={{ fontSize: 13, color: '#8b91a8' }}>Submit your application to be processed by FlowForge automation</p>
          </div>

          {result?.error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 14px', borderRadius: 8, marginBottom: 20,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              fontSize: 12, color: '#ef4444',
            }}>
              <AlertTriangle size={13} /> {result.error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Field id="applicant_name" label="Full Name" icon={User} error={errors.applicant_name}>
              <input
                id="applicant_name"
                value={form.applicant_name}
                onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                placeholder="Aarav Kumar"
                style={inputStyle(!!errors.applicant_name)}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field id="email" label="Email Address" icon={Mail} error={errors.email}>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="aarav@example.com"
                  style={inputStyle(!!errors.email)}
                />
              </Field>
              <Field id="phone" label="Phone Number" icon={Phone}>
                <input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  style={inputStyle()}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field id="program" label="Program / Role" icon={BookOpen} error={errors.program}>
                <input
                  id="program"
                  value={form.program}
                  onChange={(e) => setForm({ ...form, program: e.target.value })}
                  placeholder="Computer Science"
                  style={inputStyle(!!errors.program)}
                />
              </Field>
              <Field id="percentage" label="Score / Percentage" icon={BarChart2} error={errors.percentage}>
                <input
                  id="percentage"
                  value={form.percentage}
                  onChange={(e) => setForm({ ...form, percentage: e.target.value })}
                  placeholder="84.2"
                  style={inputStyle(!!errors.percentage)}
                />
              </Field>
            </div>

            {/* Documents */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#8b91a8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Upload size={11} /> Documents Attached
              </div>
              <div style={{
                background: '#13151d', border: '1px solid #1f2335',
                borderRadius: 8, padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {[
                  { key: 'marksheet', label: 'Marksheet / Transcript' },
                  { key: 'identity_proof', label: 'Identity Proof (Aadhaar / Passport)' },
                  { key: 'photo', label: 'Passport Photo' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form[key as keyof FormData] as boolean}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      style={{ accentColor: '#6366f1', width: 15, height: 15 }}
                    />
                    <span style={{ fontSize: 13, color: form[key as keyof FormData] ? '#e8eaf0' : '#8b91a8' }}>
                      {label}
                      {form[key as keyof FormData] && <span style={{ color: '#10b981', marginLeft: 6, fontSize: 11 }}>✓ Attached</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', padding: '13px', borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.8 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(99,102,246,0.3)',
              }}
            >
              {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={16} />}
              {submitting ? 'Submitting & Running Workflow...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
