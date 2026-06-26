// Flat ESLint config. The key rule here enforces design.md Decision 2:
// server/core/** is the pure domain and MUST NOT import framework or infrastructure code.
export default [
  {
    files: ['server/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'nuxt', message: 'server/core is framework-agnostic (Decision 2).' },
            { name: 'nitropack', message: 'server/core is framework-agnostic (Decision 2).' },
            { name: 'h3', message: 'server/core is framework-agnostic (Decision 2).' },
            { name: 'better-sqlite3', message: 'server/core must not touch infrastructure (Decision 2).' },
            { name: 'drizzle-orm', message: 'server/core must not touch infrastructure (Decision 2).' },
          ],
          patterns: [
            { group: ['@infra/*', '~/*', '@/*', '#imports'], message: 'server/core depends inward only (Decision 2).' },
          ],
        },
      ],
    },
  },
]
