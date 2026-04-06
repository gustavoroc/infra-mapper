import { useCallback, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { CanvasPane } from './components/canvas/CanvasPane'
import { ComponentPalette } from './components/sidebar/ComponentPalette'
import { PropertiesPanel } from './components/properties/PropertiesPanel'
import { CodePanel } from './components/code/CodePanel'
import { ImportModal } from './components/import/ImportModal'
import { useCanvasStore } from './store/canvas'

export default function App() {
  const projectName = useCanvasStore(s => s.projectName)
  const setProjectName = useCanvasStore(s => s.setProjectName)
  const clearCanvas = useCanvasStore(s => s.clearCanvas)
  const nodeCount = useCanvasStore(s => s.nodes.length)

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(projectName)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const commitName = useCallback(() => {
    const trimmed = nameDraft.trim()
    if (trimmed) setProjectName(trimmed)
    else setNameDraft(projectName)
    setEditingName(false)
  }, [nameDraft, projectName, setProjectName])

  const handleClear = useCallback(() => {
    if (nodeCount === 0) return
    if (showClearConfirm) {
      clearCanvas()
      setShowClearConfirm(false)
    } else {
      setShowClearConfirm(true)
      setTimeout(() => setShowClearConfirm(false), 5000)
    }
  }, [nodeCount, showClearConfirm, clearCanvas])

  return (
    <ReactFlowProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>

        {/* Top bar */}
        <header style={{
          height: 48,
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          flexShrink: 0,
          zIndex: 20,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
            <div style={{
              width: 26, height: 26, background: 'var(--accent)',
              borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>
              🏗️
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              Arch Builder
            </span>
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          {/* Project name — double-click to rename */}
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              maxLength={60}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === 'Enter') commitName()
                if (e.key === 'Escape') { setEditingName(false); setNameDraft(projectName) }
              }}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--accent)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 500,
                padding: '3px 8px',
                outline: 'none',
                minWidth: 180,
              }}
            />
          ) : (
            <button
              onDoubleClick={() => { setEditingName(true); setNameDraft(projectName) }}
              title="Double-click to rename"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'text',
                padding: '3px 0',
              }}
            >
              {projectName}
            </button>
          )}

          <div style={{ flex: 1 }} />

          {/* Import button */}
          <button
            onClick={() => setShowImport(true)}
            style={{
              padding: '4px 12px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            🔄 Import
          </button>

          {nodeCount > 0 && (
            <button
              onClick={handleClear}
              style={{
                padding: '4px 10px',
                background: showClearConfirm ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                border: `1px solid ${showClearConfirm ? 'rgba(239, 68, 68, 0.5)' : 'var(--border)'}`,
                borderRadius: 6,
                color: showClearConfirm ? '#f87171' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                transition: 'all 0.15s',
              }}
            >
              {showClearConfirm ? '⚠ Click again to confirm' : 'Clear canvas'}
            </button>
          )}
        </header>

        {/* Main layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <ComponentPalette />
          <CanvasPane />
          <PropertiesPanel />
          <CodePanel />
        </div>
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </ReactFlowProvider>
  )
}
