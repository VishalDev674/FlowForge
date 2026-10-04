'use client';
import React from 'react';
import { NODE_TYPES_CONFIG } from '@/components/nodes/FlowNode';

const CATEGORIES = [
  { key: 'trigger', label: 'Triggers', color: '#10b981' },
  { key: 'validation', label: 'Validation', color: '#3b82f6' },
  { key: 'condition', label: 'Conditions', color: '#f59e0b' },
  { key: 'transform', label: 'Transform', color: '#8b5cf6' },
  { key: 'action', label: 'Actions', color: '#6366f1' },
  { key: 'ai', label: 'AI / Smart', color: '#ec4899' },
  { key: 'utility', label: 'Utility', color: '#64748b' },
];

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export default function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <div style={{
      width: 240,
      background: '#0f1117',
      borderRight: '1px solid #1f2335',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid #1f2335' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8b91a8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Node Library
        </div>
        <div style={{ fontSize: 11, color: '#4a5068', marginTop: 2 }}>
          Drag nodes onto the canvas
        </div>
      </div>

      <div style={{ padding: '8px 0', flex: 1 }}>
        {CATEGORIES.map((cat) => {
          const nodes = Object.entries(NODE_TYPES_CONFIG).filter(([, v]) => v.category === cat.key);
          if (!nodes.length) return null;
          return (
            <div key={cat.key} style={{ marginBottom: 4 }}>
              <div style={{
                padding: '6px 14px 4px',
                fontSize: 10, fontWeight: 700, color: cat.color,
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                {cat.label}
              </div>
              {nodes.map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <div
                    key={type}
                    draggable
                    onDragStart={(e) => onDragStart(e, type)}
                    title={config.description}
                    style={{
                      margin: '2px 8px',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${config.borderColor}`,
                      background: config.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'grab',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = `${config.color}18`;
                      (e.currentTarget as HTMLElement).style.borderColor = config.color;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = config.bgColor;
                      (e.currentTarget as HTMLElement).style.borderColor = config.borderColor;
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 6,
                      background: `${config.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={13} color={config.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#e8eaf0' }}>{config.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
