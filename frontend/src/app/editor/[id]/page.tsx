'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ReactFlowProvider } from '@xyflow/react';
import WorkflowEditor from '@/components/editor/WorkflowEditor';
import { Loader2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<{
    id: string; name: string; status: string;
    active_version_id: string | null;
    versions: { id: string; graph_json: { nodes: unknown[]; edges: unknown[] } }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.workflows.get(id)
      .then(setWorkflow)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0b0f', color: '#8b91a8', flexDirection: 'column', gap: 12,
      }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 14 }}>Loading workflow...</div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0b0f', color: '#ef4444', flexDirection: 'column', gap: 12,
      }}>
        <AlertTriangle size={28} />
        <div style={{ fontSize: 14 }}>{error || 'Workflow not found'}</div>
      </div>
    );
  }

  // Find the active graph
  const activeVersion = workflow.versions?.find((v) => v.id === workflow.active_version_id);
  const graph = activeVersion?.graph_json;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0b0f' }}>
      <ReactFlowProvider>
        <WorkflowEditor
          workflowId={id}
          initialGraph={graph}
          workflowName={workflow.name}
          workflowStatus={workflow.status}
        />
      </ReactFlowProvider>
    </div>
  );
}
