'use client';
import React, { useState } from 'react';
import { X, Settings } from 'lucide-react';
import { NODE_TYPES_CONFIG } from '@/components/nodes/FlowNode';

interface NodeConfigPanelProps {
  node: unknown;
  onUpdate: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const n = node as { id: string; type: string; data: { label: string; config?: Record<string, unknown> } };
  const config = NODE_TYPES_CONFIG[n.type] || {};
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(n.data?.config || {});

  const update = (key: string, val: unknown) => {
    const next = { ...localConfig, [key]: val };
    setLocalConfig(next);
    onUpdate(next);
  };

  const renderField = (key: string, label: string, type: 'text' | 'textarea' | 'number' | 'toggle', placeholder?: string) => (
    <div key={key} style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8b91a8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={String(localConfig[key] || '')}
          onChange={(e) => update(key, e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{
            width: '100%', background: '#0a0b0f', border: '1px solid #1f2335',
            borderRadius: 6, padding: '8px 10px', color: '#e8eaf0', fontSize: 12,
            resize: 'vertical', fontFamily: 'monospace', outline: 'none',
          }}
        />
      ) : type === 'toggle' ? (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={Boolean(localConfig[key])}
            onChange={(e) => update(key, e.target.checked)}
            style={{ accentColor: '#6366f1', width: 14, height: 14 }}
          />
          <span style={{ fontSize: 12, color: '#e8eaf0' }}>{placeholder || 'Enable'}</span>
        </label>
      ) : (
        <input
          type={type}
          value={String(localConfig[key] || '')}
          onChange={(e) => update(key, type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', background: '#0a0b0f', border: '1px solid #1f2335',
            borderRadius: 6, padding: '8px 10px', color: '#e8eaf0', fontSize: 12, outline: 'none',
          }}
        />
      )}
    </div>
  );

  const renderConfigFields = () => {
    switch (n.type) {
      case 'validate_fields':
        return (
          <>
            {renderField('required_fields', 'Required Fields (comma-separated)', 'text', 'applicant_name,email,program,percentage')}
          </>
        );
      case 'check_documents':
        return (
          <>
            {renderField('required_documents', 'Required Documents (comma-separated)', 'text', 'marksheet,identity_proof,photo')}
          </>
        );
      case 'condition_ifelse':
        return (
          <>
            {renderField('expression', 'Condition Expression', 'text', 'documents_check.is_complete == true')}
            <div style={{ fontSize: 11, color: '#4a5068', marginTop: -8, marginBottom: 10 }}>
              Use dot notation: field.subfield == value<br />
              Supports: ==, !=, &gt;, &lt;, &gt;=, &lt;=
            </div>
          </>
        );
      case 'transform_score':
        return (
          <>
            {renderField('threshold', 'Eligibility Threshold (%)', 'number', '70')}
          </>
        );
      case 'action_status':
        return (
          <>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#8b91a8', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              New Status
            </label>
            <select
              value={String(localConfig.status || 'under_review')}
              onChange={(e) => update('status', e.target.value)}
              style={{
                width: '100%', background: '#0a0b0f', border: '1px solid #1f2335',
                borderRadius: 6, padding: '8px 10px', color: '#e8eaf0', fontSize: 12, marginBottom: 14,
              }}
            >
              {['received','validating','needs_correction','under_review','accepted','rejected'].map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </>
        );
      case 'action_notify':
        return (
          <>
            {renderField('subject', 'Email Subject', 'text', 'Application Update')}
            {renderField('recipient_field', 'Recipient Field Path', 'text', 'application.email')}
            {renderField('template', 'Message Template', 'textarea', 'Hello {{application.applicant_name}}, ...')}
            {renderField('simulate_failure', 'Simulate Failure (for demo)', 'toggle', 'Enable failure simulation')}
          </>
        );
      case 'utility_delay':
        return renderField('seconds', 'Delay (seconds)', 'number', '2');
      case 'utility_log':
        return renderField('message', 'Log Message', 'text', 'Processing step {{application.id}}');
      case 'action_http':
        return (
          <>
            {renderField('url', 'URL', 'text', 'https://api.example.com/hook')}
            <label style={{ fontSize: 11, fontWeight: 600, color: '#8b91a8', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Method
            </label>
            <select
              value={String(localConfig.method || 'POST')}
              onChange={(e) => update('method', e.target.value)}
              style={{
                width: '100%', background: '#0a0b0f', border: '1px solid #1f2335',
                borderRadius: 6, padding: '8px 10px', color: '#e8eaf0', fontSize: 12, marginBottom: 14,
              }}
            >
              {['GET','POST','PUT','PATCH','DELETE'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </>
        );
      default:
        return (
          <div style={{ fontSize: 12, color: '#4a5068', textAlign: 'center', padding: '20px 0' }}>
            No configuration needed for this node.
          </div>
        );
    }
  };

  const Icon = config.icon;

  return (
    <div style={{
      width: 280, background: '#0f1117',
      borderLeft: '1px solid #1f2335',
      display: 'flex', flexDirection: 'column',
      animation: 'slideIn 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 14px 12px',
        borderBottom: '1px solid #1f2335',
      }}>
        {Icon && (
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `${config.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={14} color={config.color as string} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: config.color as string, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {config.category}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0' }}>
            {n.data?.label || 'Node Config'}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#4a5068', cursor: 'pointer', padding: 4 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Config fields */}
      <div style={{ padding: 14, flex: 1, overflowY: 'auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 14, fontSize: 12, color: '#4a5068',
        }}>
          <Settings size={12} />
          Configuration
        </div>
        {renderConfigFields()}

        {/* Node ID info */}
        <div style={{ marginTop: 16, padding: '8px 10px', borderRadius: 6, background: '#13151d', border: '1px solid #1f2335' }}>
          <div style={{ fontSize: 10, color: '#4a5068' }}>Node ID</div>
          <div style={{ fontSize: 11, color: '#8b91a8', fontFamily: 'monospace', wordBreak: 'break-all' }}>{n.id}</div>
        </div>
      </div>
    </div>
  );
}
