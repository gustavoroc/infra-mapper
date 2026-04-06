import { useCallback } from 'react'
import { useStore } from 'zustand'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type OnConnect,
  type NodeMouseHandler,
} from '@xyflow/react'
import type { ArchNodeData } from '../../types'
import { useCanvasStore } from '../../store/canvas'
import { ArchNode } from './nodes/ArchNode'
import { QueueEdge } from './edges/QueueEdge'

const NODE_TYPES = { archNode: ArchNode } as const
const EDGE_TYPES = { queueEdge: QueueEdge } as const

export function CanvasPane() {
  const nodes = useCanvasStore(s => s.nodes)
  const edges = useCanvasStore(s => s.edges)
  const onNodesChange = useCanvasStore(s => s.onNodesChange)
  const onEdgesChange = useCanvasStore(s => s.onEdgesChange)
  const addEdgeAction = useCanvasStore(s => s.addEdge)
  const selectNode = useCanvasStore(s => s.selectNode)
  const removeNode = useCanvasStore(s => s.removeNode)
  const removeEdge = useCanvasStore(s => s.removeEdge)
  const selectedNodeId = useCanvasStore(s => s.selectedNodeId)

  // Undo/redo via zundo temporal store
  const { undo, redo, pastStates, futureStates } = useStore(useCanvasStore.temporal)

  const onConnect: OnConnect = useCallback(
    connection => addEdgeAction(connection),
    [addEdgeAction]
  )

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => selectNode(node.id),
    [selectNode]
  )

  const onPaneClick = useCallback(() => selectNode(null), [selectNode])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        if ((e.target as HTMLElement).tagName === 'INPUT') return
        removeNode(selectedNodeId)
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo() }
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') { e.preventDefault(); redo() }
    },
    [selectedNodeId, removeNode, undo, redo]
  )

  return (
    <div
      style={{ flex: 1, position: 'relative', outline: 'none' }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Status counters (RF-035) */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 10,
        display: 'flex', gap: 8, pointerEvents: 'none',
      }}>
        <Pill>{nodes.length} components</Pill>
        <Pill>{edges.length} connections</Pill>
      </div>

      {/* Undo/Redo (RF-012) */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        display: 'flex', gap: 6,
      }}>
        <IconBtn onClick={undo} active={pastStates.length > 0} title="Undo (Ctrl+Z)">↩</IconBtn>
        <IconBtn onClick={redo} active={futureStates.length > 0} title="Redo (Ctrl+Shift+Z)">↪</IconBtn>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeClick={(_, edge) => removeEdge(edge.id)}
        snapToGrid
        snapGrid={[16, 16]}
        fitView
        style={{ background: 'var(--bg-primary)' }}
        deleteKeyCode={null}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#30363d"
        />
        <Controls />
        <MiniMap
          nodeColor={n => {
            const type = (n.data as ArchNodeData)?.componentType
            return type ? '#a8ff3e22' : '#8b949e'
          }}
          nodeStrokeColor="#a8ff3e"
          nodeStrokeWidth={2}
        />
      </ReactFlow>

      {/* Empty state (RF-034) */}
      {nodes.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 15 }}>
            Click components in the left panel to add them
          </p>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>
            Drag from a handle to connect · Click an edge to delete it
          </p>
        </div>
      )}
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 20,
      padding: '3px 10px',
      fontSize: 12,
      color: 'var(--text-secondary)',
    }}>
      {children}
    </span>
  )
}

function IconBtn({
  onClick, active, title, children,
}: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={!active}
      title={title}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: active ? 'pointer' : 'not-allowed',
        fontSize: 16,
        width: 30,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: active ? 1 : 0.4,
      }}
    >
      {children}
    </button>
  )
}
