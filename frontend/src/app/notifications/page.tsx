'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Zap, Bell, Mail, CheckCircle, Loader2 } from 'lucide-react';
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
    <div style={{ minHeight: '100vh', background: '#0a0b0f', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#0f1117', borderBottom: '1px solid #1f2335', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, background: 'transparent', border: '1px solid #1f2335', color: '#8b91a8', fontSize: 12, cursor: 'pointer' }}>
          <ChevronLeft size={13} /> Dashboard
        </button>
        <Zap size={16} color="#6366f1" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0' }}>Notifications</span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Bell size={15} color="#f59e0b" />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf0' }}>Sent Notifications</span>
          <span style={{ fontSize: 12, color: '#4a5068' }}>({notifs.length})</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#4a5068' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#4a5068', fontSize: 13 }}>
            No notifications sent yet. Run a workflow to trigger notifications.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifs.map((n) => (
              <div key={n.id} style={{ background: '#0f1117', border: '1px solid #1f2335', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: 'rgba(245,158,11,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Mail size={15} color="#f59e0b" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf0' }}>{n.subject || 'Notification'}</span>
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 999,
                        background: n.status === 'delivered' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: n.status === 'delivered' ? '#10b981' : '#ef4444',
                      }}>
                        {n.status === 'delivered' ? '✓ Delivered' : n.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#4a5068', marginBottom: 8 }}>
                      To: {n.recipient} · {n.channel} · {new Date(n.created_at).toLocaleString()}
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
                        App ID: {n.application_id}
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
