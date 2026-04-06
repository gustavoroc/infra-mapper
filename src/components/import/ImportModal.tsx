import { useState, useCallback } from 'react'
import type { IaCTarget } from '../../types'
import { parseDockerCompose, parseTerraform } from '../../parsers'
import { useCanvasStore } from '../../store/canvas'

interface Props {
  onClose: () => void
}

const PLACEHOLDER: Record<IaCTarget, string> = {
  'docker-compose': `services:
  api:
    image: node:22-alpine
    ports:
      - "3000:3000"
    depends_on:
      - database
      - cache

  database:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app

  cache:
    image: redis:7-alpine`,

  terraform: `resource "aws_instance" "api_server" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  tags = { Name = "API Server" }
}

resource "aws_db_instance" "database" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  tags = { Name = "Database" }
}

resource "aws_security_group_rule" "api_server_to_database" {
  type              = "ingress"
  security_group_id = aws_security_group.database.id
  source_security_group_id = aws_security_group.api_server.id
}`,
}

export function ImportModal({ onClose }: Props) {
  const [target, setTarget] = useState<IaCTarget>('docker-compose')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const clearCanvas = useCanvasStore(s => s.clearCanvas)
  const addNodeRaw = useCanvasStore.getState

  const handleImport = useCallback(() => {
    setError(null)
    setWarnings([])

    if (!content.trim()) {
      setError('Paste your infrastructure definition first.')
      return
    }

    try {
      const result = target === 'docker-compose'
        ? parseDockerCompose(content)
        : parseTerraform(content)

      if (result.nodes.length === 0) {
        setError('No components could be identified in the provided file.')
        if (result.warnings.length > 0) setWarnings(result.warnings)
        return
      }

      // Replace canvas with parsed result
      clearCanvas()
      useCanvasStore.setState({
        nodes: result.nodes,
        edges: result.edges,
        selectedNodeId: null,
      })

      if (result.warnings.length > 0) {
        setWarnings(result.warnings)
        // Don't close immediately so user sees the warnings
        return
      }

      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }, [content, target, clearCanvas, onClose])

  return (
    /* Backdrop */
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        width: 640,
        maxWidth: '95vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🔄</span>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Import infrastructure
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Paste an existing file and we'll reverse-engineer it into the canvas
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: 20, lineHeight: 1, padding: 4,
            }}
          >×</button>
        </div>

        {/* Target tabs */}
        <div style={{
          padding: '12px 20px 0',
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border)',
        }}>
          {(['docker-compose', 'terraform'] as IaCTarget[]).map(t => (
            <button
              key={t}
              onClick={() => { setTarget(t); setError(null); setWarnings([]) }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px 6px 0 0',
                border: '1px solid var(--border)',
                borderBottom: target === t ? '1px solid var(--bg-secondary)' : '1px solid var(--border)',
                background: target === t ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                color: target === t ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: target === t ? 600 : 400,
                marginBottom: -1,
              }}
            >
              {t === 'docker-compose' ? 'Docker Compose' : 'Terraform (AWS)'}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); setError(null) }}
            placeholder={PLACEHOLDER[target]}
            spellCheck={false}
            style={{
              flex: 1,
              minHeight: 280,
              background: 'var(--bg-primary)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: 12,
              lineHeight: 1.6,
              padding: '12px 14px',
              resize: 'none',
              outline: 'none',
            }}
          />

          {/* Error */}
          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 6,
              fontSize: 12,
              color: '#f87171',
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: 6,
              fontSize: 12,
              color: '#fbbf24',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}>
              {warnings.map((w, i) => <span key={i}>⚠ {w}</span>)}
              <button
                onClick={onClose}
                style={{
                  marginTop: 6, alignSelf: 'flex-start',
                  padding: '3px 10px', background: 'transparent',
                  border: '1px solid rgba(251,191,36,0.4)',
                  borderRadius: 4, color: '#fbbf24', cursor: 'pointer', fontSize: 11,
                }}
              >
                Close anyway
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleImport} style={importBtnStyle}>
            Import to canvas →
          </button>
        </div>
      </div>
    </div>
  )
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 13,
}

const importBtnStyle: React.CSSProperties = {
  padding: '7px 16px',
  background: 'var(--accent)',
  border: 'none',
  borderRadius: 6,
  color: '#0d1117',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
}
