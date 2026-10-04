'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Zap, Bell, Mail, CheckCircle, Loader2, Radio } from 'lucide-react';
import api from '@/lib/api';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<{
    id: string; recipient: string; channel: string; subject?: string;
    message?: string; status: string; created_at: string; application_id?: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.notifications.list().then(setNotifs).finally(() => setLoading(false));
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
            DISPATCH_LOGS // COMMUNICATIONS_TERMINAL
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={15} color="#f59e0b" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
              01 // TRANSMISSION_EVENTS
            </span>
            <span className="cyber-badge cyber-badge-amber" style={{ fontSize: 9 }}>
              EVENTS: {notifs.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#4e5d78', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <Loader2 size={24} color="#00ff66" className="spin" style={{ margin: '0 auto 8px' }} />
            QUERYING_COMMUNICATION_RELAYS...
          </div>
        ) : notifs.length === 0 ? (
          <div className="cyber-card" style={{ textAlign: 'center', padding: 48, borderStyle: 'dashed' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#8b9bb4' }}>
              // NO_SYSTEM_DISPATCHES_SENT_YET
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifs.map((n) => (
              <div key={n.id} className="cyber-card" style={{ padding: '16px 18px', background: '#0a0d14' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                    background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Mail size={15} color="#f59e0b" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                        {n.subject || 'TRANSMISSION_ALERT'}
                      </span>
                      <span className="cyber-badge cyber-badge-green">
                        ✓ {n.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4e5d78', marginBottom: 8 }}>
                      CHANNEL // {n.channel.toUpperCase()} · RECIPIENT // {n.recipient} · {new Date(n.created_at).toLocaleString()}
                    </div>
                    {n.message && (
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        background: '#07090e', border: '1px solid #141c2a',
                        borderRadius: 6, padding: '10px 12px',
                        fontSize: 11, color: '#8b9bb4', lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {n.message}
                      </div>
                    )}
                    {n.application_id && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#00ff66', marginTop: 6 }}>
                        &gt; REF_PACKET: {n.application_id}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
