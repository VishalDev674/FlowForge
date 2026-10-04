'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle, AlertTriangle, Clock, Loader2, ChevronLeft, Zap,
  Activity, RefreshCw, ChevronDown, ChevronUp
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

const STATUS_STYLES: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  pending: { color: '#4a5068', bg: 'rgba(74,80,104,0.15)', icon: Clock, label: 'Pending' },
  running: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: Loader2, label: 'Running' },
  succeeded: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle, label: 'Succeeded' },
  completed: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle, label: 'Completed' },
  failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: AlertTriangle, label: 'Failed' },
  skipped: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: Clock, label: 'Skipped' },
  retrying: { color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: RefreshCw, label: 'Retrying' },
  waiting: { color: '#f97316', bg: 'rgba(249,115,22,0.15)', icon: Clock, label: 'Waiting' },
  partially_failed: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: AlertTriangle, label: 'Partial' },
  queued: { color: '#8b91a8', bg: 'rgba(139,145,168,0.15)', icon: Clock, label: 'Queued' },
};

function NodeRunCard({ nr, onRetry }: { nr: NodeRun; onRetry: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const ss = STATUS_STYLES[nr.status] || STATUS_STYLES.pending;
  const StatusIcon = ss.icon;

  const duration = nr.started_at && nr.finished_at
    ? ((new Date(nr.finished_at).getTime() - new Date(nr.started_at).getTime()) / 1000).toFixed(1) + 's'
    : nr.started_at ? '...' : null;

  const handleRetry = async () => {
    setRetrying(true);
    await onRetry(nr.id);
    setRetrying(false);
  };

  return (
    <div style={{
      background: '#0f1117', border: `1px solid ${nr.status !== 'pending' ? ss.color + '40' : '#1f2335'}`,
      borderRadius: 10, overflow: 'hidden',
      transition: 'all 0.3s ease',
      boxShadow: nr.status === 'running' ? `0 0 12px ${ss.color}25` : 'none',
    }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: ss.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <StatusIcon
            size={15} color={ss.color}
            style={nr.status === 'running' || nr.status === 'retrying'
              ? { animation: 'spin 1s linear infinite' } : {}}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0' }}>{nr.node_label || nr.node_type}</div>
          <div style={{ fontSize: 11, color: '#4a5068', fontFamily: 'monospace' }}>
            {nr.node_type} · {nr.node_id.slice(0, 12)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {duration && (
            <span style={{ fontSize: 11, color: '#4a5068' }}>{duration}</span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
            background: ss.bg, color: ss.color,
          }}>
            {ss.label}
          </span>
          {nr.status === 'failed' && nr.retry_count < 3 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              disabled={retrying}
              style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
                color: '#a855f7', cursor: 'pointer',
              }}
            >
              {retrying ? '...' : `↻ Retry (${nr.retry_count}/3)`}
            </button>
          )}
          {expanded ? <ChevronUp size={13} color="#4a5068" /> : <ChevronDown size={13} color="#4a5068" />}
        </div>
      </div>

      {/* Error */}
      {nr.error_message && (
        <div style={{ padding: '6px 14px 10px', fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.05)' }}>
          ⚠ {nr.error_message}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: '1px solid #1f2335', padding: '12px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4a5068', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Input
              </div>
              <pre style={{
                fontSize: 10, color: '#8b91a8', background: '#0a0b0f',
                border: '1px solid #1f2335', borderRadius: 6, padding: '8px 10px',
                overflow: 'auto', maxHeight: 120, margin: 0,
                fontFamily: 'monospace', lineHeight: 1.4, whiteSpace: 'pre-wrap',
              }}>
                {JSON.stringify(nr.input_json, null, 2)}
              </pre>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4a5068', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Output
              </div>
              <pre style={{
                fontSize: 10, color: nr.status === 'failed' ? '#ef444480' : '#10b98180',
                background: '#0a0b0f',
                border: `1px solid ${nr.status === 'failed' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                borderRadius: 6, padding: '8px 10px',
                overflow: 'auto', maxHeight: 120, margin: 0,
                fontFamily: 'monospace', lineHeight: 1.4, whiteSpace: 'pre-wrap',
              }}>
                {JSON.stringify(nr.output_json, null, 2) || '{}'}
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

    // Connect WebSocket for live updates
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
            loadRun(); // Refresh full data
          }
        }
      } catch {}
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [id, loadRun]);

  const handleRetry = async (nodeRunId: string) => {
    await api.runs.retryNode(nodeRunId);
    setTimeout(loadRun, 2000);
  };

  if (loading || !run) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0b0f', color: '#8b91a8', flexDirection: 'column', gap: 12 }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 14 }}>Loading execution details...</div>
      </div>
    );
  }

  const runStatus = STATUS_STYLES[run.status] || STATUS_STYLES.queued;
  const RunStatusIcon = runStatus.icon;

  const succeeded = run.node_runs.filter((n) => n.status === 'succeeded').length;
  const failed = run.node_runs.filter((n) => n.status === 'failed').length;
  const skipped = run.node_runs.filter((n) => n.status === 'skipped').length;
  const duration = run.started_at && run.finished_at
    ? ((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(1) + 's'
    : 'Running...';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0f', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0f1117', borderBottom: '1px solid #1f2335', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, background: 'transparent', border: '1px solid #1f2335', color: '#8b91a8', fontSize: 12, cursor: 'pointer' }}
        >
          <ChevronLeft size={13} /> Dashboard
        </button>
        <Zap size={16} color="#6366f1" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0' }}>Execution Monitor</span>
        <span style={{ fontSize: 11, color: '#4a5068', fontFamily: 'monospace' }}>{run.id.slice(0, 16)}...</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={loadRun} style={{ padding: '5px 10px', borderRadius: 7, background: '#13151d', border: '1px solid #1f2335', color: '#8b91a8', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {/* Run Summary */}
        <div style={{
          background: '#0f1117', border: `1px solid ${runStatus.color}40`,
          borderRadius: 14, padding: '20px 22px', marginBottom: 22,
          boxShadow: ['running', 'queued'].includes(run.status) ? `0 0 20px ${runStatus.color}12` : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: runStatus.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RunStatusIcon size={20} color={runStatus.color} style={['running', 'queued'].includes(run.status) ? { animation: 'spin 1s linear infinite' } : {}} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: runStatus.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Workflow Run
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#e8eaf0' }}>
                {runStatus.label}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#4a5068' }}>Duration</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e8eaf0' }}>{duration}</div>
            </div>
          </div>

          {/* Node stats */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Succeeded', count: succeeded, color: '#10b981' },
              { label: 'Failed', count: failed, color: '#ef4444' },
              { label: 'Skipped', count: skipped, color: '#f59e0b' },
              { label: 'Total', count: run.node_runs.length, color: '#8b91a8' },
            ].map((s) => (
              <div key={s.label} style={{
                flex: 1, padding: '10px 14px', borderRadius: 8,
                background: '#13151d', border: '1px solid #1f2335',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 10, color: '#4a5068', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {run.summary && (
            <div style={{
              background: '#13151d', border: '1px solid #1f2335',
              borderRadius: 8, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4a5068', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Execution Summary
              </div>
              <div style={{ fontSize: 13, color: '#8b91a8', lineHeight: 1.6 }}>
                {run.summary}
              </div>
            </div>
          )}
        </div>

        {/* Node Timeline */}
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={14} color="#6366f1" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf0' }}>Node Execution Timeline</span>
          {['running', 'queued'].includes(run.status) && (
            <span style={{ fontSize: 11, color: '#3b82f6', marginLeft: 4 }}>● Live</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {run.node_runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#4a5068', fontSize: 13 }}>
              Waiting for execution to begin...
            </div>
          ) : (
            run.node_runs.map((nr) => (
              <NodeRunCard key={nr.id} nr={nr} onRetry={handleRetry} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
