# Arch Builder — AI Agent Reference

This file is the single source of truth for any AI agent working in this repository.
Read this before touching any file.

---

## 1. What this project is

**Arch Builder** is a browser-only web app (no backend yet) where users visually
compose infrastructure diagrams and get valid IaC code generated in real time.

- Left panel → component palette (drag to add nodes)
- Center → interactive canvas (@xyflow/react)
- Right panel (properties) → configure selected node
- Far right panel → generated code (CodeMirror viewer)

The code generator runs **entirely on the client** — no server round-trip.
This is intentional: it keeps latency under 300 ms (RE-007) and simplifies the MVP.

---

## 2. Stack

| Layer | Library | Version |
|---|---|---|
| Framework | React + TypeScript | 18 / 5 |
| Build | Vite + `@tailwindcss/vite` | 8 / 4 |
| Canvas | `@xyflow/react` | latest |
| State | Zustand | 5 |
| Undo/redo | zundo | 3 |
| Code viewer | CodeMirror 6 | 6 |
| ID generation | nanoid | 5 |
| Auth + DB | Supabase | **not yet integrated** |

---

## 3. File map

```
src/
├── types/index.ts                  ← SINGLE source of domain types. Read this first.
│                                     Contains: ComponentType, PropDef, ArchNodeData,
│                                     COMPONENT_CATALOG, COMPONENT_PROPS,
│                                     RUNTIMES, RUNTIME_LABELS, PLAN_LIMITS
│
├── store/canvas.ts                 ← Zustand store (all canvas state + actions).
│                                     Uses zundo `temporal` middleware for undo/redo.
│                                     Temporal store accessed via:
│                                       useStore(useCanvasStore.temporal)
│
├── generators/
│   ├── normalizer.ts               ← label → snake_case resource name (RE-004/005)
│   ├── docker-compose.ts           ← generateDockerCompose(nodes, edges) → string
│   ├── terraform.ts                ← generateTerraform(nodes, edges) → string
│   └── index.ts                    ← dispatcher: generateCode(nodes, edges, target)
│
├── components/
│   ├── canvas/
│   │   ├── CanvasPane.tsx          ← ReactFlow wrapper. Handles keyboard shortcuts,
│   │   │                             undo/redo buttons, empty state, status counters.
│   │   └── nodes/ArchNode.tsx      ← Single custom node component for all 10 types.
│   │                                 Double-click label to rename inline.
│   ├── sidebar/
│   │   └── ComponentPalette.tsx    ← Left panel. Calls store.addNode(type).
│   │                                 Shows freemium limit warning (RF-037).
│   ├── properties/
│   │   └── PropertiesPanel.tsx     ← Right panel. Renders PropField per COMPONENT_PROPS.
│   │                                 Hides custom_image unless runtime === 'custom'.
│   └── code/
│       └── CodePanel.tsx           ← CodeMirror viewer. Debounces 200ms before
│                                     regenerating (RE-007). Copy + download buttons.
│
├── App.tsx                         ← Layout shell. Header (project name, clear, plan badge)
│                                     + four-column flex layout.
├── index.css                       ← CSS vars (--bg-primary, --accent, etc.) + React Flow
│                                     style overrides. All colors defined here.
└── main.tsx                        ← Entry point. Wraps App in StrictMode.
```

---

## 4. Domain model

### Component types (10)

```
server | database | loadbalancer | cache | queue |
storage | api | container | cdn | monitoring
```

Defined in `COMPONENT_CATALOG` (`types/index.ts`). Each has: `type`, `label`, `emoji`, `description`.

### Node data shape (`ArchNodeData`)

```ts
{
  componentType: ComponentType
  label: string           // display name, also source for resource names
  properties: Record<string, string | number | boolean>
}
```

### Edge shape (standard React Flow `Edge`)

```ts
{ id, source, target, sourceHandle?, targetHandle? }
```

Connections are directional. An edge `A → B` means "A depends on B" (or "A communicates to B").
In Docker Compose this becomes `depends_on`. In Terraform it becomes a `security_group_rule`.

### Plan limits

```ts
PLAN_LIMITS = {
  free: { maxComponents: 15, maxProjects: 1, targets: ['docker-compose'] },
  pro:  { maxComponents: Infinity, maxProjects: Infinity, targets: ['docker-compose', 'terraform'] },
}
```

The current plan is stored in `store.plan` and defaults to `'free'`.

---

## 5. State — Zustand store

**File:** `src/store/canvas.ts`

### Reading state (in components)

```ts
const nodes = useCanvasStore(s => s.nodes)
const selectedNodeId = useCanvasStore(s => s.selectedNodeId)
```

### Dispatching actions

```ts
const addNode = useCanvasStore(s => s.addNode)
addNode('server')  // type: ComponentType

useCanvasStore.getState().renameNode(id, 'New Name')
useCanvasStore.getState().updateNodeProperty(id, 'port', 8080)
useCanvasStore.getState().removeNode(id)
useCanvasStore.getState().clearCanvas()
```

### Undo/redo (zundo)

```ts
import { useStore } from 'zustand'
const { undo, redo, pastStates, futureStates } = useStore(useCanvasStore.temporal)
```

**Important:** `useTemporalStore` does NOT exist in zundo v3. Always use `useStore(useCanvasStore.temporal)`.

The temporal store only tracks `{ nodes, edges }` (partialize). UI state (selectedNodeId, plan, etc.) is NOT tracked.

---

## 6. Generators

Both generators are **pure functions** — they take `nodes` and `edges` and return a `string`.
No side effects, no async. Safe to call on every render (debounced in CodePanel).

### Resource name normalization (`normalizer.ts`)

```ts
toResourceName('API Server')  // → 'api_server'
toResourceName('DB 2!')       // → 'db_2'

buildResourceMap(nodes)       // → Map<nodeId, uniqueResourceName>
// handles collisions: 'server', 'server_2', 'server_3'
```

### Adding a new IaC target

1. Create `src/generators/my-target.ts` exporting `generateMyTarget(nodes, edges): string`
2. Add the target ID to `IaCTarget` type in `types/index.ts`
3. Add it to `PLAN_LIMITS.pro.targets` (and `.free.targets` if applicable)
4. Add a `case` in `src/generators/index.ts`
5. Add the tab button in `src/components/code/CodePanel.tsx` (`TARGETS` array)

---

## 7. Adding a new component type

All component metadata lives in `src/types/index.ts`. No other file needs to be changed
for the type to appear in the palette, properties panel, and node renderer.

### Step-by-step

**1.** Add to the `ComponentType` union:
```ts
export type ComponentType =
  | 'server' | 'database' | ... | 'your_type'
```

**2.** Add to `COMPONENT_CATEGORY` (pick 0=network, 1=compute, 2=data, 3=auxiliary):
```ts
your_type: 2,
```

**3.** Add to `COMPONENT_CATALOG`:
```ts
{ type: 'your_type', label: 'Your Component', emoji: '🔧', description: 'Short description' }
```

**4.** Add to `COMPONENT_PROPS`:
```ts
your_type: [
  { key: 'engine', label: 'Engine', type: 'select', default: 'option_a', options: ['option_a', 'option_b'] },
  { key: 'port',   label: 'Port',   type: 'number', default: 9000, min: 1, max: 65535 },
],
```

**5.** Handle in `src/generators/docker-compose.ts`:
- Add to `FALLBACK_IMAGE`: `your_type: 'some-image:tag'`
- Add to `DEFAULT_PORTS` if applicable
- Add to `STATEFUL` set if it needs a named volume
- Handle env vars in `buildEnv()` if needed

**6.** Handle in `src/generators/terraform.ts`:
- Add to `AWS_RESOURCE`: `your_type: 'aws_resource_type'`
- Add a `case 'your_type':` in `buildResourceBody()`

That's it — the node renders automatically via `ArchNode.tsx` using the emoji and label from the catalog.

---

## 8. Adding a new property to an existing component

Edit only `src/types/index.ts` → `COMPONENT_PROPS[componentType]`.

```ts
{ key: 'my_prop', label: 'My Property', type: 'select', default: 'val_a', options: ['val_a', 'val_b'] }
```

Then use `properties.my_prop` in the relevant generator. The properties panel renders it automatically.

**Conditional visibility:** If a property should only show when another has a specific value, add a guard in `PropertiesPanel.tsx` (see how `custom_image` is hidden unless `runtime === 'custom'`).

---

## 9. Business rules cheat sheet

| Rule | What it means in code |
|---|---|
| RE-001 | `addNode()` checks `nodes.length >= PLAN_LIMITS[plan].maxComponents` |
| RE-004 | `toResourceName(label)` in `normalizer.ts` |
| RE-005 | `buildResourceMap()` adds `_2`, `_3` suffixes |
| RE-006 | `addEdge()` rejects if `source === target` or duplicate exists |
| RE-007 | CodePanel debounces 200 ms before calling generator |
| RE-008 | `defaultProperties()` in store reads from `COMPONENT_PROPS[type]` |
| RE-012 | `removeNode()` filters edges where `source` or `target` === nodeId |
| RE-013 | Generators sort by `COMPONENT_CATEGORY` before iterating |
| RE-014 | Generators join with `\n` (LF). 2-space indent. UTF-8 implicit. |

---

## 10. CSS conventions

All colors are CSS variables defined in `src/index.css`:

| Variable | Usage |
|---|---|
| `--bg-primary` | Canvas background (`#0d1117`) |
| `--bg-secondary` | Panels, header (`#161b22`) |
| `--bg-tertiary` | Input backgrounds, hover states (`#21262d`) |
| `--border` | All borders (`#30363d`) |
| `--text-primary` | Main text (`#e6edf3`) |
| `--text-secondary` | Labels, hints (`#8b949e`) |
| `--accent` | Lime green highlight (`#a8ff3e`) |
| `--accent-dim` | Accent with opacity for backgrounds |

**Never hardcode colors** in component files. Always use `var(--token)`.

React Flow class overrides (`.react-flow__handle`, `.react-flow__edge-path`, etc.)
are all in `src/index.css`. Don't add them inline in components.

---

## 11. Keyboard shortcuts (implemented)

| Shortcut | Action | Where handled |
|---|---|---|
| `Delete` / `Backspace` | Remove selected node | `CanvasPane.tsx` `onKeyDown` |
| `Ctrl+Z` | Undo | `CanvasPane.tsx` + `useCanvasStore.temporal` |
| `Ctrl+Shift+Z` | Redo | `CanvasPane.tsx` + `useCanvasStore.temporal` |
| Double-click node label | Inline rename | `ArchNode.tsx` |
| Click edge | Delete edge | `onEdgeClick` in `CanvasPane.tsx` |

---

## 12. What is NOT yet built (next steps)

- **Auth + persistence** — Supabase integration (`src/lib/supabase.ts` exists but is empty).
  Needs: signup/login (RF-025/026), save/load project (RF-027/028), project list (RF-029/030), auto-save (RF-031).
- **RF-024** — Selecting a canvas node should scroll the code panel to the matching resource block.
- **RF-033** — Remaining keyboard shortcuts: `Ctrl+S` (save), `Ctrl+A` (select all), `+/-` (zoom), `Escape`.
- **Code splitting** — CodeMirror + React Flow together push the bundle to ~680 kB. Lazy-load CodePanel.
- **Terraform target lock** — The UI disables the Terraform tab for free users, but the generator itself
  has no guard. Add a check in `generateCode()` if server-side generation is added later.

---

## 13. Dev commands

```bash
npm run dev        # start dev server (Vite HMR)
npm run build      # production build → dist/
npx tsc --noEmit   # type check only (no emit)
npm run lint       # ESLint
```

No test suite yet. Type check (`tsc --noEmit`) is the primary correctness gate.
