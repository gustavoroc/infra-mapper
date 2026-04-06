import type { Node, Edge } from '@xyflow/react'
import type { ArchNodeData, IaCTarget } from '../types'
import { generateDockerCompose } from './docker-compose'
import { generateTerraform } from './terraform'

export function generateCode(
  nodes: Node<ArchNodeData>[],
  edges: Edge[],
  target: IaCTarget
): string {
  switch (target) {
    case 'docker-compose': return generateDockerCompose(nodes, edges)
    case 'terraform':      return generateTerraform(nodes, edges)
  }
}

export { generateDockerCompose, generateTerraform }
