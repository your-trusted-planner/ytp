-- Migration: Add variable_mappings column to document_templates
-- This allows templates to define which variables map to database fields

-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- The migration system should prevent re-running, but if the column exists, this will error
-- The proper fix is to ensure the migration tracking is correct

-- Add variable_mappings column
ALTER TABLE document_templates ADD COLUMN variable_mappings TEXT;

-- variable_mappings stores JSON mapping of template variables to database fields
-- Format: { "variableName": { "source": "client|matter|journey", "field": "fieldName" } }
-- Example: { "clientName": { "source": "client", "field": "fullName" }, "matterTitle": { "source": "matter", "field": "title" } }
