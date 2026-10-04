'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Zap, Users, CheckCircle, AlertTriangle, Clock,
  ExternalLink, Loader2, LogIn, LogOut, Shield, User as UserIcon,
  Terminal, Cpu, FileText, CheckCircle2
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const APP_STATUS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  received: { color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.08)', border: 'rgba(0, 240, 255, 0.3)', label: 'RECEIVED' },
  validating: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)', label: 'VALIDATING' },
  needs_correction: { color: '#ff3366', bg: 'rgba(255, 51, 102, 0.08)', border: 'rgba(255, 51, 102, 0.3)', label: 'CORRECTION' },
  under_review: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.3)', label: 'IN_REVIEW' },
  accepted: { color: '#00ff66', bg: 'rgba(0, 255, 102, 0.1)', border: 'rgba(0, 255, 102, 0.35)', label: 'ACCEPTED' },
  rejected: { color: '#ff3366', bg: 'rgba(255, 51, 102, 0.1)', border: 'rgba(255, 51, 102, 0.35)', label: 'REJECTED' },
};

export default function ApplicationsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
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
            INTAKE_DATABASE // APPLICANT_LEDGER
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => router.push('/apply')}
            className="cyber-btn cyber-btn-primary"
            style={{ padding: '6px 14px', fontSize: 11 }}
          >
            <FileText size={12} />
            <span>[ + TRANSMIT_PAYLOAD ]</span>
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid #161f2e' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 6,
                background: '#090d14', border: '1px solid #1a2436',
              }}>
                {user.role === 'admin' ? <Shield size={12} color="#00ff66" /> : <UserIcon size={12} color="#00ff66" />}
                <span style={{ fontSize: 11, fontWeight: 600, color: '#e6edf3' }}>
                  {user.name}
                </span>
                <span className="cyber-badge cyber-badge-green" style={{ fontSize: 8, padding: '1px 4px' }}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={() => { logout(); router.push('/login'); }}
                title="TERMINATE_SESSION"
                className="cyber-btn cyber-btn-ghost"
                style={{ padding: '6px 8px' }}
              >
                <LogOut size={13} color="#ff3366" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/login?returnUrl=/applications')}
              className="cyber-btn cyber-btn-secondary"
              style={{ padding: '6px 12px', fontSize: 11 }}
            >
              <LogIn size={12} />
              <span>[ AUTHENTICATE ]</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={15} color="#00ff66" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
              01 // APPLICANT_INTAKE_LEDGER
            </span>
            <span className="cyber-badge cyber-badge-green" style={{ fontSize: 10 }}>
              TOTAL_RECORDS: {apps.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#4e5d78', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <Loader2 size={24} color="#00ff66" className="spin" style={{ margin: '0 auto 8px' }} />
            QUERYING_APPLICANT_DATABASE...
          </div>
        ) : apps.length === 0 ? (
          <div className="cyber-card" style={{ textAlign: 'center', padding: 48, borderStyle: 'dashed' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#8b9bb4', marginBottom: 12 }}>
              // NO_APPLICANT_PACKETS_RECORDED
            </div>
            <button
              onClick={() => router.push('/apply')}
              className="cyber-btn cyber-btn-primary"
            >
              [ + TRANSMIT_FIRST_PAYLOAD ]
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {apps.map((app) => {
              const asc = APP_STATUS[app.status] || { color: '#8b9bb4', bg: 'rgba(139,155,180,0.08)', border: '#253246', label: app.status };
              const docCount = Object.values(app.documents_json || {}).filter(Boolean).length;
              const totalDocs = Object.keys(app.documents_json || {}).length;

              return (
                <div
                  key={app.id}
                  className="cyber-card"
                  style={{
                    padding: '16px 18px',
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: 16, background: '#0a0d14',
                  }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 6,
                      background: 'rgba(0, 255, 102, 0.08)', border: '1px solid rgba(0, 255, 102, 0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: '#00ff66',
                    }}>
                      {app.applicant_name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{app.applicant_name}</span>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                          background: asc.bg, border: `1px solid ${asc.border}`, color: asc.color,
                        }}>
                          {asc.label}
                        </span>
                        {app.category && (
                          <span className="cyber-badge cyber-badge-cyan" style={{ fontSize: 9 }}>
                            [{app.category}]
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', display: 'flex', gap: 16, fontSize: 11, color: '#6b7c96', flexWrap: 'wrap' }}>
                        <span>ENDPOINT: <strong style={{ color: '#e6edf3' }}>{app.email}</strong></span>
                        {app.program && <span>PROGRAM: <strong style={{ color: '#00f0ff' }}>{app.program}</strong></span>}
                        {app.percentage && <span>METRIC: <strong style={{ color: '#e6edf3' }}>{app.percentage}%</strong></span>}
                        {app.eligibility_score && <span style={{ color: '#00ff66' }}>SCORE: {app.eligibility_score}</span>}
                        <span style={{ color: docCount === totalDocs ? '#00ff66' : '#f59e0b' }}>
                          ATTACHMENTS: {docCount}/{totalDocs}
                        </span>
                      </div>
                      {app.assigned_reviewer_id && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#a855f7', marginTop: 4 }}>
                          &gt; SUPERVISOR_ASSIGNMENT // {app.assigned_reviewer_id}
                        </div>
                      )}
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4e5d78', marginTop: 4 }}>
                        PACKET_ID // {app.id}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4e5d78' }}>
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
