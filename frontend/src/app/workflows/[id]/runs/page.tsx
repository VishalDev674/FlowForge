'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Zap, Activity, CheckCircle, AlertTriangle, Clock, Loader2, ExternalLink, GitBranch, Terminal } from 'lucide-react';
import api from '@/lib/api';
import { useRequireRole } from '@/lib/auth-guard';

const STATUS_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  completed: { color: '#00ff66', bg: 'rgba(0, 255, 102, 0.08)', border: 'rgba(0, 255, 102, 0.3)', label: 'COMPLETED' },
  failed: { color: '#ff3366', bg: 'rgba(255, 51, 102, 0.08)', border: 'rgba(255, 51, 102, 0.3)', label: 'FAILED' },
  running: { color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.08)', border: 'rgba(0, 240, 255, 0.3)', label: 'RUNNING' },
  queued: { color: '#8b9bb4', bg: 'rgba(139, 155, 180, 0.08)', border: '#253246', label: 'QUEUED' },
  partially_failed: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)', label: 'PARTIAL' },
  cancelled: { color: '#4e5d78', bg: 'rgba(78, 93, 120, 0.08)', border: '#1e2636', label: 'CANCELLED' },
};

export default function WorkflowRunsPage() {
  const { allowed } = useRequireRole(['admin', 'reviewer']);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<{ name: string } | null>(null);
  const [runs, setRuns] = useState<{
    id: string; status: string; trigger_type: string;
    created_at: string; finished_at?: string; summary?: string;
    node_runs: { status: string }[];
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) return;
    Promise.all([
      api.workflows.get(id),
      api.workflows.runs(id),
    ]).then(([wf, rs]) => {
      setWorkflow(wf);
      setRuns(rs);
    }).finally(() => setLoading(false));
  }, [id, allowed]);

  if (!allowed) {
    return (
      <div style={{ minHeight: '100vh', background: '#040507', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Loader2 size={32} color="#00ff66" className="spin" />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#00ff66', letterSpacing: '0.1em' }}>
          VERIFYING_CREDENTIALS...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#040507', position: 'relative', zIndex: 2 }}>
      {/* Sci-Fi Navbar */}
      <div style={{
        background: 'rgba(7, 9, 14, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #161f2e',
        padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12,
        height: 60, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          className="cyber-btn cyber-btn-secondary"
          style={{ padding: '6px 12px', fontSize: 11 }}
        >
          <ChevronLeft size={13} />
          <span>[ RETURN_DASHBOARD ]</span>
        </button>

        <button
          onClick={() => router.push(`/editor/${id}`)}
          className="cyber-btn cyber-btn-secondary"
          style={{ padding: '6px 12px', fontSize: 11, color: '#00ff66', borderColor: 'rgba(0,255,102,0.3)' }}
        >
          <GitBranch size={13} />
          <span>[ OPEN_GRAPH_EDITOR ]</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={15} color="#00ff66" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
            PIPELINE_TELEMETRY // {workflow?.name || id.slice(0, 8)}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} color="#00f0ff" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
              01 // EXECUTION_HISTORY_CYCLE
            </span>
            <span className="cyber-badge cyber-badge-cyan" style={{ fontSize: 9 }}>
              CYCLES: {runs.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#4e5d78', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <Loader2 size={24} color="#00ff66" className="spin" style={{ margin: '0 auto 8px' }} />
            QUERYING_PIPELINE_HISTORY...
          </div>
        ) : runs.length === 0 ? (
          <div className="cyber-card" style={{ textAlign: 'center', padding: 48, borderStyle: 'dashed' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#8b9bb4', marginBottom: 12 }}>
              // NO_EXECUTION_HISTORY_FOR_THIS_PIPELINE
            </div>
            <button
              onClick={() => router.push(`/editor/${id}`)}
              className="cyber-btn cyber-btn-primary"
            >
              [ OPEN_CANVAS_&_TRIGGER_TEST ]
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {runs.map((r) => {
              const ss = STATUS_STYLES[r.status] || STATUS_STYLES.queued;
              const succeeded = r.node_runs?.filter((n) => n.status === 'succeeded').length || 0;
              const total = r.node_runs?.length || 0;

              return (
                <div
                  key={r.id}
                  onClick={() => router.push(`/runs/${r.id}`)}
                  className="cyber-card"
                  style={{
                    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', background: '#0a0d14',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 6,
                    background: ss.bg, border: `1px solid ${ss.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {r.status === 'completed' ? <CheckCircle size={16} color={ss.color} /> :
                     r.status === 'failed' ? <AlertTriangle size={16} color={ss.color} /> :
                     r.status === 'running' ? <Loader2 size={16} color={ss.color} className="spin" /> :
                     <Clock size={16} color={ss.color} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>
                      RUN_{r.id}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', display: 'flex', gap: 16, fontSize: 10, color: '#6b7c96' }}>
                      <span>TRIGGER // <strong style={{ color: '#00f0ff' }}>{r.trigger_type.toUpperCase()}</strong></span>
                      <span>NODES // <strong style={{ color: '#00ff66' }}>{succeeded}/{total}</strong></span>
                    </div>
                  </div>

                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800,
                    padding: '3px 8px', borderRadius: 4,
                    background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color,
                  }}>
                    {ss.label}
                  </span>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4e5d78' }}>
                    {new Date(r.created_at).toLocaleTimeString()}
                  </div>

                  <ExternalLink size={13} color="#4e5d78" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
