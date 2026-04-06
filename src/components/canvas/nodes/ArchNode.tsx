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
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)

  const commitRename = useCallback(() => {
    setEditing(false)
    renameNode(id, draft)
  }, [id, draft, renameNode])

  const emoji = EMOJI_BY_TYPE[data.componentType] ?? '📦'

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: selected
          ? '2px solid var(--accent)'
          : '2px solid var(--border)',
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 130,
        maxWidth: 180,
        boxShadow: selected
          ? '0 0 0 3px var(--accent-dim)'
          : '0 2px 8px rgba(0,0,0,0.4)',
        cursor: 'grab',
        userSelect: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <Handle type="source" position={Position.Top} />

      {/* Icon + type label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {data.componentType}
        </span>
      </div>

      {/* Label — double-click to rename (RF-005) */}
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
