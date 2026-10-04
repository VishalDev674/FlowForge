'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Zap, Shield, User, Lock, Mail, Eye, EyeOff,
  ArrowRight, CheckCircle2, AlertCircle, Loader2, Sparkles,
  Terminal, Cpu, KeyRound, Radio
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  const { login, register } = useAuthStore();

  const [roleMode, setRoleMode] = useState<'admin' | 'user'>('admin');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@flowforge.dev');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRoleSwitch = (mode: 'admin' | 'user') => {
    setRoleMode(mode);
    setError(null);
    setSuccessMsg(null);
    if (authTab === 'login') {
      if (mode === 'admin') {
        setEmail('admin@flowforge.dev');
        setPassword('admin123');
      } else {
        setEmail('user@flowforge.dev');
        setPassword('user123');
      }
    }
  };

  const handleTabSwitch = (tab: 'login' | 'register') => {
    setAuthTab(tab);
    setError(null);
    setSuccessMsg(null);
    if (tab === 'register') {
      setName(roleMode === 'admin' ? 'Alex Administrator' : 'Jane Applicant');
      setEmail('');
      setPassword('');
    } else {
      if (roleMode === 'admin') {
        setEmail('admin@flowforge.dev');
        setPassword('admin123');
      } else {
        setEmail('user@flowforge.dev');
        setPassword('user123');
      }
    }
  };

  const handleQuickDemo = async (role: 'admin' | 'user') => {
    setRoleMode(role);
    setAuthTab('login');
    const demoEmail = role === 'admin' ? 'admin@flowforge.dev' : 'user@flowforge.dev';
    const demoPassword = role === 'admin' ? 'admin123' : 'user123';
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    setLoading(true);

    try {
      const loggedUser = await login(demoEmail, demoPassword);
      setSuccessMsg(`Welcome back, ${loggedUser.name}`);
      setTimeout(() => {
        if (returnUrl) {
          router.push(returnUrl);
        } else if (loggedUser.role === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/dashboard');
        }
      }, 600);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password.trim() || password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      if (authTab === 'login') {
        const loggedUser = await login(email, password);
        setSuccessMsg(`Welcome back, ${loggedUser.name}`);
        setTimeout(() => {
          if (returnUrl) {
            router.push(returnUrl);
          } else {
            router.push('/dashboard');
          }
        }, 600);
      } else {
        if (!name.trim()) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        const assignedRole = roleMode === 'admin' ? 'admin' : 'applicant';
        const registeredUser = await register(name, email, password, assignedRole);
        setSuccessMsg(`Account created for ${registeredUser.name}`);
        setTimeout(() => {
          if (returnUrl) {
            router.push(returnUrl);
          } else {
            router.push('/dashboard');
          }
        }, 600);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050608',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      position: 'relative',
      zIndex: 2,
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 32, zIndex: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(0,255,102,0.12), rgba(0,212,255,0.12))',
            border: '1px solid rgba(0,255,102,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="#00ff66" />
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#f0f4f8', letterSpacing: '-0.02em' }}>
            Flow<span style={{ color: '#00ff66' }}>Forge</span>
          </span>
        </div>
        <div style={{ color: '#4a5a70', fontSize: 13, fontWeight: 500 }}>
          Workflow Orchestration Platform
        </div>
      </div>

      {/* Auth Card */}
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#0B0F15',
        border: '1px solid #151D2B',
        borderRadius: 12,
        overflow: 'hidden',
        zIndex: 10, position: 'relative',
        boxShadow: '0 24px 64px -16px rgba(0,0,0,0.6)',
      }}>
        {/* Accent bar */}
        <div style={{
          height: 2, width: '100%',
          background: 'linear-gradient(90deg, transparent, #00ff66, #00d4ff, transparent)',
        }} />

        <div style={{ padding: '28px' }}>
          {/* Role Switcher */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#4a5a70', marginBottom: 8, letterSpacing: '0.04em' }}>
              SELECT PORTAL
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              background: '#080B10', padding: 3, borderRadius: 8,
              border: '1px solid #151D2B', gap: 3,
            }}>
              {[
                { mode: 'admin' as const, label: 'Admin / Reviewer', icon: Shield },
                { mode: 'user' as const, label: 'Applicant', icon: User },
              ].map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleRoleSwitch(mode)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: 12,
                    transition: 'all 200ms ease',
                    background: roleMode === mode ? 'rgba(0,255,102,0.08)' : 'transparent',
                    color: roleMode === mode ? '#00ff66' : '#7d8da0',
                  }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Demo */}
          <div style={{
            background: '#080B10', border: '1px dashed #1a2435',
            borderRadius: 8, padding: '10px 14px', marginBottom: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7d8da0' }}>
              <KeyRound size={12} color="#00ff66" />
              <span>Quick demo</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => handleQuickDemo('admin')}
                className="cyber-btn cyber-btn-secondary" style={{ padding: '4px 12px', fontSize: 11 }}>
                Admin
              </button>
              <button type="button" onClick={() => handleQuickDemo('user')}
                className="cyber-btn cyber-btn-secondary" style={{ padding: '4px 12px', fontSize: 11 }}>
                User
              </button>
            </div>
          </div>

          {/* Login / Register Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #151D2B', marginBottom: 22 }}>
            {[
              { tab: 'login' as const, label: 'Sign In' },
              { tab: 'register' as const, label: 'Create Account' },
            ].map(({ tab, label }) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabSwitch(tab)}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'none', border: 'none',
                  borderBottom: authTab === tab ? '2px solid #00ff66' : '2px solid transparent',
                  color: authTab === tab ? '#f0f4f8' : '#7d8da0',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  transition: 'all 200ms',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Status Messages */}
          {error && (
            <div style={{
              background: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 18,
              fontSize: 12, color: '#ff3b5c', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(0,255,102,0.06)', border: '1px solid rgba(0,255,102,0.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 18,
              fontSize: 12, color: '#00ff66', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <CheckCircle2 size={14} /> {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {authTab === 'register' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#7d8da0', display: 'block', marginBottom: 6 }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text" value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={roleMode === 'admin' ? 'e.g. Alex Administrator' : 'e.g. Jane Doe'}
                    className="cyber-input"
                    style={{ width: '100%', padding: '10px 12px 10px 36px' }}
                  />
                  <User size={14} color="#4a5a70" style={{ position: 'absolute', left: 12, top: 11 }} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#7d8da0', display: 'block', marginBottom: 6 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@flowforge.dev"
                  className="cyber-input"
                  style={{ width: '100%', padding: '10px 12px 10px 36px' }}
                />
                <Mail size={14} color="#4a5a70" style={{ position: 'absolute', left: 12, top: 11 }} />
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#7d8da0', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="cyber-input"
                  style={{ width: '100%', padding: '10px 38px 10px 36px' }}
                />
                <Lock size={14} color="#4a5a70" style={{ position: 'absolute', left: 12, top: 11 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: '#4a5a70', cursor: 'pointer', padding: 2 }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Role Scope Info */}
            <div style={{
              background: '#080B10', border: '1px solid #151D2B',
              borderRadius: 8, padding: '12px 14px', marginBottom: 22,
              fontSize: 12, color: '#7d8da0', lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 600, color: '#00ff66', marginBottom: 4, fontSize: 11 }}>
                {roleMode === 'admin' ? 'Administrator Access' : 'Applicant Access'}
              </div>
              <div style={{ fontSize: 11, color: '#4a5a70' }}>
                {roleMode === 'admin'
                  ? 'Full access to workflow editor, execution engine, visual canvas, and approval queues.'
                  : 'Access to application submission, real-time status tracker, and notifications.'}
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="cyber-btn cyber-btn-primary"
              style={{ width: '100%', padding: '12px 16px', fontSize: 14 }}
            >
              {loading ? (
                <><Loader2 size={16} className="spin" /> Authenticating...</>
              ) : (
                <>{authTab === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div style={{
            marginTop: 22, paddingTop: 16, borderTop: '1px solid #151D2B',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 12,
          }}>
            <button type="button" onClick={() => router.push('/dashboard')}
              style={{ background: 'none', border: 'none', color: '#7d8da0', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
              ← Back to Dashboard
            </button>
            <button type="button" onClick={() => router.push('/apply')}
              style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
              Apply Now →
            </button>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 24, fontFamily: 'var(--font-mono)',
        fontSize: 10, color: '#2e3d52', textAlign: 'center', zIndex: 10,
      }}>
        FlowForge Orchestration Engine · Secured with JWT
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: '#050608',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00ff66',
      }}>
        <Loader2 size={32} className="spin" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
