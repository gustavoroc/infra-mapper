import { useCanvasStore } from '../../store/canvas'
import { COMPONENT_CATALOG, PLAN_LIMITS } from '../../types'

export function ComponentPalette() {
  const addNode = useCanvasStore(s => s.addNode)
  const nodeCount = useCanvasStore(s => s.nodes.length)
  const plan = useCanvasStore(s => s.plan)

  const limit = PLAN_LIMITS[plan].maxComponents
  const atLimit = nodeCount >= limit

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

      {/* Free tier limit warning (RF-037) */}
      {atLimit && plan === 'free' && (
        <div style={{
          margin: '8px 10px',
          padding: '8px 10px',
          background: 'rgba(255, 190, 50, 0.1)',
          border: '1px solid rgba(255, 190, 50, 0.3)',
          borderRadius: 6,
          fontSize: 11,
          color: '#fbbf24',
        }}>
          Limit reached ({limit} components). <strong>Upgrade to Pro</strong> for unlimited.
        </div>
      )}

      {/* Component list */}
      <div style={{ padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {COMPONENT_CATALOG.map(comp => (
          <button
            key={comp.type}
            onClick={() => addNode(comp.type)}
            disabled={atLimit}
            title={comp.description}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 6,
              color: atLimit ? 'var(--text-secondary)' : 'var(--text-primary)',
              cursor: atLimit ? 'not-allowed' : 'pointer',
              fontSize: 13,
              textAlign: 'left',
              transition: 'background 0.1s, border-color 0.1s',
              opacity: atLimit ? 0.5 : 1,
            }}
            onMouseEnter={e => {
              if (!atLimit) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-tertiary)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
              }
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
        {plan === 'free' ? `${nodeCount} / ${limit} components` : `${nodeCount} components`}
      </div>
    </aside>
  )
}
