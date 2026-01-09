# Migration Stash

This directory contains the schema cleanup migration that was generated before upgrading to NuxtHub 0.10.x.

## Stashed Migration

**File:** `0006_left_cannonball.sql` (38KB)
**Generated:** January 7, 2026

### Changes Included

This migration contains all the schema cleanup work:

#### Tables Removed
- `services` - Replaced by `matters_to_services` junction table
- `service_packages` - Package system deprecated
- `client_selected_packages` - Package system deprecated
- `additional_grantors` - Replaced by people/relationships system
- `notary_documents` - Notarization handled via tasking system
- `document_summaries` - Unused feature removed

#### Fields Removed
- `clientProfiles.grantorType` - Document taxonomy moved to post-MVP
- `clientProfiles.spouseName/spouseEmail/spousePhone` - Replaced by people/relationships
- `documentTemplates.grantorType` - Document taxonomy moved to post-MVP
- `documents.grantorType` - Document taxonomy moved to post-MVP
- `documents.serviceId` - Replaced by matterId

#### Fields Added
- `oauthProviders` table - New table for OAuth provider management
- `users.firebaseUid` - For OAuth authentication
- `users.password` - Made nullable for OAuth-only users
- `users.role` - Added ADVISOR enum value

#### Terminology Changes (counsel/council → attorney)
- `journeyStepProgress.counselApproved` → `attorneyApproved`
- `journeyStepProgress.counselApprovedAt` → `attorneyApprovedAt`
- `actionItems.assignedTo` enum: COUNSEL → ATTORNEY
- `journeyStepProgress.status` enum: WAITING_COUNSEL → WAITING_ATTORNEY
- `snapshotVersions.approvedByCounsel` → `approvedByAttorney`
- `snapshotVersions.counselNotes` → `attorneyNotes`

## Next Steps

After upgrading to NuxtHub 0.10.x:
1. Regenerate the migration using the new system: `npx nuxt db generate`
2. Compare with this stashed migration to ensure all changes are captured
3. Apply the migration
4. Delete this stash directory once confirmed working
