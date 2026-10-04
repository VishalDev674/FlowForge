'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Plus, Play, Upload, Clock, CheckCircle, AlertTriangle,
  Trash2, FileText, ChevronRight, Users, BarChart3, Bell,
  Loader2, GitBranch, Layers, ExternalLink, Activity,
  LogIn, LogOut, Shield, User as UserIcon, Mail, Phone,
  CheckCircle2, XCircle, RefreshCw, Send, Sparkles, Terminal,
  Cpu, HardDrive, Network, Radio, Eye
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

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  draft: { color: '#8b9bb4', bg: 'rgba(139, 155, 180, 0.08)', border: '#253246', label: 'DRAFT' },
  published: { color: '#00ff66', bg: 'rgba(0, 255, 102, 0.08)', border: 'rgba(0, 255, 102, 0.3)', label: 'PUBLISHED' },
  paused: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)', label: 'PAUSED' },
  archived: { color: '#4e5d78', bg: 'rgba(78, 93, 120, 0.08)', border: '#1e2636', label: 'ARCHIVED' },
  completed: { color: '#00ff66', bg: 'rgba(0, 255, 102, 0.08)', border: 'rgba(0, 255, 102, 0.3)', label: 'COMPLETED' },
  failed: { color: '#ff3366', bg: 'rgba(255, 51, 102, 0.08)', border: 'rgba(255, 51, 102, 0.3)', label: 'FAILED' },
  running: { color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.08)', border: 'rgba(0, 240, 255, 0.3)', label: 'RUNNING' },
  queued: { color: '#8b9bb4', bg: 'rgba(139, 155, 180, 0.08)', border: '#253246', label: 'QUEUED' },
  partially_failed: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)', label: 'WARN' },
};

const APP_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  received: { color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.1)', border: 'rgba(0, 240, 255, 0.3)', label: 'RECEIVED' },
  validating: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', label: 'VALIDATING' },
  needs_correction: { color: '#ff3366', bg: 'rgba(255, 51, 102, 0.1)', border: 'rgba(255, 51, 102, 0.3)', label: 'CORRECTION' },
  under_review: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', label: 'IN_REVIEW' },
  accepted: { color: '#00ff66', bg: 'rgba(0, 255, 102, 0.12)', border: 'rgba(0, 255, 102, 0.4)', label: 'ACCEPTED' },
  rejected: { color: '#ff3366', bg: 'rgba(255, 51, 102, 0.12)', border: 'rgba(255, 51, 102, 0.4)', label: 'REJECTED' },
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
    program: 'Computer Science & AI',
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
    if (!confirm('TERMINATE THIS WORKFLOW PIPELINE?')) return;
    await api.workflows.delete(id);
    setWorkflows((ws) => ws.filter((w) => w.id !== id));
  };

  // User Application Submission
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccessId(null);

    if (!applicantForm.applicant_name.trim()) {
      setSubmitError('ERR_INPUT: APPLICANT_NAME_REQUIRED');
      return;
    }
    if (!applicantForm.email.trim() || !applicantForm.email.includes('@')) {
      setSubmitError('ERR_INPUT: VALID_EMAIL_REQUIRED');
      return;
    }
    if (!applicantForm.percentage.trim()) {
      setSubmitError('ERR_INPUT: PERCENTAGE_METRIC_REQUIRED');
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
      setTimeout(() => {
        setUserTab('tracker');
      }, 1200);
    } catch (err: unknown) {
      setSubmitError((err as Error).message || 'ERR_TRANSMISSION: FAILED_TO_SUBMIT');
    } finally {
      setSubmittingApp(false);
    }
  };

  const loadPreset = (complete: boolean) => {
    if (complete) {
      setApplicantForm({
        applicant_name: user?.name || 'Alex Chen',
        email: user?.email || 'user@flowforge.dev',
        phone: '+1 555-0192',
        program: 'Computer Science & AI',
        percentage: '89.4',
        marksheet: true,
        identity_proof: true,
        photo: true,
      });
    } else {
      setApplicantForm({
        applicant_name: user?.name || 'Elena Rostova',
        email: user?.email || 'user@flowforge.dev',
        phone: '+1 555-0144',
        program: 'Autonomous Robotics',
        percentage: '73.5',
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
      <div style={{ minHeight: '100vh', background: '#040507', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Loader2 size={32} color="#00ff66" className="spin" />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#00ff66', letterSpacing: '0.1em' }}>
          INITIALIZING_SYSTEM_CORE...
        </div>
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

  // Filter applications for current user (or show all for admins/reviewers)
  const userApps = applications.filter(
    (a) => user?.email && a.email.toLowerCase() === user.email.toLowerCase()
  );
  const displayApplications = isAdminOrReviewer ? applications : userApps;

  // Active application for tracker
  const activeApp = selectedAppId
    ? displayApplications.find((a) => a.id === selectedAppId) || displayApplications[0]
    : displayApplications[0];

  // Filter notifications for user
  const userNotifs = notifications.filter(
    (n) =>
      (user?.email && n.recipient?.toLowerCase() === user.email.toLowerCase()) ||
      displayApplications.some((a) => a.id === n.application_id)
  );
  const displayNotifs = isAdminOrReviewer ? notifications : userNotifs;

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
  // USER / APPLICANT CYBERPUNK VIEW
  // =========================================================================
  if (!isAdminOrReviewer) {
    const currentStep = activeApp ? getStepNumber(activeApp.status) : 1;
    const activeAppStatusConfig = activeApp
      ? APP_STATUS_CONFIG[activeApp.status] || { color: '#7d8da0', bg: 'rgba(125,141,160,0.1)', border: '#243246', label: activeApp.status }
      : null;

    return (
      <div style={{ minHeight: '100vh', background: '#050608', position: 'relative', zIndex: 2 }}>
        {/* Navbar */}
        <header style={{
          background: 'rgba(8,11,16,0.88)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #151D2B',
          padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56, position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'linear-gradient(135deg, rgba(0,255,102,0.12), rgba(0,212,255,0.12))',
              border: '1px solid rgba(0,255,102,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={14} color="#00ff66" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#f0f4f8', letterSpacing: '-0.01em' }}>
              Flow<span style={{ color: '#00ff66' }}>Forge</span>
            </span>
            <span className="cyber-badge cyber-badge-muted" style={{ fontSize: 9 }}>APPLICANT</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => loadAll(true)} disabled={loading}
              className="cyber-btn cyber-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
              <RefreshCw size={12} className={loading ? 'spin' : ''} />
              {loading ? 'Syncing...' : 'Refresh'}
            </button>

            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 6,
              color: backendOnline ? '#00ff66' : '#ff3b5c',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: backendOnline ? '#00ff66' : '#ff3b5c',
                boxShadow: backendOnline ? '0 0 6px #00ff66' : 'none',
              }} className={backendOnline ? 'pulse-soft' : ''} />
              {backendOnline ? 'ONLINE' : 'OFFLINE'}
            </div>

            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 8, borderLeft: '1px solid #1a2435' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 6,
                  background: '#0B0F15', border: '1px solid #1a2435',
                }}>
                  <UserIcon size={12} color="#7d8da0" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#d1dae6' }}>{user.name}</span>
                  <span className="cyber-badge cyber-badge-muted" style={{ fontSize: 9, padding: '1px 5px' }}>{user.role}</span>
                </div>
                <button onClick={() => { logout(); router.push('/login'); }}
                  title="Sign out" className="cyber-btn cyber-btn-ghost" style={{ padding: '6px 8px', borderRadius: 6 }}>
                  <LogOut size={13} color="#7d8da0" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Tab Navigation */}
        <div style={{
          background: '#080B10', borderBottom: '1px solid #151D2B',
          padding: '0 28px', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {[
            { id: 'tracker', label: 'Status Tracker', icon: Activity, count: displayApplications.length },
            { id: 'apply', label: 'Submit Application', icon: FileText, count: null },
            { id: 'notifications', label: 'Notifications', icon: Bell, count: displayNotifs.length },
          ].map((tab) => {
            const isActive = userTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setUserTab(tab.id as any)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '14px 18px', fontSize: 13, fontWeight: 600,
                  background: 'transparent', border: 'none',
                  color: isActive ? '#f0f4f8' : '#7d8da0',
                  borderBottom: isActive ? '2px solid #00ff66' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 150ms',
                }}>
                <tab.icon size={14} color={isActive ? '#00ff66' : 'currentColor'} />
                {tab.label}
                {tab.count !== null && (
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 4,
                    background: isActive ? 'rgba(0,255,102,0.08)' : 'rgba(255,255,255,0.03)',
                    color: isActive ? '#00ff66' : '#4a5a70',
                    border: `1px solid ${isActive ? 'rgba(0,255,102,0.2)' : '#151D2B'}`,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px' }}>

          {/* Stats Bar */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Submissions', value: loading ? '—' : displayApplications.length, icon: FileText, color: '#00ff66' },
              {
                label: 'Pipeline Stage',
                value: activeAppStatusConfig ? activeAppStatusConfig.label : 'N/A',
                icon: Activity,
                color: activeAppStatusConfig ? activeAppStatusConfig.color : '#7d8da0',
                isStatus: true
              },
              {
                label: 'Eligibility Score',
                value: activeApp?.eligibility_score || (activeApp?.percentage ? `${activeApp.percentage}%` : 'N/A'),
                icon: Cpu, color: '#00d4ff'
              },
              { label: 'Notifications', value: loading ? '—' : displayNotifs.length, icon: Bell, color: '#f59e0b' },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: '#0B0F15', border: '1px solid #151D2B', borderRadius: 10,
                padding: '18px 20px', transition: 'border-color 200ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#243246'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#151D2B'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#7d8da0' }}>{stat.label}</span>
                  <stat.icon size={14} color={stat.color} style={{ opacity: 0.7 }} />
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: stat.isStatus ? 14 : 26, fontWeight: 700,
                  color: '#f0f4f8', letterSpacing: '-0.02em',
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* TAB 1: STATUS TRACKER */}
          {userTab === 'tracker' && (
            <div>
              {displayApplications.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '60px 24px',
                  background: '#0B0F15', border: '1px dashed #1a2435', borderRadius: 10,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 10, background: 'rgba(0,255,102,0.06)',
                    border: '1px solid rgba(0,255,102,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                  }}>
                    <FileText size={22} color="#00ff66" />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', marginBottom: 8 }}>
                    No Applications Yet
                  </h3>
                  <p style={{ fontSize: 13, color: '#7d8da0', maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.6 }}>
                    Submit your first application to start the automated review pipeline.
                  </p>
                  <button onClick={() => setUserTab('apply')} className="cyber-btn cyber-btn-primary">
                    <Plus size={14} /> Submit Application
                  </button>
                </div>
              ) : (
                <div>
                  {/* App Selector */}
                  {displayApplications.length > 1 && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 6 }}>
                      {displayApplications.map((app) => {
                        const isSelected = activeApp?.id === app.id;
                        const sc = APP_STATUS_CONFIG[app.status] || { color: '#7d8da0', label: app.status };
                        return (
                          <button key={app.id} onClick={() => setSelectedAppId(app.id)}
                            style={{
                              padding: '8px 14px', borderRadius: 8,
                              background: isSelected ? '#0E131A' : '#0B0F15',
                              border: `1px solid ${isSelected ? 'rgba(0,255,102,0.3)' : '#151D2B'}`,
                              color: isSelected ? '#f0f4f8' : '#7d8da0',
                              fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                              whiteSpace: 'nowrap', transition: 'all 200ms',
                            }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{app.id}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: sc.color }}>{sc.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeApp && (
                    <div style={{
                      background: '#0B0F15', border: '1px solid #151D2B', borderRadius: 12,
                      padding: 28, marginBottom: 24,
                    }}>
                      {/* App Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: '#f0f4f8' }}>{activeApp.applicant_name}</span>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                              padding: '2px 8px', borderRadius: 4, background: '#0E131A',
                              border: '1px solid #1a2435', color: '#7d8da0'
                            }}>
                              {activeApp.id}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#7d8da0', display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span>Program: <strong style={{ color: '#00d4ff' }}>{activeApp.program || 'N/A'}</strong></span>
                            <span>Email: <strong style={{ color: '#d1dae6' }}>{activeApp.email}</strong></span>
                            <span>Submitted: {new Date(activeApp.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {activeAppStatusConfig && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 14px', borderRadius: 8,
                            background: activeAppStatusConfig.bg,
                            border: `1px solid ${activeAppStatusConfig.border}`,
                            color: activeAppStatusConfig.color, fontSize: 12, fontWeight: 600,
                          }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                            {activeAppStatusConfig.label}
                          </div>
                        )}
                      </div>

                      {/* Pipeline Stepper */}
                      <div style={{
                        background: '#080B10', border: '1px solid #151D2B', borderRadius: 10,
                        padding: '22px 20px', marginBottom: 24,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#4a5a70', marginBottom: 18, letterSpacing: '0.04em' }}>
                          PIPELINE PROGRESS
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                          {[
                            { num: 1, title: 'Received', desc: 'Queued for processing' },
                            { num: 2, title: 'Validation', desc: 'Rules & document check' },
                            { num: 3, title: 'Review', desc: 'Supervisor evaluation' },
                            {
                              num: 4,
                              title: activeApp.status === 'accepted' ? 'Accepted' : (activeApp.status === 'rejected' ? 'Rejected' : 'Decision'),
                              desc: activeApp.status === 'accepted' ? 'Pipeline passed' : 'Final decision'
                            },
                          ].map((step) => {
                            const isDone = currentStep > step.num;
                            const isCurrent = currentStep === step.num;
                            const isPending = currentStep < step.num;
                            const stepColor = isDone ? '#00ff66' : isCurrent ? (activeApp.status === 'rejected' ? '#ff3b5c' : '#00ff66') : '#243246';

                            return (
                              <div key={step.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <div style={{
                                  width: 36, height: 36, borderRadius: 8,
                                  background: isDone ? 'rgba(0,255,102,0.08)' : isCurrent ? 'rgba(0,255,102,0.12)' : '#0B0F15',
                                  border: `1.5px solid ${stepColor}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: isDone ? '#00ff66' : stepColor,
                                  fontWeight: 700, fontSize: 12, marginBottom: 8,
                                  boxShadow: isCurrent ? `0 0 12px ${stepColor}40` : 'none',
                                }}>
                                  {isDone ? <CheckCircle size={16} /> : (isCurrent ? <Loader2 size={15} className="spin" /> : step.num)}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: isPending ? '#3b475c' : '#f0f4f8', marginBottom: 2 }}>
                                  {step.title}
                                </div>
                                <div style={{ fontSize: 10, color: isPending ? '#2e3d52' : '#7d8da0' }}>
                                  {step.desc}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                        {/* Documents */}
                        <div style={{ background: '#080B10', border: '1px solid #151D2B', borderRadius: 10, padding: 18 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f4f8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={13} color="#00ff66" />
                            Document Verification
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {[
                              { key: 'marksheet', label: 'Academic Transcript' },
                              { key: 'identity_proof', label: 'Government ID' },
                              { key: 'photo', label: 'Passport Photo' },
                            ].map((doc) => {
                              const isAttached = Boolean(activeApp.documents_json?.[doc.key]);
                              return (
                                <div key={doc.key} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '9px 12px', borderRadius: 6, background: '#0B0F15',
                                  border: '1px solid #151D2B',
                                }}>
                                  <span style={{ fontSize: 12, color: '#d1dae6' }}>{doc.label}</span>
                                  {isAttached ? (
                                    <span className="cyber-badge cyber-badge-green" style={{ fontSize: 9 }}>
                                      <CheckCircle2 size={10} /> Verified
                                    </span>
                                  ) : (
                                    <span className="cyber-badge cyber-badge-red" style={{ fontSize: 9 }}>
                                      <XCircle size={10} /> Missing
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Metrics */}
                        <div style={{ background: '#080B10', border: '1px solid #151D2B', borderRadius: 10, padding: 18 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f4f8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Cpu size={13} color="#00d4ff" />
                            Evaluation Metrics
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                            {[
                              { label: 'Reported Score', value: activeApp.percentage ? `${activeApp.percentage}%` : 'N/A', color: '#d1dae6' },
                              { label: 'Calculated Score', value: activeApp.eligibility_score || 'Processing...', color: '#00ff66' },
                              { label: 'Category', value: activeApp.category || 'Merit Priority', color: '#00d4ff' },
                              { label: 'Reviewer', value: activeApp.assigned_reviewer_id ? `Assigned: ${activeApp.assigned_reviewer_id}` : 'Pending', color: activeApp.assigned_reviewer_id ? '#00ff66' : '#4a5a70' },
                            ].map((row) => (
                              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #121824', paddingBottom: 8 }}>
                                <span style={{ color: '#7d8da0' }}>{row.label}</span>
                                <strong style={{ color: row.color, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{row.value}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Related Notifications */}
                      {displayNotifs.filter((n) => n.application_id === activeApp.id).length > 0 && (
                        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #151D2B' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f4f8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Bell size={13} color="#f59e0b" />
                            Related Notifications
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {displayNotifs
                              .filter((n) => n.application_id === activeApp.id)
                              .map((n) => (
                                <div key={n.id} style={{
                                  background: '#080B10', border: '1px solid #151D2B',
                                  borderRadius: 8, padding: '10px 14px', fontSize: 12,
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                  <div>
                                    <span style={{ fontWeight: 600, color: '#f0f4f8' }}>{n.subject}</span>
                                    <span style={{ color: '#4a5a70', marginLeft: 10, fontSize: 11 }}>
                                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <span className="cyber-badge cyber-badge-green" style={{ fontSize: 9 }}>Delivered</span>
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

          {/* TAB 2: APPLICATION FORM */}
          {userTab === 'apply' && (
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <div style={{
                background: '#0B0F15', border: '1px solid #151D2B',
                borderRadius: 10, padding: '14px 18px', marginBottom: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f4f8', marginBottom: 2 }}>Test Presets</div>
                  <div style={{ fontSize: 11, color: '#7d8da0' }}>Pre-fill with sample data for testing</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => loadPreset(true)}
                    className="cyber-btn cyber-btn-secondary" style={{ fontSize: 11, padding: '5px 12px' }}>
                    ✓ Complete
                  </button>
                  <button onClick={() => loadPreset(false)}
                    className="cyber-btn cyber-btn-secondary" style={{ fontSize: 11, padding: '5px 12px' }}>
                    ✕ Incomplete
                  </button>
                </div>
              </div>

              {submitSuccessId && (
                <div className="fade-in" style={{
                  background: 'rgba(0,255,102,0.06)', border: '1px solid rgba(0,255,102,0.2)',
                  borderRadius: 10, padding: '16px 20px', marginBottom: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={20} color="#00ff66" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#00ff66' }}>
                        Application Submitted Successfully
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7d8da0' }}>
                        ID: <strong style={{ color: '#f0f4f8' }}>{submitSuccessId}</strong>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setUserTab('tracker')}
                    className="cyber-btn cyber-btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
                    View Status →
                  </button>
                </div>
              )}

              {submitError && (
                <div style={{
                  background: 'rgba(255,59,92,0.06)', border: '1px solid rgba(255,59,92,0.2)',
                  borderRadius: 8, padding: '12px 16px', marginBottom: 20,
                  color: '#ff3b5c', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertTriangle size={14} /> {submitError}
                </div>
              )}

              <form onSubmit={handleUserSubmit} style={{
                background: '#0B0F15', border: '1px solid #151D2B',
                borderRadius: 12, padding: 28,
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Terminal size={15} color="#00ff66" />
                  Application Form
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#7d8da0', display: 'block', marginBottom: 6 }}>
                      Full Name *
                    </label>
                    <input value={applicantForm.applicant_name}
                      onChange={(e) => setApplicantForm({ ...applicantForm, applicant_name: e.target.value })}
                      placeholder="e.g. Alex Chen" className="cyber-input"
                      style={{ width: '100%', padding: '10px 12px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#7d8da0', display: 'block', marginBottom: 6 }}>
                      Email *
                    </label>
                    <input type="email" value={applicantForm.email}
                      onChange={(e) => setApplicantForm({ ...applicantForm, email: e.target.value })}
                      placeholder="user@flowforge.dev" className="cyber-input"
                      style={{ width: '100%', padding: '10px 12px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#7d8da0', display: 'block', marginBottom: 6 }}>
                      Phone
                    </label>
                    <input value={applicantForm.phone}
                      onChange={(e) => setApplicantForm({ ...applicantForm, phone: e.target.value })}
                      placeholder="+91 98765 43210" className="cyber-input"
                      style={{ width: '100%', padding: '10px 12px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#7d8da0', display: 'block', marginBottom: 6 }}>
                      Program *
                    </label>
                    <input value={applicantForm.program}
                      onChange={(e) => setApplicantForm({ ...applicantForm, program: e.target.value })}
                      placeholder="e.g. Computer Science" className="cyber-input"
                      style={{ width: '100%', padding: '10px 12px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#7d8da0', display: 'block', marginBottom: 6 }}>
                      Score (%) *
                    </label>
                    <input value={applicantForm.percentage}
                      onChange={(e) => setApplicantForm({ ...applicantForm, percentage: e.target.value })}
                      placeholder="e.g. 88.5" className="cyber-input"
                      style={{ width: '100%', padding: '10px 12px' }} />
                  </div>
                </div>

                <div style={{ background: '#080B10', border: '1px solid #151D2B', borderRadius: 8, padding: '14px 16px', marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#4a5a70', letterSpacing: '0.04em', marginBottom: 12 }}>
                    REQUIRED DOCUMENTS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { key: 'marksheet', label: 'Academic Transcript' },
                      { key: 'identity_proof', label: 'Government ID' },
                      { key: 'photo', label: 'Passport Photograph' },
                    ].map((doc) => (
                      <label key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#d1dae6' }}>
                        <input type="checkbox"
                          checked={Boolean(applicantForm[doc.key as keyof typeof applicantForm])}
                          onChange={(e) => setApplicantForm({ ...applicantForm, [doc.key]: e.target.checked })}
                          style={{ width: 16, height: 16, accentColor: '#00ff66', cursor: 'pointer' }} />
                        <span>{doc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={submittingApp}
                  className="cyber-btn cyber-btn-primary"
                  style={{ width: '100%', padding: '12px 18px', fontSize: 14 }}>
                  {submittingApp ? (
                    <><Loader2 size={16} className="spin" /> Submitting...</>
                  ) : (
                    <><Send size={15} /> Submit Application</>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {userTab === 'notifications' && (
            <div style={{ maxWidth: 880, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={16} color="#00ff66" />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>
                    Notifications
                  </span>
                  <span className="cyber-badge cyber-badge-muted" style={{ fontSize: 10 }}>
                    {displayNotifs.length}
                  </span>
                </div>
                <button onClick={() => loadAll(true)}
                  className="cyber-btn cyber-btn-ghost" style={{ fontSize: 12 }}>
                  Refresh
                </button>
              </div>

              {displayNotifs.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '48px 24px',
                  background: '#0B0F15', border: '1px dashed #1a2435', borderRadius: 10,
                  color: '#4a5a70', fontSize: 13,
                }}>
                  No notifications yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {displayNotifs.map((n) => (
                    <div key={n.id} style={{
                      background: '#0B0F15', border: '1px solid #151D2B', borderRadius: 10,
                      padding: '16px 20px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                          background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Mail size={15} color="#00d4ff" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8' }}>
                              {n.subject}
                            </span>
                            <span className="cyber-badge cyber-badge-green" style={{ fontSize: 9 }}>
                              ✓ {n.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#4a5a70', marginBottom: 8 }}>
                            {n.channel} · {n.recipient} · {new Date(n.created_at).toLocaleString()}
                          </div>
                          {n.message && (
                            <div style={{
                              fontFamily: 'var(--font-mono)',
                              background: '#080B10', border: '1px solid #151D2B',
                              borderRadius: 6, padding: '10px 12px',
                              fontSize: 11, color: '#7d8da0', lineHeight: 1.6,
                              whiteSpace: 'pre-wrap',
                            }}>
                              {n.message}
                            </div>
                          )}
                          {n.application_id && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#00ff66', marginTop: 6 }}>
                              Ref: {n.application_id}
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
  // ADMIN & REVIEWER — PREMIUM COMMAND CENTER
  // =========================================================================
  return (
    <div style={{ minHeight: '100vh', background: '#050608', position: 'relative', zIndex: 2 }}>
      {/* ── Navbar ─────────────────────────────────────────── */}
      <header style={{
        background: 'rgba(8, 11, 16, 0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #151D2B',
        padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, rgba(0,255,102,0.15), rgba(0,212,255,0.15))',
            border: '1px solid rgba(0,255,102,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={14} color="#00ff66" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#f0f4f8', letterSpacing: '-0.01em' }}>
              Flow<span style={{ color: '#00ff66' }}>Forge</span>
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4a5a70', fontWeight: 500 }}>
              v2.0
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* System status */}
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 6,
            color: backendOnline ? '#00ff66' : '#ff3b5c',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: backendOnline ? '#00ff66' : '#ff3b5c',
              boxShadow: backendOnline ? '0 0 6px #00ff66' : 'none',
            }} className={backendOnline ? 'pulse-soft' : ''} />
            {backendOnline ? 'ONLINE' : 'OFFLINE'}
          </div>

          <div style={{ width: 1, height: 24, background: '#1a2435' }} />

          <button
            onClick={() => router.push('/apply')}
            className="cyber-btn cyber-btn-secondary"
            style={{ padding: '6px 14px', fontSize: 12 }}
          >
            <FileText size={13} />
            Test Intake
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="cyber-btn cyber-btn-primary"
            style={{ padding: '6px 16px', fontSize: 12 }}
          >
            <Plus size={14} />
            New Pipeline
          </button>

          <div style={{ width: 1, height: 24, background: '#1a2435' }} />

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 6,
                background: '#0B0F15', border: '1px solid #1a2435',
              }}>
                <Shield size={12} color="#7d8da0" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#d1dae6' }}>
                  {user.name.split(' ')[0]}
                </span>
                <span className="cyber-badge cyber-badge-muted" style={{ fontSize: 9, padding: '1px 5px' }}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={() => { logout(); router.push('/login'); }}
                title="Sign out"
                className="cyber-btn cyber-btn-ghost"
                style={{ padding: '6px 8px', borderRadius: 6 }}
              >
                <LogOut size={13} color="#7d8da0" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="cyber-btn cyber-btn-secondary"
              style={{ padding: '6px 14px', fontSize: 12 }}
            >
              <LogIn size={13} /> Sign in
            </button>
          )}
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────── */}
      <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── Statistics Row ───────────────────────────────── */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Workflow Pipelines', value: adminStats.total, icon: GitBranch, color: '#00ff66', accent: false },
            { label: 'Published', value: adminStats.published, icon: CheckCircle, color: '#00cc52', accent: false },
            { label: 'Executions', value: adminStats.runs, icon: Activity, color: '#00d4ff', accent: false },
            { label: 'Successful', value: adminStats.success, icon: BarChart3, color: '#00ff66', accent: false },
            { label: 'Applications', value: adminStats.apps, icon: Users, color: '#a855f7', accent: false },
          ].map((s) => (
            <div key={s.label} style={{
              background: '#0B0F15',
              border: '1px solid #151D2B',
              borderRadius: 10,
              padding: '18px 20px',
              transition: 'border-color 200ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#243246'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#151D2B'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#7d8da0' }}>
                  {s.label}
                </span>
                <s.icon size={14} color={s.color} style={{ opacity: 0.7 }} />
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700,
                color: '#f0f4f8', letterSpacing: '-0.02em',
              }}>
                {loading ? '—' : s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Two-Column Layout ────────────────────────────── */}
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>

          {/* ── LEFT: Templates & Pipelines ────────────────── */}
          <div>
            {/* Pipeline Templates */}
            {templates.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Layers size={15} color="#00ff66" />
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>
                      Pipeline Templates
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4a5a70', marginLeft: 10 }}>
                      01
                    </span>
                  </div>
                  <div style={{ flex: 1, height: 1, background: '#151D2B', marginLeft: 8 }} />
                </div>
                <p style={{ fontSize: 12, color: '#7d8da0', marginBottom: 14, marginTop: -6 }}>
                  Deploy pre-built workflow architectures
                </p>
                <div className="template-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {templates.map((t) => (
                    <div
                      key={t.key}
                      onClick={() => handleFromTemplate(t.key)}
                      className="cyber-card-interactive"
                      style={{
                        padding: '20px', cursor: 'pointer',
                        background: '#0B0F15',
                        border: '1px solid #151D2B',
                        borderRadius: 10,
                        transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
                        position: 'relative', overflow: 'hidden',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(0,255,102,0.25)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 32px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,102,0.06)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#151D2B';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Faint DAG pattern background */}
                      <div style={{
                        position: 'absolute', top: 0, right: 0, width: 120, height: 80,
                        opacity: 0.04,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='3' fill='%2300ff66'/%3E%3Ccircle cx='60' cy='15' r='3' fill='%2300ff66'/%3E%3Ccircle cx='100' cy='25' r='3' fill='%2300ff66'/%3E%3Ccircle cx='40' cy='50' r='3' fill='%2300ff66'/%3E%3Ccircle cx='80' cy='55' r='3' fill='%2300ff66'/%3E%3Cline x1='20' y1='20' x2='60' y2='15' stroke='%2300ff66' stroke-width='1'/%3E%3Cline x1='60' y1='15' x2='100' y2='25' stroke='%2300ff66' stroke-width='1'/%3E%3Cline x1='20' y1='20' x2='40' y2='50' stroke='%2300ff66' stroke-width='1'/%3E%3Cline x1='60' y1='15' x2='80' y2='55' stroke='%2300ff66' stroke-width='1'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                      }} />

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span className="cyber-badge cyber-badge-muted" style={{ fontSize: 9 }}>
                          {t.category.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8', marginBottom: 6 }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#7d8da0', lineHeight: 1.6, marginBottom: 14 }}>
                        {t.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4a5a70' }}>
                          ID // {t.key}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#00ff66', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Deploy <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orchestration Pipelines */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Network size={15} color="#00ff66" />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>
                    Orchestration Pipelines
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4a5a70' }}>
                    02
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#151D2B', marginLeft: 8 }} />
                </div>
                <button
                  onClick={() => loadAll(true)}
                  disabled={loading}
                  className="cyber-btn cyber-btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                >
                  <RefreshCw size={12} className={loading ? 'spin' : ''} />
                  {loading ? 'Syncing...' : 'Refresh'}
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 48, color: '#4a5a70' }}>
                  <Loader2 size={24} color="#00ff66" className="spin" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>Loading pipelines...</div>
                </div>
              ) : workflows.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '56px 24px',
                  background: '#0B0F15', border: '1px dashed #1a2435', borderRadius: 10,
                }}>
                  <div style={{ fontSize: 14, color: '#7d8da0', marginBottom: 16 }}>
                    No active pipelines found
                  </div>
                  <button
                    onClick={() => setShowNewModal(true)}
                    className="cyber-btn cyber-btn-primary"
                    style={{ padding: '8px 20px' }}
                  >
                    <Plus size={14} /> Create First Pipeline
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {workflows.map((wf) => {
                    const sc = STATUS_CONFIG[wf.status] || STATUS_CONFIG.draft;
                    return (
                      <div
                        key={wf.id}
                        onClick={() => router.push(`/editor/${wf.id}`)}
                        style={{
                          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                          cursor: 'pointer', background: '#0B0F15',
                          border: '1px solid #151D2B', borderRadius: 10,
                          transition: 'all 200ms ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#243246';
                          e.currentTarget.style.background = '#0E131A';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#151D2B';
                          e.currentTarget.style.background = '#0B0F15';
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: `${sc.color}10`, border: `1px solid ${sc.color}25`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Network size={16} color={sc.color} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#f0f4f8' }}>
                              {wf.name}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4a5a70' }}>
                              {wf.id.slice(0, 8)}
                            </span>
                          </div>
                          {wf.description && (
                            <div style={{ fontSize: 12, color: '#7d8da0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {wf.description}
                            </div>
                          )}
                        </div>

                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                          padding: '3px 8px', borderRadius: 4,
                          background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color,
                        }}>
                          {sc.label}
                        </span>

                        <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/editor/${wf.id}`)}
                            className="cyber-btn cyber-btn-ghost"
                            style={{ padding: '4px 10px', fontSize: 11 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => router.push(`/workflows/${wf.id}/runs`)}
                            className="cyber-btn cyber-btn-ghost"
                            style={{ padding: '4px 10px', fontSize: 11, color: '#00d4ff' }}
                          >
                            Runs
                          </button>
                          <button
                            onClick={(e) => handleDelete(wf.id, e)}
                            className="cyber-btn cyber-btn-ghost"
                            style={{ padding: '4px 8px' }}
                          >
                            <Trash2 size={12} color="#7d8da0" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Telemetry Sidebar ───────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Execution Telemetry */}
            <div style={{
              background: '#0B0F15', border: '1px solid #151D2B', borderRadius: 10,
              padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={14} color="#00d4ff" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f4f8' }}>
                    Execution Telemetry
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="cyber-badge cyber-badge-cyan" style={{ fontSize: 9, padding: '2px 6px' }}>LIVE</span>
                  <button
                    onClick={() => router.push('/runs')}
                    className="cyber-btn cyber-btn-ghost"
                    style={{ fontSize: 11, padding: '2px 8px', color: '#7d8da0' }}
                  >
                    View all →
                  </button>
                </div>
              </div>

              {runs.slice(0, 6).length === 0 ? (
                <div style={{ fontSize: 12, color: '#4a5a70', textAlign: 'center', padding: '20px 0' }}>
                  No executions recorded yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {runs.slice(0, 6).map((r) => {
                    const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.queued;
                    return (
                      <div
                        key={r.id}
                        onClick={() => router.push(`/runs/${r.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          transition: 'background 150ms ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#0E131A'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: sc.color, flexShrink: 0,
                          boxShadow: r.status === 'running' ? `0 0 8px ${sc.color}` : 'none',
                        }} className={r.status === 'running' ? 'pulse-soft' : ''} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#d1dae6', fontWeight: 500 }}>
                            RUN_{r.id.slice(0, 8)}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4a5a70' }}>
                            {r.trigger_type} · {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: sc.color, fontWeight: 600 }}>
                          {sc.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Applications Queue */}
            <div style={{
              background: '#0B0F15', border: '1px solid #151D2B', borderRadius: 10,
              padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={14} color="#a855f7" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f4f8' }}>
                    Applications
                  </span>
                </div>
                <button
                  onClick={() => router.push('/applications')}
                  className="cyber-btn cyber-btn-ghost"
                  style={{ fontSize: 11, padding: '2px 8px', color: '#7d8da0' }}
                >
                  View all →
                </button>
              </div>

              {applications.slice(0, 5).length === 0 ? (
                <div style={{ fontSize: 12, color: '#4a5a70', textAlign: 'center', padding: '16px 0' }}>
                  No applications queued
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {applications.slice(0, 5).map((app) => {
                    const asc = APP_STATUS_CONFIG[app.status] || { color: '#7d8da0', label: app.status };
                    return (
                      <div key={app.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 8,
                        transition: 'background 150ms ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#0E131A'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#a855f7',
                        }}>
                          {app.applicant_name.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#d1dae6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {app.applicant_name}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4a5a70' }}>
                            {app.id}
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: asc.color, fontWeight: 600 }}>
                          {asc.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Navigation */}
            <div style={{
              background: '#0B0F15', border: '1px solid #151D2B', borderRadius: 10,
              padding: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#4a5a70', marginBottom: 10, letterSpacing: '0.04em' }}>
                QUICK NAVIGATION
              </div>
              {[
                { label: 'Submit Application', path: '/apply', icon: FileText },
                { label: 'All Applications', path: '/applications', icon: Users },
                { label: 'Execution Monitor', path: '/runs', icon: Activity },
                { label: 'Notifications', path: '/notifications', icon: Bell },
              ].map((l) => (
                <button
                  key={l.path}
                  onClick={() => router.push(l.path)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 6, marginBottom: 2,
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', transition: 'all 150ms ease',
                    fontSize: 12, fontWeight: 500, color: '#7d8da0',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#0E131A';
                    e.currentTarget.style.color = '#d1dae6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#7d8da0';
                  }}
                >
                  <l.icon size={13} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{l.label}</span>
                  <ChevronRight size={12} style={{ opacity: 0.4 }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── New Pipeline Modal ──────────────────────────── */}
      {showNewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)',
        }}>
          <div className="fade-in" style={{
            background: '#0B0F15',
            border: '1px solid #1a2435',
            borderRadius: 12,
            padding: 28, width: 440,
            boxShadow: '0 24px 64px -16px rgba(0,0,0,0.8)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', marginBottom: 4 }}>
              Create New Pipeline
            </div>
            <div style={{ fontSize: 12, color: '#7d8da0', marginBottom: 22 }}>
              Initialize a new workflow orchestration pipeline
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#7d8da0', display: 'block', marginBottom: 6 }}>
                Pipeline Name
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Admission Verification"
                autoFocus
                className="cyber-input"
                style={{ width: '100%', padding: '10px 12px' }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#7d8da0', display: 'block', marginBottom: 6 }}>
                Description
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What does this pipeline do?"
                rows={3}
                className="cyber-input"
                style={{ width: '100%', padding: '10px 12px', resize: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowNewModal(false)}
                className="cyber-btn cyber-btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="cyber-btn cyber-btn-primary"
                style={{ flex: 2 }}
              >
                {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                Create Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

