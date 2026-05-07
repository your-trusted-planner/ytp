# Fiduciary Designation Design

**Status:** Design stage. Not implemented. Do not generate code that depends on
the fields described here until this document is updated to reflect a built
implementation.

**Owner:** TBD

**Related:** YADT (orange-book-parser) `FIDUCIARY_DESIGNATION_DESIGN.md` — the
template-side design for fiduciary designation prose blocks.

---

## Problem

The current `planRoles` table captures *who* serves in a fiduciary role and in
*what order* (via `isPrimary` and `ordinal`), but it does not explicitly capture:

1. **How co-fiduciaries exercise authority** — jointly, independently, by
   majority, or as a single fiduciary acting alone. Today this is implied by
   role type naming (`TRUSTEE` vs `CO_TRUSTEE`), which is fragile and doesn't
   distinguish "joint" from "independent" co-fiduciary action.
2. **Whether successors fill individual vacancies or replace the entire group.**
   When a husband and wife serve as co-trustees and the husband dies, does
   the first-named successor join the wife (vacancy filling) or replace both
   of them (group replacement)? The current schema has no way to express
   the former.

Both of these become acute at document generation time, where the prose
output for a fiduciary designation depends on the acting model and the
succession behavior. The template engine currently has to infer these from
role types, which produces incorrect output for any plan that diverges from
the implicit conventions.

## Proposed schema additions

Two new fields, location TBD (see "Decisions needed" below):

```typescript
actingModel: text('acting_model', {
  enum: ['SOLE', 'JOINTLY', 'INDEPENDENTLY', 'MAJORITY']
})

minimumCount: integer('minimum_count')
```

### `actingModel`

How co-fiduciaries exercise their authority:

- **`SOLE`** — single fiduciary acting alone (default when only one person is
  in the position)
- **`JOINTLY`** — all co-fiduciaries must agree and act together
- **`INDEPENDENTLY`** — any co-fiduciary may act alone without the others'
  consent
- **`MAJORITY`** — majority of co-fiduciaries must agree

### `minimumCount`

The minimum number of fiduciaries that must be serving at any given time.

When set, successors **fill individual vacancies** rather than replacing the
group. Example: husband and wife are co-trustees with `minimumCount = 2`.
Husband dies. The first-named successor fills the vacancy and serves
alongside the wife. Always two are serving.

When unset (or `= 1`), successors **replace the predecessor entirely**.
Simple sequential succession.

### Succession models enabled

| Model | actingModel | minimumCount | Behavior |
|-------|-------------|--------------|----------|
| Single + sequential successors | `SOLE` | null | Alice → Bob → Carol (replacement) |
| Co-fiduciaries, jointly | `JOINTLY` | null | Alice + Bob act together. If both unable → Carol |
| Co-fiduciaries, independently | `INDEPENDENTLY` | null | Alice or Bob can act alone. If both unable → Carol |
| Vacancy filling | `INDEPENDENTLY` | 2 | Alice + Bob. If Alice dies → Carol joins Bob. Always 2 serving. |

## Data shape for document generation

At generation time, the template engine receives a `FiduciaryConfig` object
assembled from `planRoles` rows:

```typescript
interface FiduciaryConfig {
  roleType: string             // 'agent', 'trustee', 'executor', etc.
  roleLabel: string            // 'Agent', 'Trustee' — from the template, not the plan
  actingModel: 'sole' | 'jointly' | 'independently' | 'majority'
  minimumCount?: number
  primary: FiduciaryPerson[]   // 1+ people at the primary position
  successors: FiduciaryPerson[] // flat ordered list (bench of replacements)
}

interface FiduciaryPerson {
  id: string
  fullName: string
  firstName: string
  lastName: string
  address?: string
  cityStateZip?: string
  phone?: string
  email?: string
}
```

Note: the `FiduciaryConfig` shape is what the template engine consumes — it is
*assembled* from `planRoles` rows at generation time, not stored directly.
The "primary vs successors" split is computed from `isPrimary` and `ordinal`;
the template engine doesn't see the raw rows.

## Decisions needed before implementation

1. **Where do `actingModel` and `minimumCount` live?**
   - Option A: directly on `planRoles` (denormalized — every row in a
     fiduciary group repeats the same value)
   - Option B: a new `fiduciaryConfigs` junction table keyed by
     `(planId, roleType)` that holds the configuration once per group,
     with `planRoles` rows referencing it
   - Tradeoff: Option A is simpler to query and migrate; Option B avoids
     denormalization and the data-integrity risk of mismatched values
     across rows in the same group.

2. **Default values for existing rows on migration.**
   - Single-person roles default to `actingModel = 'SOLE'`, `minimumCount = null`
   - Multi-person roles need a default — `JOINTLY` is the conservative
     legal default for co-fiduciaries when the document is silent, but
     this should be confirmed against existing plans before backfilling.

3. **Validation rules.**
   - `SOLE` should be invalid when more than one row exists at
     `isPrimary = true` for the same `roleType`
   - `minimumCount` should not exceed the count of primary fiduciaries
   - `MAJORITY` with two co-fiduciaries collapses to `JOINTLY` (no
     majority is possible with a tie) — should the system reject this
     or auto-coerce?

4. **UI implications.**
   - The fiduciary configuration UI needs a way to set acting model
     when adding the second person to a role
   - Vacancy-filling behavior needs explicit explanation in the UI —
     it's not intuitive to most users

5. **Migration path for existing plans.**
   - All existing plans need backfilled values
   - For plans with only `TRUSTEE` rows: `actingModel = 'SOLE'`
   - For plans with `CO_TRUSTEE` rows: `actingModel = ?` (this is the
     question above)
   - Audit needed: how many existing plans have multi-person roles, and
     what does the source documentation say about their acting model?

## Open questions

- Should `actingModel` be available on non-fiduciary roles too (e.g.,
  beneficiary configurations have their own acting/distribution rules
  that this schema doesn't address)? Probably not — beneficiary
  distribution is a different concept and shouldn't share this field.
- How does this interact with `planVersions`? An amendment that changes
  the acting model needs to be expressible in the version history.
- Does the template authoring system (YADT) need any schema changes to
  consume the new fields, or does the current `FiduciaryConfig`
  interface already cover what templates need?

## When this gets built

When implementation begins, this document should be updated to reflect:
- The decision on Option A vs B above
- The actual migration number and date
- Any deviations from the proposed design that emerge during build
- Removal of the "Status: design stage" banner at the top

The "Estate Plans & Fiduciary Roles" section in `CLAUDE.md` should also be
updated to describe the new fields as current schema rather than pointing
to this design doc as planned work.