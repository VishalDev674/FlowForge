'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Zap, Shield, User, Lock, Mail, Eye, EyeOff,
  ArrowRight, CheckCircle2, AlertCircle, Loader2, Sparkles,
  Workflow, Check, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  const { login, register, user, logout } = useAuthStore();

  // Mode: 'admin' | 'user'
  const [roleMode, setRoleMode] = useState<'admin' | 'user'>('admin');
  // Tab: 'login' | 'register'
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@flowforge.dev');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync demo credentials when switching role modes if user hasn't typed custom fields
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
      setName(roleMode === 'admin' ? 'New Admin' : 'New Applicant');
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
      setSuccessMsg(`Welcome, ${loggedUser.name}! Redirecting...`);
      setTimeout(() => {
        if (returnUrl) {
          router.push(returnUrl);
        } else if (loggedUser.role === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/apply');
        }
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password.trim() || password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (authTab === 'login') {
        const loggedUser = await login(email, password);
        setSuccessMsg(`Logged in successfully as ${loggedUser.name}!`);
        setTimeout(() => {
          if (returnUrl) {
            router.push(returnUrl);
          } else if (loggedUser.role === 'admin') {
            router.push('/dashboard');
          } else {
            router.push('/apply');
          }
        }, 700);
      } else {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        const assignedRole = roleMode === 'admin' ? 'admin' : 'applicant';
        const registeredUser = await register(name, email, password, assignedRole);
        setSuccessMsg(`Account created! Logged in as ${registeredUser.name}.`);
        setTimeout(() => {
          if (returnUrl) {
            router.push(returnUrl);
          } else if (registeredUser.role === 'admin') {
            router.push('/dashboard');
          } else {
            router.push('/apply');
          }
        }, 700);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.18), transparent 70%), #0a0b0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Background Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '20%',
        width: 380,
        height: 380,
        borderRadius: '50%',
        background: roleMode === 'admin' ? 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)' : 'radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none',
        transition: 'all 0.5s ease',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '20%',
        width: 340,
        height: 340,
        borderRadius: '50%',
        background: roleMode === 'admin' ? 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)' : 'radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none',
        transition: 'all 0.5s ease',
      }} />

      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 28, zIndex: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px -4px rgba(99,102,241,0.5)',
          }}>
            <Zap size={22} color="#ffffff" />
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.03em' }}>
            Flow<span style={{ color: '#818cf8' }}>Forge</span>
          </span>
          <span style={{
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 6,
            background: 'rgba(99,102,246,0.15)',
            color: '#818cf8',
            border: '1px solid rgba(99,102,246,0.3)',
            fontWeight: 700,
            letterSpacing: '0.04em'
          }}>
            ALGOTHON&apos;26
          </span>
        </div>
        <p style={{ color: '#8b91a8', fontSize: 14, margin: 0, fontWeight: 400 }}>
          Visual Workflow Automation &amp; Orchestration Platform
        </p>
      </div>

      {/* Main Glass Card */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'rgba(15, 17, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid #1f2335',
        borderRadius: 20,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
        zIndex: 10,
        position: 'relative'
      }}>
        {/* Accent Bar based on active role */}
        <div style={{
          height: 3,
          width: '100%',
          background: roleMode === 'admin'
            ? 'linear-gradient(90deg, #6366f1, #a855f7, #6366f1)'
            : 'linear-gradient(90deg, #10b981, #06b6d4, #10b981)',
          transition: 'background 0.3s ease'
        }} />

        <div style={{ padding: '28px 30px' }}>
          {/* Role Mode Selector Toggle */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Select Portal Type
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#090a0f',
              padding: 4,
              borderRadius: 12,
              border: '1px solid #1f2335',
              gap: 4
            }}>
              <button
                type="button"
                onClick={() => handleRoleSwitch('admin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  transition: 'all 0.2s ease',
                  background: roleMode === 'admin' ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: roleMode === 'admin' ? '#a5b4fc' : '#8b91a8',
                  boxShadow: roleMode === 'admin' ? '0 0 0 1px rgba(99,102,241,0.4)' : 'none'
                }}
              >
                <Shield size={15} color={roleMode === 'admin' ? '#818cf8' : 'currentColor'} />
                <span>Admin Portal</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSwitch('user')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  transition: 'all 0.2s ease',
                  background: roleMode === 'user' ? 'rgba(16,185,129,0.18)' : 'transparent',
                  color: roleMode === 'user' ? '#6ee7b7' : '#8b91a8',
                  boxShadow: roleMode === 'user' ? '0 0 0 1px rgba(16,185,129,0.4)' : 'none'
                }}
              >
                <User size={15} color={roleMode === 'user' ? '#10b981' : 'currentColor'} />
                <span>User / Applicant</span>
              </button>
            </div>
          </div>

          {/* Quick Demo Access Bar */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed #262b40',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#9ca3af' }}>
              <Sparkles size={14} color="#f59e0b" />
              <span>Instant Test Access:</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                style={{
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: '#818cf8',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Demo Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('user')}
                style={{
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: '#34d399',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Demo User
              </button>
            </div>
          </div>

          {/* Sign In vs Register Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #1f2335',
            marginBottom: 20,
            gap: 18
          }}>
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: authTab === 'login' ? `2px solid ${roleMode === 'admin' ? '#6366f1' : '#10b981'}` : '2px solid transparent',
                paddingBottom: 10,
                color: authTab === 'login' ? '#f3f4f6' : '#6b7280',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: authTab === 'register' ? `2px solid ${roleMode === 'admin' ? '#6366f1' : '#10b981'}` : '2px solid transparent',
                paddingBottom: 10,
                color: authTab === 'register' ? '#f3f4f6' : '#6b7280',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Create Account
            </button>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#f87171',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#34d399',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit}>
            {authTab === 'register' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ca3af', marginBottom: 6 }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="#6b7280" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder={roleMode === 'admin' ? 'e.g. Alex Administrator' : 'e.g. Jane Doe'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: '#090a0f',
                      border: '1px solid #1f2335',
                      borderRadius: 10,
                      padding: '10px 14px 10px 38px',
                      color: '#f3f4f6',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ca3af', marginBottom: 6 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#6b7280" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  placeholder={roleMode === 'admin' ? 'admin@flowforge.dev' : 'user@flowforge.dev'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#090a0f',
                    border: '1px solid #1f2335',
                    borderRadius: 10,
                    padding: '10px 14px 10px 38px',
                    color: '#f3f4f6',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ca3af', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#6b7280" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#090a0f',
                    border: '1px solid #1f2335',
                    borderRadius: 10,
                    padding: '10px 38px 10px 38px',
                    color: '#f3f4f6',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Role Capabilities summary pill */}
            <div style={{
              background: roleMode === 'admin' ? 'rgba(99,102,241,0.06)' : 'rgba(16,185,129,0.06)',
              border: `1px solid ${roleMode === 'admin' ? 'rgba(99,102,241,0.18)' : 'rgba(16,185,129,0.18)'}`,
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 20,
              fontSize: 12,
              color: '#94a3b8',
              lineHeight: 1.4
            }}>
              <div style={{ fontWeight: 600, color: roleMode === 'admin' ? '#a5b4fc' : '#6ee7b7', marginBottom: 2 }}>
                {roleMode === 'admin' ? '🛡️ Administrator Privileges' : '👤 User / Applicant Scope'}
              </div>
              {roleMode === 'admin'
                ? 'Full access to Visual Canvas, DAG execution engine, workflow triggers, and approval queues.'
                : 'Access to application form submission, real-time status tracker, and notifications.'}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: 'none',
                background: roleMode === 'admin'
                  ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: roleMode === 'admin'
                  ? '0 4px 16px rgba(99,102,241,0.4)'
                  : '0 4px 16px rgba(16,185,129,0.4)',
                opacity: loading ? 0.8 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{authTab === 'login' ? `Sign In as ${roleMode === 'admin' ? 'Admin' : 'User'}` : `Create ${roleMode === 'admin' ? 'Admin' : 'User'} Account`}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Guest / Navigation Footer */}
          <div style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: '1px solid #1f2335',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#6b7280'
          }}>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                color: '#818cf8',
                cursor: 'pointer',
                padding: 0,
                fontSize: 12,
                textDecoration: 'underline'
              }}
            >
              ← Return to Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push('/apply')}
              style={{
                background: 'none',
                border: 'none',
                color: '#10b981',
                cursor: 'pointer',
                padding: 0,
                fontSize: 12,
                textDecoration: 'underline'
              }}
            >
              Public Apply Portal →
            </button>
          </div>
        </div>
      </div>

      {/* Footer copyright / info */}
      <div style={{ marginTop: 24, fontSize: 12, color: '#4b5563', textAlign: 'center', zIndex: 10 }}>
        FlowForge Orchestration Engine • Secure JWT Authentication
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#0a0b0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6366f1'
      }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
