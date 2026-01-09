-- Add field to store original DOCX file path in blob storage
ALTER TABLE document_templates ADD COLUMN docx_blob_key TEXT;

-- Add field to store generated DOCX file path for documents
ALTER TABLE documents ADD COLUMN docx_blob_key TEXT;
