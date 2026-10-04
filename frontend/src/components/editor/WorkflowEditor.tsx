'use client';
import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, BackgroundVariant,
  addEdge, useNodesState, useEdgesState, type Connection, type Edge,
  type Node, ReactFlowProvider, Panel, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildNodeTypes, NODE_TYPES_CONFIG } from '@/components/nodes/FlowNode';
import NodePalette from '@/components/editor/NodePalette';
import NodeConfigPanel from '@/components/editor/NodeConfigPanel';
import { Save, Play, CheckCircle, Upload, AlertTriangle, X, Loader2, Zap, ChevronLeft } from 'lucide-react';
import api, { WS_BASE } from '@/lib/api';
import { useRouter } from 'next/navigation';

const nodeTypes = buildNodeTypes();

let idCounter = 1000;
function newId() { return `node-${++idCounter}`; }

interface WorkflowEditorProps {
  workflowId: string;
  initialGraph?: { nodes: unknown[]; edges: unknown[] };
  workflowName?: string;
  workflowStatus?: string;
}

export default function WorkflowEditor({ workflowId, initialGraph, workflowName, workflowStatus }: WorkflowEditorProps) {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReturnType<typeof useCallback> | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState((initialGraph?.nodes as Node[]) || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState((initialGraph?.edges as Edge[]) || []);
  const [selectedNode, setSelectedNode] = useState<Record<string, unknown> | null>(null);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, string>>({});
  const wsRef = useRef<WebSocket | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Update node visual statuses during execution
  useEffect(() => {
    if (Object.keys(nodeStatuses).length === 0) return;
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, status: nodeStatuses[n.id] || n.data.status },
      }))
    );
  }, [nodeStatuses, setNodes]);

  const connectWs = useCallback((rid: string) => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`${WS_BASE}/ws/runs/${rid}`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'node_status' && msg.node_id) {
          setNodeStatuses((prev) => ({ ...prev, [msg.node_id]: msg.status }));
        }
        if (msg.type === 'run_status' && msg.status === 'completed') {
          showToast('success', '✓ Workflow execution completed');
          setRunning(false);
        }
        if (msg.type === 'run_status' && msg.status === 'failed') {
          showToast('error', 'Workflow execution failed');
          setRunning(false);
        }
      } catch {}
    };
    ws.onerror = () => setRunning(false);
    wsRef.current = ws;
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds).map((e) => ({
      ...e,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#00ff66' },
      style: { stroke: '#00ff66', strokeWidth: 1.5 },
      animated: true,
    })));
  }, [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type || !reactFlowWrapper.current) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const config = NODE_TYPES_CONFIG[type];
    const position = (rfInstance as any)?.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }) || { x: event.clientX - bounds.left, y: event.clientY - bounds.top };

    const newNode = {
      id: newId(),
      type,
      position,
      data: {
        label: config?.label || type,
        description: config?.description || '',
        config: {},
        category: config?.category || 'utility',
      },
    };
    setNodes((nds) => nds.concat(newNode as Node));
  }, [rfInstance, setNodes]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Record<string, unknown>) => {
    setSelectedNode(node as Record<string, unknown>);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const getGraph = () => {
    const inst = rfInstance as any;
    if (inst?.toObject) return inst.toObject();
    return { nodes, edges };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const graph = getGraph();
      await api.workflows.update(workflowId, { graph_json: graph });
      showToast('success', 'Workflow saved');
    } catch (e: unknown) {
      showToast('error', (e as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    try {
      const graph = getGraph();
      await api.workflows.update(workflowId, { graph_json: graph });
      const result = await api.workflows.validate(workflowId);
      if (result.valid) {
        showToast('success', '✓ Workflow is valid');
      } else {
        showToast('error', result.errors.join(' | '));
      }
    } catch (e: unknown) {
      showToast('error', (e as Error).message || 'Validation failed');
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const graph = getGraph();
      await api.workflows.update(workflowId, { graph_json: graph });
      await api.workflows.publish(workflowId);
      showToast('success', '🚀 Workflow published successfully!');
    } catch (e: unknown) {
      showToast('error', (e as Error).message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setNodeStatuses({});
    try {
      const graph = getGraph();
      await api.workflows.update(workflowId, { graph_json: graph });
      const result = await api.workflows.run(workflowId, {
        input_json: {
          applicant_name: 'Demo Candidate',
          email: 'candidate@flowforge.dev',
          program: 'Computer Science & AI',
          percentage: '88.5',
          documents_json: { marksheet: true, identity_proof: true, photo: true },
        }
      });
      setRunId(result.run_id);
      connectWs(result.run_id);
      showToast('success', `Run started: ${result.run_id.slice(0, 8)}...`);
    } catch (e: unknown) {
      showToast('error', (e as Error).message || 'Run failed');
      setRunning(false);
    }
  };

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config } } : n
      )
    );
    setSelectedNode((prev) =>
      prev && (prev as {id: string}).id === nodeId
        ? { ...(prev as object), data: { ...(prev as {data: object}).data, config } } as Record<string, unknown>
        : prev
    );
  }, [setNodes]);

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      {/* Cyber Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 18px',
        background: '#07090e',
        borderBottom: '1px solid #161f2e',
        flexShrink: 0,
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          className="cyber-btn cyber-btn-secondary"
          style={{ padding: '6px 12px', fontSize: 11 }}
        >
          <ChevronLeft size={13} />
          <span>[ RETURN_DASHBOARD ]</span>
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={16} color="#00ff66" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
            {workflowName || 'ORCHESTRATOR_GRAPH'}
          </span>
          <span className={`cyber-badge ${workflowStatus === 'published' ? 'cyber-badge-green' : 'cyber-badge-muted'}`} style={{ fontSize: 9 }}>
            [{workflowStatus ? workflowStatus.toUpperCase() : 'DRAFT'}]
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarBtn onClick={handleSave} loading={saving} icon={<Save size={13} />} label="[ SAVE_GRAPH ]" />
          <ToolbarBtn onClick={handleValidate} icon={<CheckCircle size={13} />} label="[ VALIDATE ]" variant="secondary" />
          <ToolbarBtn onClick={handlePublish} loading={publishing} icon={<Upload size={13} />} label="[ PUBLISH ]" variant="success" />
          <ToolbarBtn onClick={handleRun} loading={running} icon={<Play size={13} />} label="[ EXECUTE_TEST_RUN ]" variant="primary" />
          {runId && (
            <button
              onClick={() => router.push(`/runs/${runId}`)}
              className="cyber-btn cyber-btn-secondary"
              style={{ padding: '6px 12px', fontSize: 11, color: '#00f0ff', borderColor: 'rgba(0,240,255,0.3)' }}
            >
              [ VIEW_RUN_TELEMETRY ↗ ]
            </button>
          )}
        </div>
      </div>

      {/* Cyber Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 70, right: 20, zIndex: 9999,
          padding: '10px 16px', borderRadius: 6,
          background: toast.type === 'success' ? '#071510' : '#17090f',
          border: `1px solid ${toast.type === 'success' ? 'rgba(0,255,102,0.4)' : 'rgba(255,51,102,0.4)'}`,
          color: toast.type === 'success' ? '#00ff66' : '#ff3366',
          fontFamily: 'var(--font-mono)',
          fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
          backdropFilter: 'blur(10px)',
          boxShadow: toast.type === 'success' ? '0 0 16px rgba(0,255,102,0.25)' : '0 0 16px rgba(255,51,102,0.25)',
        }}>
          {toast.type === 'success' ? <CheckCircle size={14} color="#00ff66" /> : <AlertTriangle size={14} color="#ff3366" />}
          {toast.msg}
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 6 }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <NodePalette onDragStart={onDragStart} />

        <div ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={setRfInstance as never}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
            style={{ background: '#040507' }}
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed, color: '#00ff66' },
              style: { stroke: '#00ff66', strokeWidth: 1.5 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} color="#162232" gap={20} />
            <Controls style={{ background: '#0a0d14', border: '1px solid #1a2436', fill: '#00ff66' }} />
            <MiniMap
              nodeColor={(n) => {
                const cfg = NODE_TYPES_CONFIG[n.type || ''];
                return cfg?.color || '#00ff66';
              }}
              maskColor="rgba(4,5,7,0.85)"
              style={{ background: '#080a10', border: '1px solid #141c2a' }}
            />

            {nodes.length === 0 && (
              <Panel position="top-center">
                <div style={{
                  marginTop: 120, textAlign: 'center',
                  color: '#4e5d78', pointerEvents: 'none' as const,
                  fontFamily: 'var(--font-mono)',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12, color: '#00ff66', fontWeight: 800 }}>[ + ]</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', letterSpacing: '0.04em' }}>
                    CANVAS_WORKSPACE_EMPTY
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6, color: '#6b7c96' }}>
                    Drag node modules from the library panel to compose execution pipeline
                  </div>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Node config sidebar */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={(config) => updateNodeConfig((selectedNode as {id: string}).id, config)}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({
  onClick, icon, label, loading, variant = 'default'
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'secondary';
}) {
  const styles: Record<string, { bg: string; border: string; color: string }> = {
    default: { bg: '#0b0f17', border: '#192434', color: '#8b9bb4' },
    primary: { bg: 'rgba(0, 255, 102, 0.1)', border: 'rgba(0, 255, 102, 0.35)', color: '#00ff66' },
    success: { bg: 'rgba(0, 240, 255, 0.1)', border: 'rgba(0, 240, 255, 0.35)', color: '#00f0ff' },
    secondary: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.35)', color: '#f59e0b' },
  };
  const s = styles[variant];
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        fontFamily: 'var(--font-mono)',
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 4,
        background: s.bg, border: `1px solid ${s.border}`, color: s.color,
        fontSize: 11, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1, transition: 'all 0.15s ease',
        letterSpacing: '0.04em',
      }}
    >
      {loading ? <Loader2 size={12} className="spin" /> : icon}
      {label}
    </button>
  );
}
