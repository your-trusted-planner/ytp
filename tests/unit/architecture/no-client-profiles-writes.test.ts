/**
 * Architectural invariant — no clientProfiles writes outside seed bootstrap.
 *
 * The `client_profiles` table is deprecated under the Belly Button Principle:
 *   - identity fields (address, phone, dateOfBirth) live on `people`
 *   - client business fields (hasMinorChildren, businessName, googleDriveFolderId,
 *     hasWill, hasTrust, etc.) live on `clients`
 *
 * Writing to `clientProfiles` creates silent data drift because nothing reads
 * it as the source of truth anymore. This test fails if any new code adds a
 * write back to it, locking the pattern out for future agents.
 *
 * Migrations and the schema file itself are allowed (they manage the legacy
 * column definitions for the historical record). The seed bootstrap is also
 * allowed during transition but should be cleaned up when the table is dropped.
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const PROJECT_ROOT = resolve(__dirname, '../../..')

function findWrites(): string[] {
  // Look for db.insert(schema.clientProfiles) and db.update(schema.clientProfiles)
  // anywhere in server/ except migrations and the schema file itself.
  let output = ''
  try {
    output = execSync(
      `grep -rn -E "(insert|update)\\(\\s*schema\\.clientProfiles" server --include="*.ts" `
      + `| grep -v "server/db/migrations/" `
      + `| grep -v "server/db/schema/" || true`,
      { cwd: PROJECT_ROOT, encoding: 'utf-8' }
    )
  }
  catch {
    output = ''
  }
  return output.trim().split('\n').filter(Boolean)
}

describe('Belly Button Principle — no clientProfiles writes', () => {
  it('source tree contains no insert/update against schema.clientProfiles outside migrations and schema', () => {
    const writes = findWrites()

    // We deliberately exempt seed bootstrap during the transition window.
    // Once the table is dropped, this exemption can be removed.
    const SEED_EXEMPT = /^server\/db\/seed\//
    const offenders = writes.filter(line => !SEED_EXEMPT.test(line))

    expect(offenders, `Found ${offenders.length} forbidden write(s) to clientProfiles:\n  ${offenders.join('\n  ')}`).toEqual([])
  })
})
