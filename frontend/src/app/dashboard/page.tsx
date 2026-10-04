'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Plus, Play, Upload, Clock, CheckCircle, AlertTriangle,
  Trash2, FileText, ChevronRight, Users, BarChart3, Bell,
  Loader2, GitBranch, Layers, ExternalLink, Activity
} from 'lucide-react';
import api from '@/lib/api';

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
  program: string;
  status: string;
  created_at: string;
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

const APP_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  received: { color: '#3b82f6', label: 'Received' },
  validating: { color: '#f59e0b', label: 'Validating' },
  needs_correction: { color: '#ef4444', label: 'Needs Correction' },
  under_review: { color: '#8b5cf6', label: 'Under Review' },
  accepted: { color: '#10b981', label: 'Accepted' },
  rejected: { color: '#ef4444', label: 'Rejected' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [templates, setTemplates] = useState<{key: string; name: string; description: string; category: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [wfs, rs, apps, tmpl] = await Promise.all([
        api.workflows.list(),
        api.runs.list(),
        api.applications.list(),
        api.workflows.templates(),
      ]);
      setWorkflows(wfs);
      setRuns(rs);
      setApplications(apps);
      setTemplates(tmpl);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
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

  const stats = {
    total: workflows.length,
    published: workflows.filter((w) => w.status === 'published').length,
    runs: runs.length,
    success: runs.filter((r) => r.status === 'completed').length,
    apps: applications.length,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0f', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
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
        </div>
      </header>

      <div style={{ padding: '28px 24px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Workflows', value: stats.total, icon: GitBranch, color: '#6366f1' },
            { label: 'Published', value: stats.published, icon: CheckCircle, color: '#10b981' },
            { label: 'Total Runs', value: stats.runs, icon: Activity, color: '#3b82f6' },
            { label: 'Successful', value: stats.success, icon: BarChart3, color: '#10b981' },
            { label: 'Applications', value: stats.apps, icon: Users, color: '#8b5cf6' },
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
                <button onClick={loadAll} style={{
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
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf0' }}>Applications</span>
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
                          flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#8b5cf6',
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
