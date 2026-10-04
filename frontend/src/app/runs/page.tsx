'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Zap, Activity, CheckCircle, AlertTriangle, Clock, Loader2, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { useRequireRole } from '@/lib/auth-guard';

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  completed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  running: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  queued: { color: '#8b91a8', bg: 'rgba(139,145,168,0.1)' },
  partially_failed: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};

export default function RunsPage() {
  const { allowed } = useRequireRole(['admin', 'reviewer']);
  const router = useRouter();
  const [runs, setRuns] = useState<{
    id: string; workflow_id: string; status: string; trigger_type: string;
    created_at: string; finished_at?: string; summary?: string;
    node_runs: {status: string}[];
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (allowed) api.runs.list().then(setRuns).finally(() => setLoading(false));
  }, [allowed]);

  if (!allowed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0b0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0f', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#0f1117', borderBottom: '1px solid #1f2335', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, background: 'transparent', border: '1px solid #1f2335', color: '#8b91a8', fontSize: 12, cursor: 'pointer' }}>
          <ChevronLeft size={13} /> Dashboard
        </button>
        <Zap size={16} color="#6366f1" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0' }}>Execution Monitor</span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Activity size={16} color="#3b82f6" />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#e8eaf0' }}>All Workflow Runs</span>
          <span style={{ fontSize: 12, color: '#4a5068' }}>({runs.length} total)</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#4a5068' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : runs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#4a5068', fontSize: 13 }}>
            No runs yet. Publish a workflow and submit an application.
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
                    width: 36, height: 36, borderRadius: 10,
                    background: ss.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {r.status === 'completed' ? <CheckCircle size={16} color={ss.color} /> :
                     r.status === 'failed' ? <AlertTriangle size={16} color={ss.color} /> :
                     r.status === 'running' ? <Loader2 size={16} color={ss.color} style={{ animation: 'spin 1s linear infinite' }} /> :
                     <Clock size={16} color={ss.color} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0', marginBottom: 3, fontFamily: 'monospace' }}>
                      {r.id.slice(0, 24)}...
                    </div>
                    <div style={{ fontSize: 11, color: '#4a5068' }}>
                      {r.trigger_type} · {new Date(r.created_at).toLocaleString()}
                    </div>
                    {r.summary && (
                      <div style={{ fontSize: 11, color: '#8b91a8', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.summary}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {total > 0 && (
                      <div style={{ fontSize: 11, color: '#4a5068' }}>{succeeded}/{total} nodes</div>
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                      background: ss.bg, color: ss.color,
                    }}>
                      {r.status}
                    </span>
                    <ExternalLink size={12} color="#4a5068" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
