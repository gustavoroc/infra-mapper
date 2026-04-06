import { useCanvasStore } from '../../store/canvas'
import { COMPONENT_CATALOG } from '../../types'

export function ComponentPalette() {
  const addNode = useCanvasStore(s => s.addNode)
  const nodeCount = useCanvasStore(s => s.nodes.length)

  return (
    <aside style={{
      width: 200,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Components
        </h3>
      </div>

      {/* Component list */}
      <div style={{ padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {COMPONENT_CATALOG.map(comp => (
          <button
            key={comp.type}
            onClick={() => addNode(comp.type)}
            title={comp.description}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 6,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 13,
              textAlign: 'left',
              transition: 'background 0.1s, border-color 0.1s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-tertiary)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{comp.emoji}</span>
            <div>
              <div style={{ fontWeight: 500 }}>{comp.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>{comp.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Counter at bottom */}
      <div style={{
        marginTop: 'auto',
        padding: '10px 14px',
        borderTop: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--text-secondary)',
      }}>
        {nodeCount} components
      </div>
    </aside>
  )
}
