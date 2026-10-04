'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Plus, Play, Upload, Clock, CheckCircle, AlertTriangle,
  Trash2, FileText, ChevronRight, Users, BarChart3, Bell,
  Loader2, GitBranch, Layers, ExternalLink, Activity,
  LogIn, LogOut, Shield, User as UserIcon, Mail, Phone,
  CheckCircle2, XCircle, RefreshCw, Send, Sparkles, BookOpen
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useRequireRole } from '@/lib/auth-guard';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Run {
  id: string;
  workflow_id: string;
  status: string;
  trigger_type: string;
  created_at: string;
  finished_at?: string;
  summary?: string;
}

interface Application {
  id: string;
  applicant_name: string;
  email: string;
  phone?: string;
  program?: string;
  percentage?: string;
  status: string;
  assigned_reviewer_id?: string;
  eligibility_score?: string;
  category?: string;
  created_at: string;
  documents_json?: Record<string, boolean>;
}

interface NotificationItem {
  id: string;
  recipient: string;
  channel: string;
  subject?: string;
  message?: string;
  status: string;
  created_at: string;
  application_id?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  draft: { color: '#8b91a8', bg: 'rgba(139,145,168,0.1)', icon: FileText },
  published: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
  paused: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock },
  archived: { color: '#4a5068', bg: 'rgba(74,80,104,0.1)', icon: Trash2 },
  completed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
  failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: AlertTriangle },
  running: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Loader2 },
  queued: { color: '#8b91a8', bg: 'rgba(139,145,168,0.1)', icon: Clock },
  partially_failed: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: AlertTriangle },
};

const APP_STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  received: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', label: 'Received' },
  validating: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Validating Documents' },
  needs_correction: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Needs Correction' },
  under_review: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', label: 'Under Review' },
  accepted: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Accepted' },
  rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Rejected' },
};

export default function DashboardPage() {
  const { allowed } = useRequireRole();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [templates, setTemplates] = useState<{ key: string; name: string; description: string; category: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  // Admin New Workflow modal state
  const [creating, setCreating] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // User Dashboard State
  const [userTab, setUserTab] = useState<'tracker' | 'apply' | 'notifications'>('tracker');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // User Quick Submission Form State
  const [applicantForm, setApplicantForm] = useState({
    applicant_name: user?.name || '',
    email: user?.email || '',
    phone: '',
    program: 'Computer Science',
    percentage: '',
    marksheet: true,
    identity_proof: true,
    photo: true,
  });
  const [submittingApp, setSubmittingApp] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessId, setSubmitSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (allowed) loadAll();
  }, [allowed]);

  useEffect(() => {
    if (user?.name && !applicantForm.applicant_name) {
      setApplicantForm(prev => ({
        ...prev,
        applicant_name: user.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const loadAll = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [wfs, rs, apps, tmpl, notifs] = await Promise.all([
        api.workflows.list().catch(() => []),
        api.runs.list().catch(() => []),
        api.applications.list().catch(() => []),
        api.workflows.templates().catch(() => []),
        api.notifications.list().catch(() => []),
      ]);
      setWorkflows(wfs || []);
      setRuns(rs || []);
      setApplications(apps || []);
      setTemplates(tmpl || []);
      setNotifications(notifs || []);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const wf = await api.workflows.create({ name: newName, description: newDesc });
      setShowNewModal(false);
      router.push(`/editor/${wf.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleFromTemplate = async (key: string) => {
    try {
      const wf = await api.workflows.fromTemplate(key);
      router.push(`/editor/${wf.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this workflow?')) return;
    await api.workflows.delete(id);
    setWorkflows((ws) => ws.filter((w) => w.id !== id));
  };

  // User Application Submission
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccessId(null);

    if (!applicantForm.applicant_name.trim()) {
      setSubmitError('Applicant name is required');
      return;
    }
    if (!applicantForm.email.trim() || !applicantForm.email.includes('@')) {
      setSubmitError('Valid email address is required');
      return;
    }
    if (!applicantForm.percentage.trim()) {
      setSubmitError('Percentage / Score is required');
      return;
    }

    setSubmittingApp(true);
    try {
      const res = await api.applications.submit({
        applicant_name: applicantForm.applicant_name,
        email: applicantForm.email,
        phone: applicantForm.phone,
        program: applicantForm.program,
        percentage: applicantForm.percentage,
        documents_json: {
          marksheet: applicantForm.marksheet,
          identity_proof: applicantForm.identity_proof,
          photo: applicantForm.photo,
        },
      });

      setSubmitSuccessId(res.id);
      setSelectedAppId(res.id);
      await loadAll(true);
      // Auto-switch to tracker after 1.2s to watch live status
      setTimeout(() => {
        setUserTab('tracker');
      }, 1200);
    } catch (err: unknown) {
      setSubmitError((err as Error).message || 'Failed to submit application');
    } finally {
      setSubmittingApp(false);
    }
  };

  const loadPreset = (complete: boolean) => {
    if (complete) {
      setApplicantForm({
        applicant_name: user?.name || 'Aarav Kumar',
        email: user?.email || 'user@flowforge.dev',
        phone: '+91 98765 43210',
        program: 'Computer Science',
        percentage: '88.5',
        marksheet: true,
        identity_proof: true,
        photo: true,
      });
    } else {
      setApplicantForm({
        applicant_name: user?.name || 'Priya Sharma',
        email: user?.email || 'user@flowforge.dev',
        phone: '+91 98765 00000',
        program: 'Electrical Engineering',
        percentage: '74.0',
        marksheet: true,
        identity_proof: true,
        photo: false,
      });
    }
    setSubmitError(null);
    setSubmitSuccessId(null);
  };

  if (!allowed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0b0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const isAdminOrReviewer = user?.role === 'admin' || user?.role === 'reviewer';

  // Stats for Admin
  const adminStats = {
    total: workflows.length,
    published: workflows.filter((w) => w.status === 'published').length,
    runs: runs.length,
    success: runs.filter((r) => r.status === 'completed').length,
    apps: applications.length,
  };

  // Filter applications for current user (or show all if email matches none)
  const userApps = applications.filter(
    (a) => user?.email && a.email.toLowerCase() === user.email.toLowerCase()
  );
  const displayApplications = userApps.length > 0 ? userApps : applications;

  // Active application for tracker
  const activeApp = selectedAppId
    ? displayApplications.find((a) => a.id === selectedAppId) || displayApplications[0]
    : displayApplications[0];

  // Filter notifications for user or active application
  const userNotifs = notifications.filter(
    (n) =>
      (user?.email && n.recipient?.toLowerCase() === user.email.toLowerCase()) ||
      displayApplications.some((a) => a.id === n.application_id)
  );
  const displayNotifs = userNotifs.length > 0 ? userNotifs : notifications;

  // Pipeline step helper
  const getStepNumber = (status: string) => {
    switch (status) {
      case 'received': return 1;
      case 'validating': return 2;
      case 'under_review': return 3;
      case 'accepted':
      case 'rejected':
      case 'needs_correction': return 4;
      default: return 1;
    }
  };

  // =========================================================================
  // USER / APPLICANT DASHBOARD VIEW
  // =========================================================================
  if (!isAdminOrReviewer) {
    const currentStep = activeApp ? getStepNumber(activeApp.status) : 1;
    const activeAppStatusConfig = activeApp
      ? APP_STATUS_CONFIG[activeApp.status] || { color: '#8b91a8', bg: 'rgba(139,145,168,0.1)', label: activeApp.status }
      : null;

    return (
      <div style={{ minHeight: '100vh', background: '#0a0b0f', fontFamily: 'Inter, sans-serif' }}>
        {/* User Portal Header */}
        <header style={{
          background: '#0f1117',
          borderBottom: '1px solid #1f2335',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 60, position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={16} color="#fff" />
            </div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#e8eaf0', letterSpacing: '-0.02em' }}>
                Flow<span style={{ color: '#10b981' }}>Forge</span>
              </span>
              <span style={{
                marginLeft: 8, fontSize: 10, padding: '2px 7px', borderRadius: 4,
                background: 'rgba(16,185,129,0.15)', color: '#34d399',
                border: '1px solid rgba(16,185,129,0.3)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.04em'
              }}>
                User Portal
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => loadAll(true)}
              disabled={refreshing}
              title="Refresh live status"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 8, background: '#13151d', border: '1px solid #1f2335',
                color: '#8b91a8', fontSize: 12, cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} className={refreshing ? 'spin' : ''} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Updating...' : 'Live Refresh'}
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
              color: backendOnline ? '#10b981' : '#ef4444',
              padding: '4px 10px', borderRadius: 999,
              background: backendOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${backendOnline ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
              {backendOnline ? 'Engine Online' : 'Engine Offline'}
            </div>

            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid #1f2335' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 8,
                  background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                }}>
                  <UserIcon size={12} color="#10b981" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#a7f3d0' }}>
                    {user.name}
                  </span>
                  <span style={{
                    fontSize: 9, textTransform: 'uppercase', fontWeight: 700,
                    padding: '1px 5px', borderRadius: 4,
                    background: '#10b981', color: '#fff'
                  }}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => { logout(); router.push('/login'); }}
                  title="Sign Out"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 6,
                    background: 'transparent', border: '1px solid #1f2335',
                    color: '#8b91a8', cursor: 'pointer'
                  }}
                >
                  <LogOut size={13} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* User Scope Navigation Tabs */}
        <div style={{
          background: '#0d0f15', borderBottom: '1px solid #1a1e2d',
          padding: '0 24px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <button
            onClick={() => setUserTab('tracker')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '14px 18px', fontSize: 13, fontWeight: 600,
              background: 'transparent', border: 'none',
              color: userTab === 'tracker' ? '#10b981' : '#8b91a8',
              borderBottom: userTab === 'tracker' ? '2px solid #10b981' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <Activity size={14} color={userTab === 'tracker' ? '#10b981' : 'currentColor'} />
            Real-Time Status Tracker
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 999,
              background: userTab === 'tracker' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
              color: userTab === 'tracker' ? '#34d399' : '#8b91a8',
            }}>
              {displayApplications.length}
            </span>
          </button>

          <button
            onClick={() => setUserTab('apply')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '14px 18px', fontSize: 13, fontWeight: 600,
              background: 'transparent', border: 'none',
              color: userTab === 'apply' ? '#10b981' : '#8b91a8',
              borderBottom: userTab === 'apply' ? '2px solid #10b981' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <FileText size={14} color={userTab === 'apply' ? '#10b981' : 'currentColor'} />
            Submit Application
          </button>

          <button
            onClick={() => setUserTab('notifications')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '14px 18px', fontSize: 13, fontWeight: 600,
              background: 'transparent', border: 'none',
              color: userTab === 'notifications' ? '#10b981' : '#8b91a8',
              borderBottom: userTab === 'notifications' ? '2px solid #10b981' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <Bell size={14} color={userTab === 'notifications' ? '#10b981' : 'currentColor'} />
            Notifications
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 999,
              background: userTab === 'notifications' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
              color: userTab === 'notifications' ? '#34d399' : '#8b91a8',
            }}>
              {displayNotifs.length}
            </span>
          </button>
        </div>

        {/* User Content Area */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <div style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: '#8b91a8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Applications Submitted
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#e8eaf0' }}>
                {loading ? '—' : displayApplications.length}
              </div>
            </div>

            <div style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: '#8b91a8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Latest Stage
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: activeAppStatusConfig ? activeAppStatusConfig.color : '#8b91a8', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {activeAppStatusConfig ? (
                  <>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeAppStatusConfig.color }} />
                    {activeAppStatusConfig.label}
                  </>
                ) : 'No Submissions'}
              </div>
            </div>

            <div style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: '#8b91a8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Eligibility Score
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: activeApp?.percentage ? '#10b981' : '#8b91a8' }}>
                {activeApp?.eligibility_score || (activeApp?.percentage ? `${activeApp.percentage}%` : 'N/A')}
              </div>
            </div>

            <div style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: '#8b91a8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Alerts & Updates
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>
                {loading ? '—' : displayNotifs.length}
              </div>
            </div>
          </div>

          {/* TAB 1: REAL-TIME STATUS TRACKER */}
          {userTab === 'tracker' && (
            <div>
              {displayApplications.length === 0 ? (
                <div style={{
                  background: '#0f1117', border: '1px dashed #1f2335', borderRadius: 16,
                  padding: '60px 24px', textAlign: 'center',
                }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: '50%', background: 'rgba(16,185,129,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                  }}>
                    <FileText size={24} color="#10b981" />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaf0', marginBottom: 8 }}>
                    No Active Applications to Track
                  </h3>
                  <p style={{ fontSize: 13, color: '#8b91a8', maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.5 }}>
                    You haven&apos;t submitted any applications yet. Submit your application to watch it process live across all automated review stages.
                  </p>
                  <button
                    onClick={() => setUserTab('apply')}
                    style={{
                      padding: '10px 20px', borderRadius: 8,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    + Submit Application Now
                  </button>
                </div>
              ) : (
                <div>
                  {/* Multiple Applications Selector (if > 1) */}
                  {displayApplications.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 6 }}>
                      {displayApplications.map((app) => {
                        const isSelected = (activeApp?.id === app.id);
                        const sc = APP_STATUS_CONFIG[app.status] || { color: '#8b91a8', label: app.status };
                        return (
                          <button
                            key={app.id}
                            onClick={() => setSelectedAppId(app.id)}
                            style={{
                              padding: '8px 14px', borderRadius: 8,
                              background: isSelected ? '#13151d' : '#0f1117',
                              border: `1px solid ${isSelected ? '#10b981' : '#1f2335'}`,
                              color: isSelected ? '#e8eaf0' : '#8b91a8',
                              fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>{app.id}</span>
                            <span style={{ fontSize: 10, color: sc.color, fontWeight: 600 }}>• {sc.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeApp && (
                    <div style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                      {/* Active App Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#e8eaf0' }}>{activeApp.applicant_name}</span>
                            <span style={{
                              fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                              padding: '2px 8px', borderRadius: 6, background: '#13151d',
                              border: '1px solid #1f2335', color: '#10b981'
                            }}>
                              {activeApp.id}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#8b91a8', display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span>Program: <strong style={{ color: '#c7d2fe' }}>{activeApp.program || 'N/A'}</strong></span>
                            <span>Email: <strong style={{ color: '#c7d2fe' }}>{activeApp.email}</strong></span>
                            <span>Submitted: {new Date(activeApp.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {activeAppStatusConfig && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 14px', borderRadius: 999,
                            background: activeAppStatusConfig.bg,
                            border: `1px solid ${activeAppStatusConfig.color}40`,
                            color: activeAppStatusConfig.color, fontSize: 12, fontWeight: 700,
                          }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
                            Stage: {activeAppStatusConfig.label}
                          </div>
                        )}
                      </div>

                      {/* 4-STAGE PIPELINE PROGRESS STEPPER */}
                      <div style={{
                        background: '#13151d', border: '1px solid #1f2335', borderRadius: 14,
                        padding: '24px 20px', marginBottom: 24,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#8b91a8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>
                          Automated Review Pipeline Execution
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, position: 'relative' }}>
                          {[
                            { num: 1, title: 'Received', desc: 'Application Queued' },
                            { num: 2, title: 'Validating', desc: 'Document Verification' },
                            { num: 3, title: 'Under Review', desc: 'Supervisor Gate' },
                            {
                              num: 4,
                              title: activeApp.status === 'accepted' ? 'Accepted' : (activeApp.status === 'rejected' ? 'Rejected' : 'Final Decision'),
                              desc: activeApp.status === 'accepted' ? 'Application Approved' : 'Decision Status'
                            },
                          ].map((step, idx) => {
                            const isDone = currentStep > step.num;
                            const isCurrent = currentStep === step.num;
                            const isPending = currentStep < step.num;

                            const stepColor = isDone
                              ? '#10b981'
                              : isCurrent
                              ? (activeApp.status === 'rejected' ? '#ef4444' : '#10b981')
                              : '#4a5068';

                            return (
                              <div key={step.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                                <div style={{
                                  width: 36, height: 36, borderRadius: '50%',
                                  background: isDone
                                    ? '#10b981'
                                    : isCurrent
                                    ? 'rgba(16,185,129,0.2)'
                                    : '#0f1117',
                                  border: `2px solid ${stepColor}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: isDone ? '#fff' : stepColor,
                                  fontWeight: 800, fontSize: 13, marginBottom: 8,
                                  boxShadow: isCurrent ? '0 0 16px rgba(16,185,129,0.3)' : 'none',
                                }}>
                                  {isDone ? <CheckCircle size={18} /> : (isCurrent ? <Loader2 size={16} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} /> : step.num)}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: isPending ? '#4a5068' : '#e8eaf0', marginBottom: 2 }}>
                                  {step.title}
                                </div>
                                <div style={{ fontSize: 10, color: isPending ? '#34384d' : '#8b91a8' }}>
                                  {step.desc}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Detail Cards: Document Checklist & Scoring */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                        {/* Documents Checklist */}
                        <div style={{ background: '#13151d', border: '1px solid #1f2335', borderRadius: 12, padding: 18 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#8b91a8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={14} color="#10b981" />
                            Document Verification Checklist
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                              { key: 'marksheet', label: 'Academic Marksheet / Transcript' },
                              { key: 'identity_proof', label: 'Government Identity Proof' },
                              { key: 'photo', label: 'Applicant Passport Photograph' },
                            ].map((doc) => {
                              const isAttached = Boolean(activeApp.documents_json?.[doc.key]);
                              return (
                                <div key={doc.key} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '8px 12px', borderRadius: 8, background: '#0f1117',
                                  border: '1px solid #1a1e2d',
                                }}>
                                  <span style={{ fontSize: 12, color: '#e8eaf0' }}>{doc.label}</span>
                                  {isAttached ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 11, fontWeight: 600 }}>
                                      <CheckCircle2 size={13} /> Verified
                                    </span>
                                  ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontSize: 11, fontWeight: 600 }}>
                                      <XCircle size={13} /> Missing
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Eligibility Score & Category */}
                        <div style={{ background: '#13151d', border: '1px solid #1f2335', borderRadius: 12, padding: 18 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#8b91a8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BarChart3 size={14} color="#10b981" />
                            Eligibility & Review Evaluation
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1e2d', paddingBottom: 8 }}>
                              <span style={{ fontSize: 12, color: '#8b91a8' }}>Reported Percentage:</span>
                              <strong style={{ fontSize: 13, color: '#e8eaf0' }}>{activeApp.percentage ? `${activeApp.percentage}%` : 'N/A'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1e2d', paddingBottom: 8 }}>
                              <span style={{ fontSize: 12, color: '#8b91a8' }}>Eligibility Score:</span>
                              <strong style={{ fontSize: 13, color: '#10b981' }}>{activeApp.eligibility_score || 'Calculating...'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1e2d', paddingBottom: 8 }}>
                              <span style={{ fontSize: 12, color: '#8b91a8' }}>Program Category:</span>
                              <strong style={{ fontSize: 13, color: '#c7d2fe' }}>{activeApp.category || 'General / Merit'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 12, color: '#8b91a8' }}>Assigned Reviewer:</span>
                              <span style={{ fontSize: 12, color: activeApp.assigned_reviewer_id ? '#a7f3d0' : '#4a5068' }}>
                                {activeApp.assigned_reviewer_id ? `Assigned (${activeApp.assigned_reviewer_id})` : 'Pending Allocation'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Associated Live Notifications for Active App */}
                      {displayNotifs.filter((n) => n.application_id === activeApp.id).length > 0 && (
                        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #1f2335' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#8b91a8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Bell size={13} color="#f59e0b" />
                            Recent Dispatch for this Application
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {displayNotifs
                              .filter((n) => n.application_id === activeApp.id)
                              .map((n) => (
                                <div key={n.id} style={{
                                  background: '#13151d', border: '1px solid #1f2335',
                                  borderRadius: 8, padding: '10px 14px', fontSize: 12,
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                  <div>
                                    <span style={{ fontWeight: 600, color: '#e8eaf0' }}>{n.subject || 'System Notification'}</span>
                                    <span style={{ color: '#4a5068', marginLeft: 8 }}>{new Date(n.created_at).toLocaleTimeString()}</span>
                                  </div>
                                  <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600, background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                    ✓ Delivered
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: APPLICATION FORM SUBMISSION */}
          {userTab === 'apply' && (
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <div style={{
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 12, padding: '14px 18px', marginBottom: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', marginBottom: 2 }}>Quick Demo Presets</div>
                  <div style={{ fontSize: 11, color: '#4a5068' }}>Load test values to demo the automated review workflow</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => loadPreset(true)}
                    style={{ padding: '6px 12px', borderRadius: 7, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✓ Complete App
                  </button>
                  <button
                    onClick={() => loadPreset(false)}
                    style={{ padding: '6px 12px', borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✕ Missing Photo
                  </button>
                </div>
              </div>

              {submitSuccessId && (
                <div style={{
                  background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 12, padding: '16px 20px', marginBottom: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={20} color="#10b981" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>Application Submitted Successfully!</div>
                      <div style={{ fontSize: 11, color: '#8b91a8' }}>ID: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{submitSuccessId}</strong> — Pipeline run triggered</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setUserTab('tracker')}
                    style={{ padding: '6px 14px', borderRadius: 6, background: '#10b981', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Track Status →
                  </button>
                </div>
              )}

              {submitError && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 12, padding: '12px 16px', marginBottom: 20,
                  color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertTriangle size={14} /> {submitError}
                </div>
              )}

              <form onSubmit={handleUserSubmit} style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 16, padding: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#e8eaf0', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} color="#10b981" />
                  Application Details
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#8b91a8', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Applicant Name *
                    </label>
                    <input
                      value={applicantForm.applicant_name}
                      onChange={(e) => setApplicantForm({ ...applicantForm, applicant_name: e.target.value })}
                      placeholder="e.g. Aarav Kumar"
                      style={{ width: '100%', background: '#13151d', border: '1px solid #1f2335', borderRadius: 8, padding: '10px 12px', color: '#e8eaf0', fontSize: 13, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#8b91a8', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={applicantForm.email}
                      onChange={(e) => setApplicantForm({ ...applicantForm, email: e.target.value })}
                      placeholder="e.g. user@flowforge.dev"
                      style={{ width: '100%', background: '#13151d', border: '1px solid #1f2335', borderRadius: 8, padding: '10px 12px', color: '#e8eaf0', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#8b91a8', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Phone
                    </label>
                    <input
                      value={applicantForm.phone}
                      onChange={(e) => setApplicantForm({ ...applicantForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      style={{ width: '100%', background: '#13151d', border: '1px solid #1f2335', borderRadius: 8, padding: '10px 12px', color: '#e8eaf0', fontSize: 13, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#8b91a8', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Program *
                    </label>
                    <input
                      value={applicantForm.program}
                      onChange={(e) => setApplicantForm({ ...applicantForm, program: e.target.value })}
                      placeholder="e.g. Computer Science"
                      style={{ width: '100%', background: '#13151d', border: '1px solid #1f2335', borderRadius: 8, padding: '10px 12px', color: '#e8eaf0', fontSize: 13, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#8b91a8', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Percentage / Score *
                    </label>
                    <input
                      value={applicantForm.percentage}
                      onChange={(e) => setApplicantForm({ ...applicantForm, percentage: e.target.value })}
                      placeholder="e.g. 84.5"
                      style={{ width: '100%', background: '#13151d', border: '1px solid #1f2335', borderRadius: 8, padding: '10px 12px', color: '#e8eaf0', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Documents checkboxes */}
                <div style={{ background: '#13151d', border: '1px solid #1f2335', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8b91a8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                    Uploaded Document Attachments
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { key: 'marksheet', label: 'Academic Marksheet / Transcript' },
                      { key: 'identity_proof', label: 'Government Photo ID Proof' },
                      { key: 'photo', label: 'Recent Passport Photograph' },
                    ].map((doc) => (
                      <label key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#e8eaf0' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(applicantForm[doc.key as keyof typeof applicantForm])}
                          onChange={(e) => setApplicantForm({ ...applicantForm, [doc.key]: e.target.checked })}
                          style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }}
                        />
                        {doc.label}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingApp}
                  style={{
                    width: '100%', padding: '12px 18px', borderRadius: 10,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: submittingApp ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {submittingApp ? (
                    <>
                      <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                      Submitting & Initiating Review Pipeline...
                    </>
                  ) : (
                    <>
                      <Send size={15} /> Submit Application
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS FEED */}
          {userTab === 'notifications' && (
            <div style={{ maxWidth: 840, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={16} color="#f59e0b" />
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#e8eaf0' }}>Applicant Notifications Feed</span>
                  <span style={{ fontSize: 12, color: '#4a5068' }}>({displayNotifs.length})</span>
                </div>
                <button
                  onClick={() => loadAll(true)}
                  style={{ fontSize: 11, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Refresh Feed
                </button>
              </div>

              {displayNotifs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', background: '#0f1117', border: '1px dashed #1f2335', borderRadius: 14, color: '#4a5068', fontSize: 13 }}>
                  No notifications recorded yet. Automated emails and alerts will appear here as your application is reviewed.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {displayNotifs.map((n) => (
                    <div key={n.id} style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 12, padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: 'rgba(245,158,11,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Mail size={16} color="#f59e0b" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf0' }}>{n.subject || 'Application Update'}</span>
                            <span style={{
                              fontSize: 10, padding: '2px 7px', borderRadius: 999,
                              background: n.status === 'delivered' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                              color: n.status === 'delivered' ? '#10b981' : '#ef4444', fontWeight: 600,
                            }}>
                              {n.status === 'delivered' ? '✓ Delivered' : n.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#4a5068', marginBottom: 8 }}>
                            Channel: {n.channel} · Sent to: {n.recipient} · {new Date(n.created_at).toLocaleString()}
                          </div>
                          {n.message && (
                            <div style={{
                              background: '#13151d', border: '1px solid #1f2335',
                              borderRadius: 7, padding: '10px 12px',
                              fontSize: 12, color: '#8b91a8', lineHeight: 1.6,
                              whiteSpace: 'pre-wrap',
                            }}>
                              {n.message}
                            </div>
                          )}
                          {n.application_id && (
                            <div style={{ fontSize: 10, color: '#4a5068', marginTop: 6, fontFamily: 'monospace' }}>
                              Application Reference: {n.application_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // ADMIN & REVIEWER DASHBOARD VIEW
  // =========================================================================
  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0f', fontFamily: 'Inter, sans-serif' }}>
      {/* Admin Header */}
      <header style={{
        background: '#0f1117',
        borderBottom: '1px solid #1f2335',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 58, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#e8eaf0', letterSpacing: '-0.02em' }}>
              Flow<span style={{ color: '#6366f1' }}>Forge</span>
            </span>
            <span style={{
              marginLeft: 8, fontSize: 10, padding: '2px 6px', borderRadius: 4,
              background: 'rgba(99,102,246,0.15)', color: '#818cf8',
              border: '1px solid rgba(99,102,246,0.3)', fontWeight: 600,
            }}>
              ALGOTHON&apos;26
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
            color: backendOnline ? '#10b981' : '#ef4444',
            padding: '4px 10px', borderRadius: 999,
            background: backendOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${backendOnline ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
            {backendOnline ? 'API Online' : 'API Offline'}
          </div>

          <button
            onClick={() => router.push('/apply')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              background: 'rgba(99,102,246,0.12)', border: '1px solid rgba(99,102,246,0.3)',
              borderRadius: 8, color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <FileText size={13} /> Submit Application
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Plus size={13} /> New Workflow
          </button>

          {/* User Auth Profile / Login */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 6, paddingLeft: 10, borderLeft: '1px solid #1f2335' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 8,
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.3)',
              }}>
                <Shield size={12} color="#818cf8" />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#c7d2fe' }}>
                  {user.name.split(' ')[0]}
                </span>
                <span style={{
                  fontSize: 9, textTransform: 'uppercase', fontWeight: 700,
                  padding: '1px 4px', borderRadius: 4,
                  background: '#6366f1', color: '#fff'
                }}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={() => { logout(); router.push('/login'); }}
                title="Sign Out"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 6,
                  background: 'transparent', border: '1px solid #1f2335',
                  color: '#8b91a8', cursor: 'pointer'
                }}
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/login')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid #262b40',
                borderRadius: 8, color: '#e2e8f0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <LogIn size={13} /> Sign In
            </button>
          )}
        </div>
      </header>

      <div style={{ padding: '28px 24px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Workflows', value: adminStats.total, icon: GitBranch, color: '#6366f1' },
            { label: 'Published', value: adminStats.published, icon: CheckCircle, color: '#10b981' },
            { label: 'Total Runs', value: adminStats.runs, icon: Activity, color: '#3b82f6' },
            { label: 'Successful', value: adminStats.success, icon: BarChart3, color: '#10b981' },
            { label: 'Applications', value: adminStats.apps, icon: Users, color: '#8b5cf6' },
          ].map((s) => (
            <div key={s.label} style={{
              background: '#0f1117', border: '1px solid #1f2335',
              borderRadius: 12, padding: '18px 18px',
              transition: 'border-color 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#8b91a8', fontWeight: 500 }}>{s.label}</span>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: `${s.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <s.icon size={14} color={s.color} />
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#e8eaf0', lineHeight: 1 }}>
                {loading ? '—' : s.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          {/* Left: Workflows */}
          <div>
            {/* Templates */}
            {templates.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Layers size={15} color="#6366f1" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf0' }}>Workflow Templates</span>
                  <span style={{ fontSize: 11, color: '#4a5068' }}>— Start from a ready-to-run template</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {templates.map((t) => (
                    <div
                      key={t.key}
                      onClick={() => handleFromTemplate(t.key)}
                      style={{
                        background: '#0f1117', border: '1px solid #1f2335',
                        borderRadius: 12, padding: '16px 18px',
                        cursor: 'pointer', transition: 'all 0.2s',
                        position: 'relative', overflow: 'hidden',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#6366f1';
                        (e.currentTarget as HTMLElement).style.background = '#13151d';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#1f2335';
                        (e.currentTarget as HTMLElement).style.background = '#0f1117';
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 0, right: 0,
                        width: 80, height: 80,
                        background: 'radial-gradient(circle at top right, rgba(99,102,246,0.08) 0%, transparent 70%)',
                        pointerEvents: 'none',
                      }} />
                      <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        {t.category}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf0', marginBottom: 6 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#8b91a8', lineHeight: 1.4, marginBottom: 12 }}>{t.description}</div>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11,
                        color: '#6366f1', fontWeight: 600,
                      }}>
                        <Plus size={11} /> Use Template
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workflows List */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GitBranch size={15} color="#6366f1" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf0' }}>My Workflows</span>
                </div>
                <button onClick={() => loadAll(true)} style={{
                  fontSize: 11, color: '#4a5068', background: 'none', border: 'none', cursor: 'pointer',
                }}>
                  Refresh
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#4a5068' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <div style={{ marginTop: 12, fontSize: 13 }}>Loading workflows...</div>
                </div>
              ) : workflows.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '48px 24px',
                  background: '#0f1117', border: '1px dashed #1f2335', borderRadius: 12,
                }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#8b91a8', marginBottom: 8 }}>
                    No workflows yet
                  </div>
                  <div style={{ fontSize: 13, color: '#4a5068', marginBottom: 20 }}>
                    Create a new workflow or start from a template above
                  </div>
                  <button
                    onClick={() => setShowNewModal(true)}
                    style={{
                      padding: '8px 18px', borderRadius: 8,
                      background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                      border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Create Workflow
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {workflows.map((wf) => {
                    const sc = STATUS_CONFIG[wf.status] || STATUS_CONFIG.draft;
                    const StatusIcon = sc.icon;
                    return (
                      <div
                        key={wf.id}
                        onClick={() => router.push(`/editor/${wf.id}`)}
                        style={{
                          background: '#0f1117', border: '1px solid #1f2335',
                          borderRadius: 12, padding: '16px 18px',
                          display: 'flex', alignItems: 'center', gap: 14,
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = '#2a2f4a';
                          (e.currentTarget as HTMLElement).style.background = '#13151d';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = '#1f2335';
                          (e.currentTarget as HTMLElement).style.background = '#0f1117';
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: 'rgba(99,102,246,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <GitBranch size={18} color="#6366f1" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf0', marginBottom: 3 }}>
                            {wf.name}
                          </div>
                          {wf.description && (
                            <div style={{ fontSize: 12, color: '#8b91a8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {wf.description}
                            </div>
                          )}
                        </div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 999,
                          background: sc.bg, fontSize: 11, fontWeight: 600,
                          color: sc.color,
                        }}>
                          <StatusIcon size={10} />
                          {wf.status}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/editor/${wf.id}`); }}
                            style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(99,102,246,0.1)', border: '1px solid rgba(99,102,246,0.25)', color: '#818cf8', fontSize: 11, cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/workflows/${wf.id}/runs`); }}
                            style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}
                          >
                            Runs
                          </button>
                          <button
                            onClick={(e) => handleDelete(wf.id, e)}
                            style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                        <ChevronRight size={14} color="#4a5068" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Activity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Recent Runs */}
            <div style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Activity size={14} color="#3b82f6" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf0' }}>Recent Runs</span>
              </div>
              {runs.slice(0, 8).length === 0 ? (
                <div style={{ fontSize: 12, color: '#4a5068', textAlign: 'center', padding: '20px 0' }}>No runs yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {runs.slice(0, 8).map((r) => {
                    const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.queued;
                    const StatusIcon = sc.icon;
                    return (
                      <div
                        key={r.id}
                        onClick={() => router.push(`/runs/${r.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#13151d'}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: 6,
                          background: sc.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <StatusIcon size={10} color={sc.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: '#e8eaf0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.id.slice(0, 8)}... · {r.trigger_type}
                          </div>
                          <div style={{ fontSize: 10, color: '#4a5068' }}>
                            {new Date(r.created_at).toLocaleString()}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: sc.color, fontWeight: 600 }}>{r.status}</span>
                        <ExternalLink size={10} color="#4a5068" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Applications */}
            <div style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={14} color="#8b5cf6" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf0' }}>Applications Queue</span>
                </div>
                <button
                  onClick={() => router.push('/applications')}
                  style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  View All →
                </button>
              </div>
              {applications.slice(0, 6).length === 0 ? (
                <div style={{ fontSize: 12, color: '#4a5068', textAlign: 'center', padding: '16px 0' }}>
                  No applications yet.<br />
                  <button
                    onClick={() => router.push('/apply')}
                    style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, marginTop: 6 }}
                  >
                    Submit one →
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {applications.slice(0, 6).map((app) => {
                    const asc = APP_STATUS_CONFIG[app.status] || { color: '#8b91a8', label: app.status };
                    return (
                      <div key={app.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 8,
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: 'rgba(139,92,246,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#8b91a8',
                        }}>
                          {app.applicant_name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#e8eaf0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {app.applicant_name}
                          </div>
                          <div style={{ fontSize: 10, color: '#4a5068' }}>{app.program || 'N/A'}</div>
                        </div>
                        <span style={{ fontSize: 10, color: asc.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {asc.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8b91a8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Quick Links
              </div>
              {[
                { label: 'Submit Application', icon: FileText, path: '/apply', color: '#6366f1' },
                { label: 'View All Applications', icon: Users, path: '/applications', color: '#8b5cf6' },
                { label: 'Execution Monitor', icon: Activity, path: '/runs', color: '#3b82f6' },
                { label: 'Notifications', icon: Bell, path: '/notifications', color: '#f59e0b' },
              ].map((l) => (
                <button
                  key={l.label}
                  onClick={() => router.push(l.path)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'background 0.15s', color: 'inherit',
                  }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#13151d'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'none'}
                >
                  <l.icon size={13} color={l.color} />
                  <span style={{ fontSize: 12, color: '#e8eaf0' }}>{l.label}</span>
                  <ChevronRight size={11} color="#4a5068" style={{ marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Workflow Modal */}
      {showNewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#0f1117', border: '1px solid #1f2335',
            borderRadius: 16, padding: 28, width: 420,
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e8eaf0', marginBottom: 20 }}>
              Create New Workflow
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#8b91a8', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Workflow Name *
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Admission Processing Workflow"
                autoFocus
                style={{
                  width: '100%', background: '#13151d', border: '1px solid #1f2335',
                  borderRadius: 8, padding: '10px 12px', color: '#e8eaf0', fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#8b91a8', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Description
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description of what this workflow does..."
                rows={3}
                style={{
                  width: '100%', background: '#13151d', border: '1px solid #1f2335',
                  borderRadius: 8, padding: '10px 12px', color: '#e8eaf0', fontSize: 13,
                  outline: 'none', resize: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowNewModal(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  background: 'transparent', border: '1px solid #1f2335',
                  color: '#8b91a8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                style={{
                  flex: 2, padding: '10px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.8 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {creating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                Create & Open Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
