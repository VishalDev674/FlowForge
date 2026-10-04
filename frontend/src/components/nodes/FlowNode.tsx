'use client';
import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  Zap, CheckCircle, GitBranch, Shuffle, Play,
  UserCheck, Bell, Globe, Clock, Terminal, Brain,
  AlertTriangle, Loader2
} from 'lucide-react';

export const NODE_TYPES_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  category: string;
  description: string;
}> = {
  trigger_manual: {
    label: 'Manual Trigger',
    icon: Play,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    category: 'trigger',
    description: 'Start workflow manually with test data',
  },
  trigger_form: {
    label: 'Application Submitted',
    icon: Zap,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    category: 'trigger',
    description: 'Triggered when an application form is submitted',
  },
  trigger_webhook: {
    label: 'Webhook Trigger',
    icon: Globe,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    category: 'trigger',
    description: 'Start workflow from an HTTP webhook',
  },
  validate_fields: {
    label: 'Validate Fields',
    icon: CheckCircle,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    category: 'validation',
    description: 'Check that all required fields are present',
  },
  check_documents: {
    label: 'Check Documents',
    icon: CheckCircle,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    category: 'validation',
    description: 'Verify required documents are attached',
  },
  condition_ifelse: {
    label: 'If / Else',
    icon: GitBranch,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    category: 'condition',
    description: 'Branch execution based on a condition',
  },
  condition_switch: {
    label: 'Switch',
    icon: Shuffle,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    category: 'condition',
    description: 'Route by matching a field value',
  },
  transform_map: {
    label: 'Map Fields',
    icon: Shuffle,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    category: 'transform',
    description: 'Remap or restructure data fields',
  },
  transform_score: {
    label: 'Calculate Score',
    icon: Brain,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    category: 'transform',
    description: 'Calculate eligibility score from data',
  },
  ai_categorize: {
    label: 'Categorize (AI)',
    icon: Brain,
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.08)',
    borderColor: 'rgba(236, 72, 153, 0.4)',
    category: 'ai',
    description: 'AI-powered applicant categorization',
  },
  action_status: {
    label: 'Update Status',
    icon: CheckCircle,
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 246, 0.08)',
    borderColor: 'rgba(99, 102, 246, 0.4)',
    category: 'action',
    description: 'Update the application status',
  },
  action_assign: {
    label: 'Assign Reviewer',
    icon: UserCheck,
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 246, 0.08)',
    borderColor: 'rgba(99, 102, 246, 0.4)',
    category: 'action',
    description: 'Assign to reviewer based on category',
  },
  action_notify: {
    label: 'Send Notification',
    icon: Bell,
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 246, 0.08)',
    borderColor: 'rgba(99, 102, 246, 0.4)',
    category: 'action',
    description: 'Send email/in-app notification',
  },
  action_http: {
    label: 'HTTP Request',
    icon: Globe,
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 246, 0.08)',
    borderColor: 'rgba(99, 102, 246, 0.4)',
    category: 'action',
    description: 'Make an HTTP API call',
  },
  utility_delay: {
    label: 'Delay / Wait',
    icon: Clock,
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.08)',
    borderColor: 'rgba(100, 116, 139, 0.4)',
    category: 'utility',
    description: 'Pause execution for a duration',
  },
  utility_log: {
    label: 'Log Message',
    icon: Terminal,
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.08)',
    borderColor: 'rgba(100, 116, 139, 0.4)',
    category: 'utility',
    description: 'Write a message to execution log',
  },
};

// Status styles for live execution
const STATUS_STYLES: Record<string, { border: string; glow: string; badge: string; icon?: React.ElementType }> = {
  pending: { border: '#2a2f4a', glow: 'none', badge: '#4a5068' },
  running: { border: '#3b82f6', glow: '0 0 12px rgba(59,130,246,0.4)', badge: '#3b82f6', icon: Loader2 },
  succeeded: { border: '#10b981', glow: '0 0 12px rgba(16,185,129,0.3)', badge: '#10b981' },
  failed: { border: '#ef4444', glow: '0 0 12px rgba(239,68,68,0.3)', badge: '#ef4444', icon: AlertTriangle },
  skipped: { border: '#f59e0b', glow: 'none', badge: '#f59e0b' },
  retrying: { border: '#a855f7', glow: '0 0 12px rgba(168,85,247,0.3)', badge: '#a855f7', icon: Loader2 },
  waiting: { border: '#f97316', glow: '0 0 8px rgba(249,115,22,0.3)', badge: '#f97316' },
};

interface FlowNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  config?: Record<string, unknown>;
  category?: string;
  status?: string;
  selected?: boolean;
}

type FlowNodeNode = Node<FlowNodeData>;

const FlowNode = memo(({ data, type, selected }: NodeProps<FlowNodeNode>) => {
  const nodeConfig = NODE_TYPES_CONFIG[type || 'utility_log'];
  const statusStyle = STATUS_STYLES[data.status || 'pending'];
  const isCondition = type?.startsWith('condition');
  const isTrigger = type?.startsWith('trigger');
  const Icon = nodeConfig?.icon || Terminal;
  const StatusIcon = statusStyle?.icon;

  const borderColor = data.status && data.status !== 'pending'
    ? statusStyle.border
    : selected ? '#6366f1' : (nodeConfig?.borderColor || '#2a2f4a');

  return (
    <div
      style={{
        background: nodeConfig?.bgColor || 'rgba(26,29,39,0.9)',
        border: `1.5px solid ${borderColor}`,
        borderRadius: isCondition ? '12px' : '10px',
        minWidth: 200,
        maxWidth: 240,
        boxShadow: data.status && data.status !== 'pending' ? statusStyle.glow : selected ? '0 0 0 2px rgba(99,102,241,0.3)' : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'all 0.3s ease',
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Input handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: nodeConfig?.color || '#6366f1', border: '2px solid #0f1117', width: 10, height: 10 }}
        />
      )}

      {/* Status badge */}
      {data.status && data.status !== 'pending' && (
        <div style={{
          position: 'absolute', top: -8, right: -8,
          background: statusStyle.badge, borderRadius: '50%',
          width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: '#fff', fontWeight: 700,
          boxShadow: `0 0 6px ${statusStyle.badge}`,
        }}>
          {data.status === 'succeeded' ? '✓' :
           data.status === 'failed' ? '✕' :
           data.status === 'skipped' ? '–' :
           data.status === 'running' ? '●' :
           data.status === 'retrying' ? '↻' : '●'}
        </div>
      )}

      <div style={{ padding: '12px 14px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `${nodeConfig?.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {StatusIcon && (data.status === 'running' || data.status === 'retrying')
              ? <StatusIcon size={14} color={nodeConfig?.color} style={{ animation: 'spin 1s linear infinite' }} />
              : <Icon size={14} color={nodeConfig?.color} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: nodeConfig?.color,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {nodeConfig?.category || 'node'}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#e8eaf0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {data.label}
            </div>
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div style={{ fontSize: 11, color: '#8b91a8', lineHeight: 1.4 }}>
            {data.description}
          </div>
        )}
      </div>

      {/* Output handles */}
      {isCondition ? (
        <>
          <Handle
            type="source" position={Position.Bottom} id="true"
            style={{ left: '30%', background: '#10b981', border: '2px solid #0f1117', width: 10, height: 10 }}
          />
          <Handle
            type="source" position={Position.Bottom} id="false"
            style={{ left: '70%', background: '#ef4444', border: '2px solid #0f1117', width: 10, height: 10 }}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '4px 14px 8px',
            fontSize: 10, color: '#4a5068',
          }}>
            <span style={{ color: '#10b981', marginLeft: '5%' }}>✓ True</span>
            <span style={{ color: '#ef4444', marginRight: '5%' }}>✕ False</span>
          </div>
        </>
      ) : (
        <Handle
          type="source" position={Position.Bottom}
          style={{ background: nodeConfig?.color || '#6366f1', border: '2px solid #0f1117', width: 10, height: 10 }}
        />
      )}
    </div>
  );
});

FlowNode.displayName = 'FlowNode';

// Build the nodeTypes object for React Flow
export const buildNodeTypes = () => {
  const types: Record<string, React.ComponentType<NodeProps<FlowNodeNode>>> = {};
  Object.keys(NODE_TYPES_CONFIG).forEach((key) => {
    const Comp = (props: NodeProps<FlowNodeNode>) => <FlowNode {...props} />;
    Comp.displayName = key;
    types[key] = Comp;
  });
  return types;
};

export default FlowNode;
