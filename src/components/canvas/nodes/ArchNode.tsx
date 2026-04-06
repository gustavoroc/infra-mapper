import { memo, useState, useCallback } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { ArchNodeData } from '../../../types'
import { COMPONENT_CATALOG } from '../../../types'
import { useCanvasStore } from '../../../store/canvas'

const EMOJI_BY_TYPE = Object.fromEntries(
  COMPONENT_CATALOG.map(c => [c.type, c.emoji])
)

type ArchNodeProps = NodeProps<Node<ArchNodeData>>

function ArchNodeComponent({ id, data: rawData, selected }: ArchNodeProps) {
  const data = rawData as ArchNodeData
  const renameNode = useCanvasStore(s => s.renameNode)
  const edges = useCanvasStore(s => s.edges)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)

  const commitRename = useCallback(() => {
    setEditing(false)
    renameNode(id, draft)
  }, [id, draft, renameNode])

  const emoji = EMOJI_BY_TYPE[data.componentType] ?? '📦'
  const isQueue = data.componentType === 'queue'
  const isConnected = isQueue && edges.some(e => e.source === id || e.target === id)

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg-secondary)',
        border: selected
          ? `2px solid ${isQueue ? '#f59e0b' : 'var(--accent)'}`
          : `2px solid ${isConnected ? 'rgba(245,158,11,0.45)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 130,
        maxWidth: 180,
        boxShadow: selected
          ? `0 0 0 3px ${isQueue ? 'rgba(245,158,11,0.2)' : 'var(--accent-dim)'}`
          : isConnected
            ? '0 0 12px rgba(245,158,11,0.15)'
            : '0 2px 8px rgba(0,0,0,0.4)',
        cursor: 'grab',
        userSelect: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...(isConnected ? { className: 'queue-node-active' } : {}),
      }}
      className={isConnected ? 'queue-node-active' : undefined}
    >
      {/* Pulse rings — only when queue is connected */}
      {isConnected && (
        <>
          <div className="queue-node-ring" />
          <div className="queue-node-ring queue-node-ring-2" />
        </>
      )}

      <Handle type="source" position={Position.Top} />

      {/* Icon + type label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>
          {emoji}
          {/* Live indicator dot */}
          {isConnected && (
            <span style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              background: '#f59e0b',
              borderRadius: '50%',
              marginLeft: 3,
              verticalAlign: 'middle',
              boxShadow: '0 0 4px #f59e0b',
              animation: 'queue-ring-inner 1.6s ease-out infinite',
            }} />
          )}
        </span>
        <span style={{
          fontSize: 10,
          color: isConnected ? 'rgba(245,158,11,0.8)' : 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          transition: 'color 0.2s',
        }}>
          {data.componentType}
          {isConnected && <span style={{ marginLeft: 4, opacity: 0.7 }}>● live</span>}
        </span>
      </div>

      {/* Label — double-click to rename */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          maxLength={50}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setEditing(false); setDraft(data.label) }
          }}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--accent)',
            borderRadius: 4,
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 600,
            width: '100%',
            padding: '2px 4px',
            outline: 'none',
          }}
        />
      ) : (
        <div
          onDoubleClick={() => { setEditing(true); setDraft(data.label) }}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.label}
        </div>
      )}

      <Handle type="target" position={Position.Bottom} />
    </div>
  )
}

export const ArchNode = memo(ArchNodeComponent)
