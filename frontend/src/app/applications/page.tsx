'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Zap, Users, CheckCircle, AlertTriangle, Clock, ExternalLink, Loader2 } from 'lucide-react';
import api from '@/lib/api';

const APP_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  received: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Received' },
  validating: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Validating' },
  needs_correction: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Needs Correction' },
  under_review: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Under Review' },
  accepted: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Accepted' },
  rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Rejected' },
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<{
    id: string; applicant_name: string; email: string; phone?: string;
    program?: string; percentage?: string; status: string;
    assigned_reviewer_id?: string; eligibility_score?: string;
    category?: string; created_at: string;
    documents_json?: Record<string, boolean>;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.applications.list().then(setApps).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0f', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#0f1117', borderBottom: '1px solid #1f2335', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, background: 'transparent', border: '1px solid #1f2335', color: '#8b91a8', fontSize: 12, cursor: 'pointer' }}>
          <ChevronLeft size={13} /> Dashboard
        </button>
        <Zap size={16} color="#6366f1" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0' }}>Applications</span>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => router.push('/apply')}
            style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            + Submit Application
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Users size={15} color="#8b5cf6" />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf0' }}>All Applications</span>
          <span style={{ fontSize: 12, color: '#4a5068' }}>({apps.length} total)</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#4a5068' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, color: '#8b91a8', marginBottom: 8 }}>No applications yet</div>
            <button onClick={() => router.push('/apply')} style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
              Submit the first application →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {apps.map((app) => {
              const asc = APP_STATUS[app.status] || { color: '#8b91a8', bg: 'rgba(139,145,168,0.1)', label: app.status };
              const docCount = Object.values(app.documents_json || {}).filter(Boolean).length;
              const totalDocs = Object.keys(app.documents_json || {}).length;
              return (
                <div
                  key={app.id}
                  style={{
                    background: '#0f1117', border: '1px solid #1f2335',
                    borderRadius: 12, padding: '16px 18px',
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: 16, transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = '#2a2f4a'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = '#1f2335'}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'rgba(139,92,246,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: 16, fontWeight: 700, color: '#8b5cf6',
                    }}>
                      {app.applicant_name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf0' }}>{app.applicant_name}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                          background: asc.bg, color: asc.color,
                        }}>
                          {asc.label}
                        </span>
                        {app.category && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(99,102,246,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,246,0.2)' }}>
                            {app.category}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#4a5068' }}>
                        <span>📧 {app.email}</span>
                        {app.program && <span>📚 {app.program}</span>}
                        {app.percentage && <span>📊 {app.percentage}%</span>}
                        {app.eligibility_score && <span style={{ color: '#10b981' }}>⭐ Score: {app.eligibility_score}</span>}
                        <span style={{ color: docCount === totalDocs ? '#10b981' : '#f59e0b' }}>
                          📎 {docCount}/{totalDocs} docs
                        </span>
                      </div>
                      {app.assigned_reviewer_id && (
                        <div style={{ fontSize: 11, color: '#6366f1', marginTop: 4 }}>
                          👤 Assigned to: {app.assigned_reviewer_id}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#4a5068', marginTop: 4, fontFamily: 'monospace' }}>
                        ID: {app.id}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ fontSize: 10, color: '#4a5068' }}>
                      {new Date(app.created_at).toLocaleString()}
                    </div>
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
