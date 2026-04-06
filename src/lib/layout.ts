import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { ArchNodeData } from '../types'

const NODE_W = 170
const NODE_H = 80

export function applyDagreLayout(
  nodes: Node<ArchNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): Node<ArchNodeData>[] {
  if (nodes.length === 0) return nodes

  const g = new dagre.graphlib.Graph({ compound: false })
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction,
    nodesep: 60,   // horizontal gap between nodes in the same rank
    ranksep: 90,   // vertical gap between ranks
    marginx: 40,
    marginy: 40,
    acyclicer: 'greedy',
    ranker: 'network-simplex',
  })

  nodes.forEach(node => {
    g.setNode(node.id, { width: NODE_W, height: NODE_H })
  })

  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map(node => {
    const positioned = g.node(node.id)
    // dagre returns center x/y — React Flow uses top-left
    return {
      ...node,
      position: {
        x: Math.round(positioned.x - NODE_W / 2),
        y: Math.round(positioned.y - NODE_H / 2),
      },
    }
  })
}
