# Arch Builder

Visual infrastructure diagram editor that generates IaC code (Terraform + Docker Compose) in real time from a drag-and-drop canvas.

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
npm run build
npx tsc --noEmit  # type check
```

## What it does

User places infrastructure components (Server, Database, Load Balancer, Cache, etc.) on a canvas, connects them, configures properties, and gets valid Terraform HCL or Docker Compose YAML generated instantly on the right panel.

## Docs

See [CLAUDE.md](./CLAUDE.md) for full architecture reference, conventions, and how-to guides for extending the project.
