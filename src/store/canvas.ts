import { create } from 'zustand'
import { temporal } from 'zundo'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react'
import { nanoid } from 'nanoid'
import {
  type ArchNodeData,
  type ComponentType,
  type IaCTarget,
  COMPONENT_PROPS,
  COMPONENT_CATALOG,
} from '../types'

// ─── State shape ─────────────────────────────────────────────────────────────

export interface CanvasState {
  nodes: Node<ArchNodeData>[]
  edges: Edge[]
  selectedNodeId: string | null
  activeTarget: IaCTarget
  projectName: string

  // Node actions
  addNode: (type: ComponentType) => void
  updateNodePosition: (id: string, x: number, y: number) => void
  removeNode: (id: string) => void
  selectNode: (id: string | null) => void
  renameNode: (id: string, label: string) => void
  updateNodeProperty: (id: string, key: string, value: string | number | boolean) => void

  // Edge actions
  addEdge: (connection: Connection) => void
  removeEdge: (id: string) => void

  // Canvas actions
  clearCanvas: () => void
  setTarget: (target: IaCTarget) => void
  setProjectName: (name: string) => void

  // React Flow handlers
  onNodesChange: (changes: NodeChange<Node<ArchNodeData>>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultProperties(type: ComponentType): Record<string, string | number | boolean> {
  return Object.fromEntries(
    COMPONENT_PROPS[type].map(prop => [prop.key, prop.default])
  )
}

function buildLabel(type: ComponentType, existingLabels: string[]): string {
  const base = COMPONENT_CATALOG.find(c => c.type === type)?.label ?? type
  if (!existingLabels.includes(base)) return base
  let i = 2
  while (existingLabels.includes(`${base} ${i}`)) i++
  return `${base} ${i}`
}

function safePosition(existing: Node[]): { x: number; y: number } {
  const step = 160
  const padding = 40
  let x = 120 + (existing.length % 5) * step
  let y = 120 + Math.floor(existing.length / 5) * step
  const occupied = new Set(existing.map(n => `${n.position.x},${n.position.y}`))
  while (occupied.has(`${x},${y}`)) { x += padding; y += padding }
  return { x, y }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCanvasStore = create<CanvasState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      activeTarget: 'docker-compose',
      projectName: 'My Architecture',

      // ── Nodes ──────────────────────────────────────────────────────────────

      addNode: (type) => {
        const { nodes } = get()
        const existingLabels = nodes.map(n => n.data.label)
        const label = buildLabel(type, existingLabels)
        const position = safePosition(nodes)

        const node: Node<ArchNodeData> = {
          id: `node_${nanoid(8)}`,
          type: 'archNode',
          position,
          data: {
            componentType: type,
            label,
            properties: defaultProperties(type),
          },
        }
        set({ nodes: [...nodes, node] })
      },

      updateNodePosition: (id, x, y) => {
        set(s => ({
          nodes: s.nodes.map(n =>
            n.id === id ? { ...n, position: { x, y } } : n
          ),
        }))
      },

      removeNode: (id) => {
        set(s => ({
          nodes: s.nodes.filter(n => n.id !== id),
          edges: s.edges.filter(e => e.source !== id && e.target !== id), // RE-012
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        }))
      },

      selectNode: (id) => set({ selectedNodeId: id }),

      renameNode: (id, label) => {
        const trimmed = label.trim().slice(0, 50)
        if (!trimmed) return
        set(s => ({
          nodes: s.nodes.map(n =>
            n.id === id ? { ...n, data: { ...n.data, label: trimmed } } : n
          ),
        }))
      },

      updateNodeProperty: (id, key, value) => {
        set(s => ({
          nodes: s.nodes.map(n =>
            n.id === id
              ? { ...n, data: { ...n.data, properties: { ...n.data.properties, [key]: value } } }
              : n
          ),
        }))
      },

      // ── Edges ──────────────────────────────────────────────────────────────

      addEdge: (connection) => {
        const { edges } = get()
        if (connection.source === connection.target) return // RE-006: no self-loops
        const duplicate = edges.some(
          e => e.source === connection.source && e.target === connection.target
        )
        if (duplicate) return // RE-006: no duplicate connections

        const edge: Edge = {
          id: `edge_${nanoid(8)}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
          animated: false,
        }
        set({ edges: addEdge(edge, edges) })
      },

      removeEdge: (id) => {
        set(s => ({ edges: s.edges.filter(e => e.id !== id) }))
      },

      // ── Canvas ─────────────────────────────────────────────────────────────

      clearCanvas: () => set({ nodes: [], edges: [], selectedNodeId: null }),

      setTarget: (target) => set({ activeTarget: target }),

      setProjectName: (name) => set({ projectName: name }),

      // ── React Flow handlers ─────────────────────────────────────────────────

      onNodesChange: (changes) => {
        set(s => ({ nodes: applyNodeChanges(changes, s.nodes) }))
      },

      onEdgesChange: (changes) => {
        set(s => ({ edges: applyEdgeChanges(changes, s.edges) }))
      },
    }),
    {
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
      limit: 30,
    }
  )
)
