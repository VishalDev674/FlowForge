'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle, AlertTriangle, Clock, Loader2, ChevronLeft, Zap,
  Activity, RefreshCw, ChevronDown, ChevronUp, Terminal, Cpu, HardDrive
} from 'lucide-react';
import api, { WS_BASE } from '@/lib/api';
import { useRequireRole } from '@/lib/auth-guard';

interface NodeRun {
  id: string;
  node_id: string;
  node_type: string;
  node_label: string;
  status: string;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown>;
  error_message?: string;
  retry_count: number;
  started_at?: string;
  finished_at?: string;
  created_at: string;
}

interface RunData {
  id: string;
  workflow_id: string;
  status: string;
  trigger_type: string;
  summary?: string;
  input_json: Record<string, unknown>;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  node_runs: NodeRun[];
}

const STATUS_STYLES: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  pending: { color: '#4e5d78', bg: 'rgba(78,93,120,0.1)', border: '#1e2636', icon: Clock, label: 'PENDING' },
  running: { color: '#00f0ff', bg: 'rgba(0,240,255,0.1)', border: 'rgba(0,240,255,0.3)', icon: Loader2, label: 'RUNNING' },
  succeeded: { color: '#00ff66', bg: 'rgba(0,255,102,0.1)', border: 'rgba(0,255,102,0.3)', icon: CheckCircle, label: 'SUCCEEDED' },
  completed: { color: '#00ff66', bg: 'rgba(0,255,102,0.1)', border: 'rgba(0,255,102,0.3)', icon: CheckCircle, label: 'COMPLETED' },
  failed: { color: '#ff3366', bg: 'rgba(255,51,102,0.1)', border: 'rgba(255,51,102,0.3)', icon: AlertTriangle, label: 'FAILED' },
  skipped: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: Clock, label: 'SKIPPED' },
  retrying: { color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)', icon: RefreshCw, label: 'RETRYING' },
  waiting: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: Clock, label: 'WAITING' },
  partially_failed: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: AlertTriangle, label: 'PARTIAL' },
  queued: { color: '#8b9bb4', bg: 'rgba(139,155,180,0.1)', border: '#253246', icon: Clock, label: 'QUEUED' },
};

function NodeRunCard({ nr, onRetry }: { nr: NodeRun; onRetry: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const ss = STATUS_STYLES[nr.status] || STATUS_STYLES.pending;
  const StatusIcon = ss.icon;

  const duration = nr.started_at && nr.finished_at
    ? ((new Date(nr.finished_at).getTime() - new Date(nr.started_at).getTime()) / 1000).toFixed(2) + 's'
    : nr.started_at ? 'RUNNING...' : null;

  const handleRetry = async () => {
    setRetrying(true);
    await onRetry(nr.id);
    setRetrying(false);
  };

  return (
    <div className="cyber-card" style={{
      background: '#090c12',
      border: `1px solid ${nr.status !== 'pending' ? ss.border : '#161f2e'}`,
      overflow: 'hidden',
      boxShadow: nr.status === 'running' ? '0 0 12px rgba(0, 240, 255, 0.2)' : 'none',
    }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 6,
          background: ss.bg, border: `1px solid ${ss.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <StatusIcon
            size={14} color={ss.color}
            className={nr.status === 'running' || nr.status === 'retrying' ? 'spin' : ''}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
            {nr.node_label || nr.node_type}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4e5d78' }}>
            NODE_TYPE // {nr.node_type} · ID // {nr.node_id.slice(0, 12)}
          </div>
        </div>

        {duration && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b7c96' }}>
            {duration}
          </span>
        )}

        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800,
          padding: '2px 7px', borderRadius: 4,
          background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color,
        }}>
          {ss.label}
        </span>

        {nr.status === 'failed' && (
          <button
            onClick={(e) => { e.stopPropagation(); handleRetry(); }}
            disabled={retrying}
            className="cyber-btn cyber-btn-secondary"
            style={{ padding: '3px 8px', fontSize: 10 }}
          >
            {retrying ? 'RETRYING...' : '[ RETRY_NODE ]'}
          </button>
        )}

        {expanded ? <ChevronUp size={14} color="#6b7c96" /> : <ChevronDown size={14} color="#6b7c96" />}
      </div>

      {expanded && (
        <div style={{
          borderTop: '1px solid #141c2a', padding: '14px 16px', background: '#06080d',
          fontFamily: 'var(--font-mono)', fontSize: 11,
        }}>
          {nr.error_message && (
            <div style={{
              background: 'rgba(255, 51, 102, 0.1)', border: '1px solid #ff3366',
              borderRadius: 4, padding: '8px 12px', color: '#ff3366', marginBottom: 12,
            }}>
              ERR // {nr.error_message}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ color: '#00f0ff', marginBottom: 4, fontWeight: 700 }}>&gt; INPUT_PAYLOAD:</div>
              <pre style={{
                background: '#040507', border: '1px solid #141c2a', borderRadius: 4,
                padding: '8px 10px', fontSize: 10, color: '#8b9bb4', overflowX: 'auto', maxHeight: 160,
              }}>
                {JSON.stringify(nr.input_json || {}, null, 2)}
              </pre>
            </div>
            <div>
              <div style={{ color: '#00ff66', marginBottom: 4, fontWeight: 700 }}>&gt; OUTPUT_TELEMETRY:</div>
              <pre style={{
                background: '#040507', border: '1px solid #141c2a', borderRadius: 4,
                padding: '8px 10px', fontSize: 10, color: '#8b9bb4', overflowX: 'auto', maxHeight: 160,
              }}>
                {JSON.stringify(nr.output_json || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RunDetailPage() {
  const { allowed } = useRequireRole(['admin', 'reviewer']);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  const loadRun = useCallback(async () => {
    const data = await api.runs.get(id);
    setRun(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!allowed) return;
    loadRun();

    const ws = new WebSocket(`${WS_BASE}/ws/runs/${id}`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'node_status') {
          setRun((prev) => {
            if (!prev) return prev;
            const updated = prev.node_runs.map((nr) =>
              nr.node_id === msg.node_id
                ? { ...nr, status: msg.status, output_json: msg.output || nr.output_json, error_message: msg.error || nr.error_message }
                : nr
            );
            return { ...prev, node_runs: updated };
          });
        }
        if (msg.type === 'run_status') {
          setRun((prev) => prev ? { ...prev, status: msg.status, summary: msg.summary || prev.summary } : prev);
          if (['completed', 'failed', 'partially_failed'].includes(msg.status)) {
            loadRun();
          }
        }
      } catch {}
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [id, loadRun, allowed]);

  const handleRetry = async (nodeRunId: string) => {
    await api.runs.retryNode(nodeRunId);
    setTimeout(loadRun, 2000);
  };

  if (!allowed || loading || !run) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040507', color: '#00ff66', flexDirection: 'column', gap: 12 }}>
        <Loader2 size={32} color="#00ff66" className="spin" />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}>CONNECTING_TELEMETRY_STREAM...</div>
      </div>
    );
  }

  const runStatus = STATUS_STYLES[run.status] || STATUS_STYLES.queued;
  const RunStatusIcon = runStatus.icon;

  const succeeded = run.node_runs.filter((n) => n.status === 'succeeded').length;
  const failed = run.node_runs.filter((n) => n.status === 'failed').length;
  const skipped = run.node_runs.filter((n) => n.status === 'skipped').length;
  const duration = run.started_at && run.finished_at
    ? ((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(2) + 's'
    : 'RUNNING...';

  return (
    <div style={{ minHeight: '100vh', background: '#040507', position: 'relative', zIndex: 2 }}>
      {/* Sci-Fi Navbar */}
      <div style={{
        background: 'rgba(7, 9, 14, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #161f2e',
        padding: '0 24px', display: 'flex', alignItems: 'center', gap: 14,
        height: 60, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          className="cyber-btn cyber-btn-secondary"
          style={{ padding: '6px 12px', fontSize: 11 }}
        >
          <ChevronLeft size={13} />
          <span>[ RETURN_TO_DASHBOARD ]</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={15} color="#00ff66" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
            TELEMETRY_CONSOLE // RUN_{run.id.slice(0, 16)}
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={loadRun}
            className="cyber-btn cyber-btn-secondary"
            style={{ padding: '6px 12px', fontSize: 11 }}
          >
            <RefreshCw size={11} />
            <span>[ SYNC_CYCLE ]</span>
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px' }}>
        {/* Run Telemetry Summary Card */}
        <div className="cyber-card cyber-glow-border" style={{
          padding: 22, marginBottom: 24, background: '#0a0d14',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 6,
              background: runStatus.bg, border: `1px solid ${runStatus.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RunStatusIcon size={18} color={runStatus.color} className={['running', 'queued'].includes(run.status) ? 'spin' : ''} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                DAG_RUN_{run.id}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6b7c96' }}>
                TRIGGER // {run.trigger_type.toUpperCase()} · DURATION // {duration}
              </div>
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800,
                padding: '4px 10px', borderRadius: 4,
                background: runStatus.bg, border: `1px solid ${runStatus.border}`, color: runStatus.color,
              }}>
                STATUS // {runStatus.label}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'NODES_TOTAL', value: run.node_runs.length, color: '#f8fafc' },
              { label: 'SUCCEEDED', value: succeeded, color: '#00ff66' },
              { label: 'FAILED', value: failed, color: '#ff3366' },
              { label: 'SKIPPED', value: skipped, color: '#f59e0b' },
            ].map((m) => (
              <div key={m.label} style={{ background: '#07090e', border: '1px solid #141c2a', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4e5d78', marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Node Runs Telemetry Stream */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: '#f8fafc', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={14} color="#00ff66" />
            02 // NODE_EXECUTION_STREAM ({run.node_runs.length} NODES)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {run.node_runs.map((nr) => (
              <NodeRunCard key={nr.id} nr={nr} onRetry={handleRetry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
