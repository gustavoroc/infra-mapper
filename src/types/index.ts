// ─── Component types ────────────────────────────────────────────────────────

export type ComponentType =
  | 'server'
  | 'database'
  | 'loadbalancer'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'api'
  | 'container'
  | 'cdn'
  | 'monitoring'

export type IaCTarget = 'docker-compose' | 'terraform'

// ─── Component category (for ordering in generated code — RE-013) ────────────

export const COMPONENT_CATEGORY: Record<ComponentType, 0 | 1 | 2 | 3> = {
  loadbalancer: 0, // network/infra
  cdn: 0,
  api: 0,
  server: 1,       // compute
  container: 1,
  database: 2,     // data stores
  storage: 2,
  cache: 3,        // auxiliaries
  queue: 3,
  monitoring: 3,
}

// ─── Component metadata (palette) ───────────────────────────────────────────

export interface ComponentMeta {
  type: ComponentType
  label: string
  emoji: string
  description: string
}

export const COMPONENT_CATALOG: ComponentMeta[] = [
  { type: 'server',       label: 'Server',         emoji: '🖥️',  description: 'EC2 / VM instance' },
  { type: 'database',     label: 'Database',       emoji: '🗄️',  description: 'RDS / managed DB' },
  { type: 'loadbalancer', label: 'Load Balancer',  emoji: '⚖️',  description: 'ALB / NLB' },
  { type: 'cache',        label: 'Cache',          emoji: '⚡',  description: 'Redis / Memcached' },
  { type: 'queue',        label: 'Message Queue',  emoji: '📨',  description: 'RabbitMQ / SQS' },
  { type: 'storage',      label: 'Object Storage', emoji: '🪣',  description: 'S3 / MinIO' },
  { type: 'api',          label: 'API Gateway',    emoji: '🔀',  description: 'API Gateway' },
  { type: 'container',    label: 'Container',      emoji: '📦',  description: 'Docker / K8s pod' },
  { type: 'cdn',          label: 'CDN',            emoji: '🌐',  description: 'CloudFront / CDN' },
  { type: 'monitoring',   label: 'Monitoring',     emoji: '📊',  description: 'Prometheus / Grafana' },
]

// ─── Property definitions ────────────────────────────────────────────────────

export type PropType = 'select' | 'number' | 'string' | 'boolean'

export interface PropDef {
  key: string
  label: string
  type: PropType
  default: string | number | boolean
  options?: string[]       // for 'select'
  min?: number             // for 'number'
  max?: number             // for 'number'
}

export const RUNTIMES = [
  'node',
  'dotnet',
  'python',
  'go',
  'java',
  'ruby',
  'php',
  'rust',
  'nginx',
  'custom',
] as const

export type Runtime = typeof RUNTIMES[number]

export const RUNTIME_LABELS: Record<Runtime, string> = {
  node:   'Node.js',
  dotnet: '.NET (C#)',
  python: 'Python',
  go:     'Go',
  java:   'Java',
  ruby:   'Ruby',
  php:    'PHP',
  rust:   'Rust',
  nginx:  'Nginx (static)',
  custom: 'Custom image…',
}

export const COMPONENT_PROPS: Record<ComponentType, PropDef[]> = {
  server: [
    { key: 'runtime', label: 'Runtime', type: 'select', default: 'node',
      options: [...RUNTIMES] },
    { key: 'custom_image', label: 'Custom image', type: 'string', default: '' },
    { key: 'instance_type', label: 'Instance Type (AWS)', type: 'select', default: 't3.medium',
      options: ['t3.micro', 't3.small', 't3.medium', 't3.large', 'm5.large', 'm5.xlarge'] },
    { key: 'port', label: 'Port', type: 'number', default: 3000, min: 1, max: 65535 },
  ],
  database: [
    { key: 'engine', label: 'Engine', type: 'select', default: 'postgres',
      options: ['postgres', 'mysql', 'mariadb'] },
    { key: 'allocated_storage', label: 'Storage (GB)', type: 'number', default: 20, min: 5, max: 16384 },
    { key: 'port', label: 'Port', type: 'number', default: 5432, min: 1, max: 65535 },
  ],
  loadbalancer: [
    { key: 'type', label: 'Type', type: 'select', default: 'application', options: ['application', 'network'] },
    { key: 'internal', label: 'Internal', type: 'boolean', default: false },
  ],
  cache: [
    { key: 'engine', label: 'Engine', type: 'select', default: 'redis', options: ['redis', 'memcached'] },
    { key: 'max_memory', label: 'Max Memory', type: 'string', default: '256mb' },
  ],
  queue: [
    { key: 'engine', label: 'Engine', type: 'select', default: 'rabbitmq', options: ['rabbitmq', 'kafka'] },
  ],
  storage: [
    { key: 'versioning', label: 'Versioning', type: 'boolean', default: false },
  ],
  api: [
    { key: 'protocol', label: 'Protocol', type: 'select', default: 'HTTP', options: ['HTTP', 'HTTPS', 'WebSocket'] },
  ],
  container: [
    { key: 'runtime', label: 'Runtime', type: 'select', default: 'node',
      options: [...RUNTIMES] },
    { key: 'custom_image', label: 'Custom image', type: 'string', default: '' },
    { key: 'replicas', label: 'Replicas', type: 'number', default: 2, min: 1, max: 100 },
    { key: 'cpu', label: 'CPU', type: 'string', default: '250m' },
    { key: 'memory', label: 'Memory', type: 'string', default: '512Mi' },
  ],
  cdn: [
    { key: 'price_class', label: 'Price Class', type: 'select', default: 'PriceClass_100',
      options: ['PriceClass_100', 'PriceClass_200', 'PriceClass_All'] },
  ],
  monitoring: [
    { key: 'engine', label: 'Stack', type: 'select', default: 'prometheus', options: ['prometheus', 'grafana', 'datadog'] },
    { key: 'port', label: 'Port', type: 'number', default: 9090, min: 1, max: 65535 },
  ],
}

// ─── Node / Edge (canvas state) ──────────────────────────────────────────────

export type NodeProperties = Record<string, string | number | boolean>

export interface ArchNodeData extends Record<string, unknown> {
  componentType: ComponentType
  label: string
  properties: NodeProperties
}

// ─── Project persistence ─────────────────────────────────────────────────────

export interface Project {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
  canvas: { zoom: number; pan_x: number; pan_y: number }
  nodes: SerializedNode[]
  connections: SerializedConnection[]
  settings: { active_target: IaCTarget }
}

export interface SerializedNode {
  id: string
  type: ComponentType
  label: string
  x: number
  y: number
  properties: NodeProperties
}

export interface SerializedConnection {
  id: string
  from: string
  to: string
}

// ─── Plan limits ─────────────────────────────────────────────────────────────

export type Plan = 'free' | 'pro'

export const PLAN_LIMITS = {
  free: { maxComponents: 15, maxProjects: 1, targets: ['docker-compose'] as IaCTarget[] },
  pro:  { maxComponents: Infinity, maxProjects: Infinity, targets: ['docker-compose', 'terraform'] as IaCTarget[] },
}
