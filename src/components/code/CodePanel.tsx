import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { yaml } from '@codemirror/lang-yaml'
import { oneDark } from '@codemirror/theme-one-dark'
import { useCanvasStore } from '../../store/canvas'
import { generateCode } from '../../generators'
import type { IaCTarget } from '../../types'
import { PLAN_LIMITS } from '../../types'

// Debounce helper — RE-007 (max 300ms)
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function CodePanel() {
  const nodes = useCanvasStore(s => s.nodes)
  const edges = useCanvasStore(s => s.edges)
  const activeTarget = useCanvasStore(s => s.activeTarget)
  const setTarget = useCanvasStore(s => s.setTarget)
  const plan = useCanvasStore(s => s.plan)

  const debouncedNodes = useDebounced(nodes, 200) // well within 300ms (RE-007)
  const debouncedEdges = useDebounced(edges, 200)

  const code = useMemo(
    () => generateCode(debouncedNodes, debouncedEdges, activeTarget),
    [debouncedNodes, debouncedEdges, activeTarget]
  )

  const [copied, setCopied] = useState(false)

  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  // Init CodeMirror (RF-017)
  useEffect(() => {
    if (!editorRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: code,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          yaml(),           // works for YAML; close enough for HCL highlighting
          oneDark,
          EditorView.editable.of(false),
          EditorView.theme({
            '&': { background: 'var(--bg-primary)', height: '100%', fontSize: '12px' },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-gutters': { background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', color: 'var(--text-secondary)' },
            '.cm-content': { fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" },
          }),
        ],
      }),
      parent: editorRef.current,
    })
    viewRef.current = view

    return () => { view.destroy(); viewRef.current = null }
  }, []) // init once

  // Update content when code changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: code },
    })
  }, [code])

  // Copy to clipboard (RF-021)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  // Download (RF-022)
  const handleDownload = useCallback(() => {
    const filename = activeTarget === 'terraform' ? 'main.tf' : 'docker-compose.yml'
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [code, activeTarget])

  const availableTargets = PLAN_LIMITS[plan].targets
  const TARGETS: { id: IaCTarget; label: string }[] = [
    { id: 'docker-compose', label: 'Docker Compose' },
    { id: 'terraform',      label: 'Terraform (AWS)' },
  ]

  return (
    <div style={{
      width: 420,
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--bg-secondary)',
      }}>
        {/* Target tabs (RF-018) */}
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {TARGETS.map(t => {
            const available = availableTargets.includes(t.id)
            const active = activeTarget === t.id
            return (
              <button
                key={t.id}
                onClick={() => available && setTarget(t.id)}
                title={!available ? 'Available on Pro plan' : undefined}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  color: active ? 'var(--accent)' : available ? 'var(--text-secondary)' : 'var(--text-secondary)',
                  cursor: available ? 'pointer' : 'not-allowed',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  opacity: available ? 1 : 0.45,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {!available && <span style={{ fontSize: 10 }}>🔒</span>}
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <button onClick={handleCopy} style={actionBtnStyle} title="Copy code (Ctrl+C)">
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
        <button onClick={handleDownload} style={actionBtnStyle} title="Download file">
          ⬇ Download
        </button>
      </div>

      {/* Code editor (RF-017) */}
      <div
        ref={editorRef}
        style={{ flex: 1, overflow: 'hidden' }}
      />
    </div>
  )
}

const actionBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: 12,
  whiteSpace: 'nowrap',
}
