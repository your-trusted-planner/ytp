# Test Suite

This directory contains the test infrastructure for the YTP (Your Trusted Planner) application.

## Quick Start

```bash
# Run unit tests
pnpm test

# Run unit tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run e2e tests (requires dev server)
pnpm test:e2e
```

## Test Strategy

We use a **three-layer testing strategy**:

| Layer | Tool | Purpose | Location |
|-------|------|---------|----------|
| **Unit** | Vitest | Test pure logic, transformations, utilities | `tests/unit/` |
| **Integration** | Vitest | Test API clients with mocked external services | `tests/integration/` |
| **E2E** | Playwright | Test full user flows in browser | `tests/e2e/` |

### When to Write Each Type

- **Unit tests**: Pure functions, data transformations, validation logic, architectural constraints
- **Integration tests**: External API clients (Lawmatics, etc.) with mocked responses
- **E2E tests**: Critical user flows (login, RBAC, signing), visual regression

## Directory Structure

```
tests/
├── README.md              # This file
├── setup.ts               # Vitest global setup
│
├── unit/                  # Unit tests (Vitest)
│   ├── architecture/      # Architectural guardrails
│   │   ├── belly-button-principle.test.ts
│   │   └── estate-plan-architecture.test.ts
│   │
│   ├── auth/              # Authentication & authorization
│   │   ├── auth.test.ts
│   │   ├── auth-api.test.ts
│   │   ├── auth-middleware.test.ts
│   │   └── rbac.test.ts
│   │
│   ├── api/               # API endpoint tests
│   │   ├── clients-api.test.ts
│   │   ├── users-api.test.ts
│   │   └── estate-plans-api.test.ts
│   │
│   ├── integrations/      # Third-party integration logic
│   │   ├── lawmatics-*.test.ts
│   │   └── wealthcounsel-*.test.ts
│   │
│   ├── estate-planning/   # Estate planning domain
│   │   ├── estate-plan-delete.test.ts
│   │   ├── person-delete.test.ts
│   │   └── person-matching.test.ts
│   │
│   ├── documents/         # Document & template handling
│   │   ├── template-renderer.test.ts
│   │   └── template-renderer-workers.test.ts
│   │
│   ├── esign/             # Electronic signature
│   │   ├── esign-integration.test.ts
│   │   ├── signature-certificate.test.ts
│   │   └── identity-verification.test.ts
│   │
│   ├── billing/           # Billing & payments
│   │   ├── invoice-number.test.ts
│   │   ├── invoice-pdf-generator.test.ts
│   │   └── lawpay-tokens.test.ts
│   │
│   ├── trust-admin/       # Trust administration
│   │   ├── trust-ledger.test.ts
│   │   └── trust-reports.test.ts
│   │
│   └── core/              # Core utilities & infrastructure
│       ├── db.test.ts
│       ├── routes.test.ts
│       ├── pagination.test.ts
│       ├── client-journey.test.ts
│       └── action-items.test.ts
│
├── integration/           # Integration tests (Vitest)
│   ├── lawmatics-client.test.ts
│   └── migration-controller.test.ts
│
├── e2e/                   # End-to-end tests (Playwright)
│   ├── auth.spec.ts
│   ├── rbac.spec.ts
│   ├── billing.spec.ts
│   ├── signature.spec.ts
│   └── google-drive-ui.spec.ts
│
├── utils/                 # Shared test utilities
│   ├── mock-repository.ts # Architecture enforcement mocks
│   ├── mock-types.ts      # Type definitions for mocks
│   ├── mock-factories.ts  # Factory functions for test data
│   ├── test-db.ts         # In-memory SQLite for tests
│   └── lawmatics-api.ts   # Lawmatics API mock handlers
│
├── fixtures/              # Static test data
│   ├── lawmatics/         # Lawmatics API response fixtures
│   └── wealthcounsel/     # WealthCounsel XML fixtures
│
└── screenshots/           # Documentation screenshots (special purpose)
    └── capture-docs.spec.ts  # Playwright script to capture UI screenshots
```

> **Note**: The `screenshots/` folder contains a Playwright script for capturing documentation screenshots. It's excluded from normal test runs. Run it separately with:
> ```bash
> npx playwright test tests/screenshots/capture-docs.spec.ts
> ```

## Key Test Categories

### 1. Architecture Guardrails (`unit/architecture/`)

These tests enforce core data architecture patterns. They're designed to catch violations during **agentic programming** before E2E tests would catch them at runtime.

**Belly Button Principle** (`belly-button-principle.test.ts`):
- Every human in the system has a `person` record
- `users` (authentication) must link to `people` via `personId`
- `clients` (client data) must link to `people` via `personId`

**Estate Plan Architecture** (`estate-plan-architecture.test.ts`):
- Estate plans require grantor persons to exist first
- Trusts, wills, and roles cascade from plans
- Cross-entity validation (trust in plan, person exists, etc.)

### 2. Mock Repository Pattern (`utils/mock-repository.ts`)

The mock repository is a **pure JavaScript enforcement layer** (no database) that validates architectural constraints. It uses in-memory Maps, not SQLite.

```typescript
import { MockRepository, createCompleteClient } from '../../utils/mock-repository'

describe('My Test', () => {
  let repo: MockRepository

  beforeEach(() => {
    repo = new MockRepository()
  })

  it('enforces belly button principle', () => {
    // This will throw BellyButtonViolationError
    expect(() => {
      repo.createClient({ personId: 'nonexistent', status: 'PROSPECT' })
    }).toThrow()
  })

  it('creates valid entity chains', () => {
    const { person, user, client } = createCompleteClient(repo)
    expect(client.personId).toBe(person.id)
  })
})
```

### 3. Test Database (`utils/test-db.ts`)

For tests that need actual database operations (Drizzle ORM), use the test database utilities:

```typescript
import { createTestDatabase, resetTestDatabase, closeTestDatabase } from '../../utils/test-db'

describe('Database Test', () => {
  let db: ReturnType<typeof createTestDatabase>

  beforeAll(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    resetTestDatabase()
  })

  afterAll(() => {
    closeTestDatabase()
  })
})
```

**Important**: The test database uses `better-sqlite3` which has caused issues. Prefer the mock repository pattern for architectural tests.

### 4. Fixtures (`fixtures/`)

Static test data for mocking external API responses:

- `lawmatics/` - JSON responses from Lawmatics API
- `wealthcounsel/` - XML document imports

### 5. E2E Tests (`e2e/`)

Playwright tests that run against the full application:

- Require dev server running (`pnpm dev`)
- Test real user interactions in browser
- Cover critical paths: auth, RBAC, billing, signatures

## Writing New Tests

### Unit Test Checklist

1. **Pick the right category** - Place in appropriate subdirectory
2. **Use mock repository** for architectural constraints (no DB needed)
3. **Use test database** only when testing actual DB operations
4. **Test one thing** - Keep tests focused and independent
5. **Use descriptive names** - `it('requires person to exist before creating client')`

### Integration Test Checklist

1. **Mock external services** - Use fixtures, not live APIs
2. **Test error handling** - 401, 429, 500 responses
3. **Test pagination** - Multi-page response handling

### E2E Test Checklist

1. **Test user flows** - Login → action → verify outcome
2. **Use data-testid** - For reliable element selection
3. **Handle async** - Wait for network/hydration

## Running Specific Tests

```bash
# Run a specific test file
pnpm test tests/unit/auth/rbac.test.ts

# Run tests matching a pattern
pnpm test -t "belly button"

# Run only architecture tests
pnpm test tests/unit/architecture/

# Run e2e in UI mode (for debugging)
pnpm exec playwright test --ui
```

## Coverage

Coverage reports are generated to `./coverage/`:

```bash
pnpm test:coverage
open coverage/index.html
```

Current thresholds (configured in `vitest.config.ts`):
- Global: 2% statements (starting low, will increase)
- `server/utils/rbac.ts`: 90% (critical path)
- `server/db/schema.ts`: 90% (source of truth)

## Troubleshooting

### "BellyButtonViolationError: person does not exist"

You're trying to create a user/client without first creating the person. Fix:

```typescript
// Wrong
repo.createUser({ personId: 'abc', ... })

// Right
const person = repo.createPerson({ firstName: 'John' })
repo.createUser({ personId: person.id, ... })
```

### "EstatePlanViolationError: plan does not exist"

Trusts, wills, and roles require the plan to exist first:

```typescript
// Wrong
repo.createTrust({ planId: 'nonexistent', ... })

// Right
const person = repo.createPerson({ firstName: 'John' })
const plan = repo.createEstatePlan({ grantorPersonId1: person.id, planType: 'TRUST_BASED' })
repo.createTrust({ planId: plan.id, ... })
```

### E2E tests fail to start

1. Make sure dev server isn't already running
2. Check `http://localhost:3000` is accessible
3. Increase timeout in `playwright.config.ts` if server is slow

### Test database "dueling drivers" error

This can happen with `better-sqlite3`. For architecture tests, prefer the mock repository which uses no database drivers.
