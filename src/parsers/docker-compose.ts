import { parse } from 'yaml'
import { nanoid } from 'nanoid'
import type { Node, Edge } from '@xyflow/react'
import type { ArchNodeData, ComponentType, Runtime } from '../types'
import { COMPONENT_PROPS } from '../types'

// ─── Image → ComponentType inference ─────────────────────────────────────────

function inferType(image: string = ''): ComponentType {
  const img = image.toLowerCase().split(':')[0] // strip tag

  if (/^(postgres|mysql|mariadb)/.test(img))               return 'database'
  if (/^(redis|memcached)/.test(img))                       return 'cache'
  if (/^rabbitmq/.test(img) || img.includes('kafka'))       return 'queue'
  if (img.includes('minio'))                                return 'storage'
  if (/^(prom\/prometheus|grafana\/grafana|datadog)/.test(img)) return 'monitoring'
  if (/^traefik/.test(img))                                 return 'api'
  if (/^(nginx|haproxy)/.test(img))                         return 'loadbalancer'
  // Anything else with a known runtime → server
  if (inferRuntime(image) !== null)                         return 'server'
  return 'container'
}

// ─── Image → Runtime inference ────────────────────────────────────────────────

function inferRuntime(image: string = ''): Runtime | null {
  const img = image.toLowerCase()
  if (img.startsWith('node'))                                          return 'node'
  if (img.startsWith('python'))                                        return 'python'
  if (img.startsWith('golang') || img.startsWith('go:'))              return 'go'
  if (img.startsWith('ruby'))                                          return 'ruby'
  if (img.startsWith('php'))                                           return 'php'
  if (img.startsWith('rust'))                                          return 'rust'
  if (img.startsWith('eclipse-temurin') || img.startsWith('openjdk')) return 'java'
  if (img.includes('dotnet') || img.includes('aspnet'))               return 'dotnet'
  if (img.startsWith('nginx'))                                         return 'nginx'
  return null
}

// ─── Image → DB engine ───────────────────────────────────────────────────────

function inferDbEngine(image: string = ''): string {
  const img = image.toLowerCase()
  if (img.startsWith('mysql'))   return 'mysql'
  if (img.startsWith('mariadb')) return 'mariadb'
  return 'postgres'
}

// ─── Image → cache engine ────────────────────────────────────────────────────

function inferCacheEngine(image: string = ''): string {
  return image.toLowerCase().startsWith('memcached') ? 'memcached' : 'redis'
}

// ─── Image → queue engine ────────────────────────────────────────────────────

function inferQueueEngine(image: string = ''): string {
  return image.toLowerCase().includes('kafka') ? 'kafka' : 'rabbitmq'
}

// ─── Default properties for a type ───────────────────────────────────────────

function defaultProps(type: ComponentType): Record<string, string | number | boolean> {
  return Object.fromEntries(COMPONENT_PROPS[type].map(p => [p.key, p.default]))
}

// ─── Grid layout for imported nodes ──────────────────────────────────────────

function gridPosition(index: number): { x: number; y: number } {
  const cols = 4
  const colW = 200
  const rowH = 160
  return {
    x: 80 + (index % cols) * colW,
    y: 80 + Math.floor(index / cols) * rowH,
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export interface ParseResult {
  nodes: Node<ArchNodeData>[]
  edges: Edge[]
  warnings: string[]
}

export function parseDockerCompose(content: string): ParseResult {
  const warnings: string[] = []
  let doc: Record<string, unknown>

  try {
    doc = parse(content) as Record<string, unknown>
  } catch (e) {
    throw new Error(`Invalid YAML: ${(e as Error).message}`)
  }

  const services = (doc?.services ?? {}) as Record<string, Record<string, unknown>>

  if (Object.keys(services).length === 0) {
    warnings.push('No services found in the compose file.')
    return { nodes: [], edges: [], warnings }
  }

  const nameToId = new Map<string, string>()
  const nodes: Node<ArchNodeData>[] = []
  const edges: Edge[] = []

  let index = 0
  for (const [svcName, svc] of Object.entries(services)) {
    const image = (svc.image as string) ?? ''
    const type = inferType(image)
    const props = defaultProps(type)

    // Enrich properties from image/config
    switch (type) {
      case 'server':
      case 'container': {
        const runtime = inferRuntime(image)
        if (runtime) {
          props.runtime = runtime
          if (runtime === 'custom') props.custom_image = image
        } else {
          props.runtime = 'custom'
          props.custom_image = image
        }
        // Extract port from ports array
        const ports = svc.ports as string[] | undefined
        if (ports?.[0]) {
          const portStr = String(ports[0]).split(':').pop()?.split('/')[0]
          const port = Number(portStr)
          if (port > 0 && port < 65536) props.port = port
        }
        break
      }
      case 'database':
        props.engine = inferDbEngine(image)
        break
      case 'cache':
        props.engine = inferCacheEngine(image)
        break
      case 'queue':
        props.engine = inferQueueEngine(image)
        break
      case 'monitoring': {
        const img = image.toLowerCase()
        if (img.includes('grafana')) props.engine = 'grafana'
        else if (img.includes('datadog')) props.engine = 'datadog'
        else props.engine = 'prometheus'
        break
      }
    }

    // Replicas from deploy block
    const deploy = svc.deploy as Record<string, unknown> | undefined
    if (deploy?.replicas) {
      props.replicas = Number(deploy.replicas)
    }

    const id = `node_${nanoid(8)}`
    nameToId.set(svcName, id)

    nodes.push({
      id,
      type: 'archNode',
      position: gridPosition(index++),
      data: {
        componentType: type,
        label: svcName,
        properties: props,
      },
    })
  }

  // Build a quick lookup: nodeId → componentType
  const idToType = new Map(nodes.map(n => [n.id, n.data.componentType]))

  // Build edges from depends_on
  for (const [svcName, svc] of Object.entries(services)) {
    const raw = svc.depends_on
    if (!raw) continue

    const deps: string[] = Array.isArray(raw) ? raw : Object.keys(raw as object)

    for (const dep of deps) {
      const sourceId = nameToId.get(svcName)
      const targetId = nameToId.get(dep)
      if (!sourceId || !targetId) {
        warnings.push(`depends_on: service "${dep}" not found — skipping edge.`)
        continue
      }

      const sourceIsQueue = idToType.get(sourceId) === 'queue'
      const targetIsQueue = idToType.get(targetId) === 'queue'
      const isQueueEdge = sourceIsQueue || targetIsQueue
      const queueRole = targetIsQueue ? 'produce' : sourceIsQueue ? 'consume' : undefined

      edges.push({
        id: `edge_${nanoid(8)}`,
        source: sourceId,
        target: targetId,
        type: isQueueEdge ? 'queueEdge' : undefined,
        data: queueRole ? { role: queueRole } : undefined,
        animated: false,
      })
    }
  }

  return { nodes, edges, warnings }
}
