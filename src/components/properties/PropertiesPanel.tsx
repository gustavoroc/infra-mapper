import { useCanvasStore } from '../../store/canvas'
import { COMPONENT_PROPS, COMPONENT_CATALOG, RUNTIME_LABELS, type PropDef, type Runtime } from '../../types'

export function PropertiesPanel() {
  const selectedNodeId = useCanvasStore(s => s.selectedNodeId)
  const nodes = useCanvasStore(s => s.nodes)
  const renameNode = useCanvasStore(s => s.renameNode)
  const updateNodeProperty = useCanvasStore(s => s.updateNodeProperty)
  const removeNode = useCanvasStore(s => s.removeNode)

  const node = nodes.find(n => n.id === selectedNodeId)

  if (!node) {
    return (
      <aside style={panelStyle}>
        <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={sectionTitleStyle}>Properties</h3>
        </div>
        <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
          Select a component to configure its properties.
        </div>
      </aside>
    )
  }

  const { componentType, label, properties } = node.data
  const propDefs = COMPONENT_PROPS[componentType]
  const meta = COMPONENT_CATALOG.find(c => c.type === componentType)

  return (
    <aside style={panelStyle}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={sectionTitleStyle}>Properties</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 18 }}>{meta?.emoji}</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {componentType}
          </span>
        </div>
      </div>

      <div style={{ padding: '12px 14px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Label field (RF-005) */}
        <Field label="Label">
          <input
            type="text"
            value={label}
            maxLength={50}
            onChange={e => renameNode(node.id, e.target.value)}
            style={inputStyle}
          />
        </Field>

        {/* Dynamic properties (RF-014, RF-015, RF-016) */}
        {propDefs.map(def => {
          // Hide custom_image unless runtime === 'custom'
          if (def.key === 'custom_image' && properties['runtime'] !== 'custom') return null
          return (
            <PropField
              key={def.key}
              def={def}
              value={properties[def.key] ?? def.default}
              onChange={val => updateNodeProperty(node.id, def.key, val)}
            />
          )
        })}

        {/* Remove button */}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => removeNode(node.id)}
            style={{
              width: '100%',
              padding: '7px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 6,
              color: '#f87171',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Remove component
          </button>
        </div>
      </div>
    </aside>
  )
}

// ─── PropField ────────────────────────────────────────────────────────────────

function PropField({
  def,
  value,
  onChange,
}: {
  def: PropDef
  value: string | number | boolean
  onChange: (v: string | number | boolean) => void
}) {
  return (
    <Field label={def.label}>
      {def.type === 'select' && (
        <select
          value={value as string}
          onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {def.options!.map(opt => (
            <option key={opt} value={opt}>
              {def.key === 'runtime'
                ? RUNTIME_LABELS[opt as Runtime] ?? opt
                : opt}
            </option>
          ))}
        </select>
      )}

      {def.type === 'number' && (
        <input
          type="number"
          value={value as number}
          min={def.min}
          max={def.max}
          onChange={e => {
            const n = Number(e.target.value)
            if (def.min !== undefined && n < def.min) return
            if (def.max !== undefined && n > def.max) return
            onChange(n)
          }}
          style={inputStyle}
        />
      )}

      {def.type === 'string' && (
        <input
          type="text"
          value={value as string}
          onChange={e => onChange(e.target.value)}
          style={inputStyle}
        />
      )}

      {def.type === 'boolean' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={e => onChange(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            {value ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      )}
    </Field>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  width: 220,
  background: 'var(--bg-secondary)',
  borderLeft: '1px solid var(--border)',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  fontSize: 13,
  padding: '6px 8px',
  outline: 'none',
  boxSizing: 'border-box',
}
