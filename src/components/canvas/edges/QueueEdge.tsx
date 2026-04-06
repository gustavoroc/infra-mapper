import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

/**
 * Animated edge for Message Queue connections.
 *
 * role='produce'  → A → Queue  (producer publishing messages)
 *   Amber packets, faster cadence, pulses on arrival
 *
 * role='consume'  → Queue → B  (queue delivering to consumer)
 *   Green packets, steady cadence, spread spacing
 *
 * role='route'    → Queue → Queue  (fan-out / routing)
 *   Purple packets, branching feel
 */

type QueueRole = 'produce' | 'consume' | 'route'

interface QueueEdgeData extends Record<string, unknown> {
  role: QueueRole
}

const ROLE_STYLE: Record<QueueRole, {
  color: string
  glowColor: string
  count: number
  duration: number
  r: number
  strokeOpacity: number
}> = {
  produce: {
    color:        '#f59e0b',   // amber — data going IN to queue
    glowColor:    '#f59e0b44',
    count:        4,
    duration:     1.1,         // fast — producers can burst
    r:            3.5,
    strokeOpacity: 0.5,
  },
  consume: {
    color:        '#a8ff3e',   // accent green — data flowing OUT to consumer
    glowColor:    '#a8ff3e33',
    count:        3,
    duration:     1.8,         // steady consumer pace
    r:            3,
    strokeOpacity: 0.4,
  },
  route: {
    color:        '#a78bfa',   // purple — queue-to-queue routing
    glowColor:    '#a78bfa33',
    count:        3,
    duration:     1.4,
    r:            3,
    strokeOpacity: 0.45,
  },
}

function FlowingPackets({
  edgeId,
  role,
}: {
  edgeId: string
  role: QueueRole
}) {
  const s = ROLE_STYLE[role]

  return (
    <>
      {Array.from({ length: s.count }).map((_, i) => {
        // Stagger: each packet starts at evenly spaced offset into the animation
        const begin = `-${((i / s.count) * s.duration).toFixed(2)}s`
        return (
          <g key={i}>
            {/* Glow halo */}
            <circle r={s.r + 3} fill={s.glowColor} opacity={0.6}>
              <animateMotion
                dur={`${s.duration}s`}
                repeatCount="indefinite"
                begin={begin}
                calcMode="linear"
              >
                <mpath href={`#${edgeId}`} />
              </animateMotion>
            </circle>

            {/* Solid packet */}
            <circle r={s.r} fill={s.color}>
              <animateMotion
                dur={`${s.duration}s`}
                repeatCount="indefinite"
                begin={begin}
                calcMode="linear"
              >
                <mpath href={`#${edgeId}`} />
              </animateMotion>

              {/* Opacity pulse on each packet */}
              <animate
                attributeName="opacity"
                values="1;0.5;1"
                dur={`${s.duration / 2}s`}
                repeatCount="indefinite"
                begin={begin}
              />
            </circle>
          </g>
        )
      })}
    </>
  )
}

function QueueEdgeComponent({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
  data,
}: EdgeProps) {
  const role = (data as QueueEdgeData | undefined)?.role ?? 'consume'
  const s = ROLE_STYLE[role]

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      {/* Glow track (blurred duplicate path) */}
      <path
        d={edgePath}
        stroke={s.glowColor}
        strokeWidth={6}
        fill="none"
        style={{ filter: 'blur(3px)' }}
      />

      {/* Main path (used by mpath for animateMotion) */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? s.color : `color-mix(in srgb, ${s.color} 60%, #8b949e)`,
          strokeWidth: selected ? 2.5 : 1.5,
          strokeOpacity: selected ? 1 : s.strokeOpacity + 0.2,
          strokeDasharray: '5 4',
          // CSS animation for the dashes themselves
          animation: `queue-dash-${role} ${s.duration * 2}s linear infinite`,
        }}
      />

      {/* Flowing message packets */}
      <FlowingPackets edgeId={id} role={role} />
    </>
  )
}

export const QueueEdge = memo(QueueEdgeComponent)
