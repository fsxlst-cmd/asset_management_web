# Layered architecture — the dependency rule

Per `openspec/changes/cash-asset-tracking/design.md` (Decision 2), dependencies point **inward only**:

```
PRESENTATION   app/                     Vue components, pages, Pinia (view state only)
      │  HTTP (typed via shared/)
TRANSPORT      server/api/              Nitro routes — THIN: validate → use-case → map result
      │
APPLICATION    server/core/application/ use-cases orchestrating domain + repos
      │
DOMAIN         server/core/domain/      entities, value objects, domain services
      ▲                                  (PURE — no Nuxt, Nitro, or Drizzle)
PORTS          server/core/ports/       repository INTERFACES
      ▲
INFRASTRUCTURE server/infrastructure/   Drizzle/SQLite adapters implement ports
```

## The rule

`server/core/**` MUST NOT import from:

- `nuxt`, `nitropack`, `h3`, `#imports`, `~/*`, `@/*` (presentation / transport)
- `drizzle-orm`, `better-sqlite3`, `@infra/*` (infrastructure)

The domain depends only on its own types and the `ports/` interfaces. Infrastructure
depends on the domain (to implement the ports), never the reverse. This keeps the
financial rules (Money, balances, cross-check) unit-testable with zero infrastructure
and makes Drizzle/Nitro swappable details.

Enforced by `eslint.config.mjs` (`no-restricted-imports` scoped to `server/core/`).
If you ever need infrastructure inside the core, you need a new port instead.
