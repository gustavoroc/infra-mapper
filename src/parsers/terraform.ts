import { nanoid } from 'nanoid'
import type { Node, Edge } from '@xyflow/react'
import type { ArchNodeData, ComponentType } from '../types'
import { COMPONENT_PROPS } from '../types'

// ─── AWS resource type → ComponentType ───────────────────────────────────────

const AWS_TO_COMPONENT: Record<string, ComponentType> = {
  aws_instance:               'server',
  aws_db_instance:            'database',
  aws_rds_cluster:            'database',
  aws_lb:                     'loadbalancer',
  aws_alb:                    'loadbalancer',
  aws_elasticache_cluster:    'cache',
  aws_elasticache_replication_group: 'cache',
  aws_sqs_queue:              'queue',
  aws_mq_broker:              'queue',
  aws_s3_bucket:              'storage',
  aws_api_gateway_rest_api:   'api',
  aws_apigatewayv2_api:       'api',
  aws_ecs_service:            'container',
  aws_ecs_task_definition:    'container',
  aws_cloudfront_distribution:'cdn',
  aws_cloudwatch_dashboard:   'monitoring',
  aws_cloudwatch_metric_alarm:'monitoring',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultProps(type: ComponentType): Record<string, string | number | boolean> {
  return Object.fromEntries(COMPONENT_PROPS[type].map(p => [p.key, p.default]))
}

function gridPosition(index: number): { x: number; y: number } {
  const cols = 4
  return {
    x: 80 + (index % cols) * 200,
    y: 80 + Math.floor(index / cols) * 160,
  }
}

// ─── Minimal HCL block extractor ─────────────────────────────────────────────
// Extracts top-level blocks by scanning brace depth — no full HCL parser needed.

interface HclBlock {
  blockType: string   // e.g. "resource"
  labels: string[]    // e.g. ["aws_instance", "web_server"]
  body: string        // raw text inside the outermost braces
}

function extractBlocks(hcl: string): HclBlock[] {
  const blocks: HclBlock[] = []
  // Match block header: word labels... {
  const headerRe = /^(\w+)(\s+"[^"]*")*\s*\{/gm
  let match: RegExpExecArray | null

  while ((match = headerRe.exec(hcl)) !== null) {
    const start = match.index + match[0].length
    let depth = 1
    let i = start
    while (i < hcl.length && depth > 0) {
      if (hcl[i] === '{') depth++
      else if (hcl[i] === '}') depth--
      i++
    }
    const body = hcl.slice(start, i - 1)
    const rawLabels = match[0].match(/"([^"]*)"/g) ?? []
    blocks.push({
      blockType: match[1],
      labels: rawLabels.map(l => l.replace(/"/g, '')),
      body,
    })
  }
  return blocks
}

// Extract a simple scalar attribute value from HCL body
function attr(body: string, key: string): string | null {
  const re = new RegExp(`\\b${key}\\s*=\\s*"?([^"\\n]+)"?`)
  const m = body.match(re)
  return m ? m[1].trim().replace(/^"|"$/g, '') : null
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export interface ParseResult {
  nodes: Node<ArchNodeData>[]
  edges: Edge[]
  warnings: string[]
}

export function parseTerraform(content: string): ParseResult {
  const warnings: string[] = []
  const nodes: Node<ArchNodeData>[] = []
  const edges: Edge[] = []

  const blocks = extractBlocks(content)
  const resourceBlocks = blocks.filter(b => b.blockType === 'resource' && b.labels.length === 2)

  if (resourceBlocks.length === 0) {
    warnings.push('No resource blocks found in the Terraform file.')
    return { nodes: [], edges: [], warnings }
  }

  // nameKey = "aws_type.logical_name" → nodeId
  const nameToId = new Map<string, string>()
  let index = 0

  for (const block of resourceBlocks) {
    const [awsType, logicalName] = block.labels
    const componentType = AWS_TO_COMPONENT[awsType]

    if (!componentType) {
      warnings.push(`Unknown resource type "${awsType}" — skipped.`)
      continue
    }

    // Skip security_group_rule blocks — handled as edges below
    if (awsType === 'aws_security_group_rule') continue

    const props = defaultProps(componentType)

    // Enrich properties from HCL attributes
    switch (componentType) {
      case 'server': {
        const instanceType = attr(block.body, 'instance_type')
        if (instanceType) props.instance_type = instanceType
        break
      }
      case 'database': {
        const engine = attr(block.body, 'engine')
        if (engine) props.engine = engine.replace(/[^a-z]/g, '') // strip version
        const storage = attr(block.body, 'allocated_storage')
        if (storage) props.allocated_storage = Number(storage)
        break
      }
      case 'cache': {
        const engine = attr(block.body, 'engine')
        if (engine) props.engine = engine
        break
      }
      case 'loadbalancer': {
        const lbType = attr(block.body, 'load_balancer_type')
        if (lbType) props.type = lbType
        const internal = attr(block.body, 'internal')
        if (internal) props.internal = internal === 'true'
        break
      }
      case 'container': {
        const replicas = attr(block.body, 'desired_count')
        if (replicas) props.replicas = Number(replicas)
        break
      }
      case 'cdn': {
        const priceClass = attr(block.body, 'price_class')
        if (priceClass) props.price_class = priceClass
        break
      }
    }

    // Use the tag Name if available, fallback to logical name
    const tagName = block.body.match(/Name\s*=\s*"([^"]+)"/)
    const label = tagName?.[1] ?? logicalName.replace(/_/g, ' ')

    const id = `node_${nanoid(8)}`
    nameToId.set(`${awsType}.${logicalName}`, id)
    nameToId.set(logicalName, id) // shorthand lookup

    nodes.push({
      id,
      type: 'archNode',
      position: gridPosition(index++),
      data: { componentType, label, properties: props },
    })
  }

  // Build a quick lookup: nodeId → componentType
  const idToType = new Map(nodes.map(n => [n.id, n.data.componentType]))

  function makeEdge(srcId: string, dstId: string) {
    const sourceIsQueue = idToType.get(srcId) === 'queue'
    const targetIsQueue = idToType.get(dstId) === 'queue'
    const isQueueEdge = sourceIsQueue || targetIsQueue
    const queueRole = targetIsQueue ? 'produce' : sourceIsQueue ? 'consume' : undefined
    edges.push({
      id: `edge_${nanoid(8)}`,
      source: srcId,
      target: dstId,
      type: isQueueEdge ? 'queueEdge' : undefined,
      data: queueRole ? { role: queueRole } : undefined,
      animated: false,
    })
  }

  // Build edges from aws_security_group_rule blocks
  const sgRuleBlocks = resourceBlocks.filter(b => b.labels[0] === 'aws_security_group_rule')
  for (const block of sgRuleBlocks) {
    // Convention from our generator: rule name = "src_to_dst"
    const ruleName = block.labels[1]
    const parts = ruleName.split('_to_')
    if (parts.length === 2) {
      const srcId = nameToId.get(parts[0])
      const dstId = nameToId.get(parts[1])
      if (srcId && dstId) {
        makeEdge(srcId, dstId)
        continue
      }
    }
    // Fallback: parse source_security_group_id and security_group_id refs
    const src = attr(block.body, 'source_security_group_id')?.match(/aws_security_group\.(\w+)/)?.[1]
    const dst = attr(block.body, 'security_group_id')?.match(/aws_security_group\.(\w+)/)?.[1]
    if (src && dst) {
      const srcId = nameToId.get(src)
      const dstId = nameToId.get(dst)
      if (srcId && dstId) {
        makeEdge(srcId, dstId)
      }
    }
  }

  return { nodes, edges, warnings }
}
