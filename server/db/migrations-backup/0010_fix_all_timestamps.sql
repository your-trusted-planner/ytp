-- Comprehensive fix for all timestamp fields across all tables
-- Converts datetime strings to Unix timestamp integers

-- appointments
UPDATE appointments
SET
  start_time = CASE WHEN typeof(start_time) = 'text' THEN unixepoch(start_time) ELSE start_time END,
  end_time = CASE WHEN typeof(end_time) = 'text' THEN unixepoch(end_time) ELSE end_time END,
  call_notes_updated_at = CASE WHEN typeof(call_notes_updated_at) = 'text' THEN unixepoch(call_notes_updated_at) ELSE call_notes_updated_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(start_time) = 'text' OR typeof(end_time) = 'text' OR typeof(call_notes_updated_at) = 'text'
   OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- template_folders
UPDATE template_folders
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- document_templates
UPDATE document_templates
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- documents
UPDATE documents
SET
  attorney_approved_at = CASE WHEN typeof(attorney_approved_at) = 'text' THEN unixepoch(attorney_approved_at) ELSE attorney_approved_at END,
  ready_for_signature_at = CASE WHEN typeof(ready_for_signature_at) = 'text' THEN unixepoch(ready_for_signature_at) ELSE ready_for_signature_at END,
  signed_at = CASE WHEN typeof(signed_at) = 'text' THEN unixepoch(signed_at) ELSE signed_at END,
  viewed_at = CASE WHEN typeof(viewed_at) = 'text' THEN unixepoch(viewed_at) ELSE viewed_at END,
  sent_at = CASE WHEN typeof(sent_at) = 'text' THEN unixepoch(sent_at) ELSE sent_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(attorney_approved_at) = 'text' OR typeof(ready_for_signature_at) = 'text'
   OR typeof(signed_at) = 'text' OR typeof(viewed_at) = 'text' OR typeof(sent_at) = 'text'
   OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- notes
UPDATE notes
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- activities
UPDATE activities
SET created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END
WHERE typeof(created_at) = 'text';

-- settings
UPDATE settings
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- service_catalog
UPDATE service_catalog
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- matters
UPDATE matters
SET
  contract_date = CASE WHEN typeof(contract_date) = 'text' THEN unixepoch(contract_date) ELSE contract_date END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(contract_date) = 'text' OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- services
UPDATE services
SET
  start_date = CASE WHEN typeof(start_date) = 'text' THEN unixepoch(start_date) ELSE start_date END,
  end_date = CASE WHEN typeof(end_date) = 'text' THEN unixepoch(end_date) ELSE end_date END,
  renewal_date = CASE WHEN typeof(renewal_date) = 'text' THEN unixepoch(renewal_date) ELSE renewal_date END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(start_date) = 'text' OR typeof(end_date) = 'text' OR typeof(renewal_date) = 'text'
   OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- questionnaires
UPDATE questionnaires
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- questionnaire_responses
UPDATE questionnaire_responses
SET
  attorney_notes_updated_at = CASE WHEN typeof(attorney_notes_updated_at) = 'text' THEN unixepoch(attorney_notes_updated_at) ELSE attorney_notes_updated_at END,
  submitted_at = CASE WHEN typeof(submitted_at) = 'text' THEN unixepoch(submitted_at) ELSE submitted_at END
WHERE typeof(attorney_notes_updated_at) = 'text' OR typeof(submitted_at) = 'text';

-- journeys
UPDATE journeys
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- journey_steps
UPDATE journey_steps
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- client_journeys
UPDATE client_journeys
SET
  started_at = CASE WHEN typeof(started_at) = 'text' THEN unixepoch(started_at) ELSE started_at END,
  completed_at = CASE WHEN typeof(completed_at) = 'text' THEN unixepoch(completed_at) ELSE completed_at END,
  paused_at = CASE WHEN typeof(paused_at) = 'text' THEN unixepoch(paused_at) ELSE paused_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(started_at) = 'text' OR typeof(completed_at) = 'text' OR typeof(paused_at) = 'text'
   OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- journey_step_progress
UPDATE journey_step_progress
SET
  client_approved_at = CASE WHEN typeof(client_approved_at) = 'text' THEN unixepoch(client_approved_at) ELSE client_approved_at END,
  counsel_approved_at = CASE WHEN typeof(counsel_approved_at) = 'text' THEN unixepoch(counsel_approved_at) ELSE counsel_approved_at END,
  started_at = CASE WHEN typeof(started_at) = 'text' THEN unixepoch(started_at) ELSE started_at END,
  completed_at = CASE WHEN typeof(completed_at) = 'text' THEN unixepoch(completed_at) ELSE completed_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(client_approved_at) = 'text' OR typeof(counsel_approved_at) = 'text'
   OR typeof(started_at) = 'text' OR typeof(completed_at) = 'text'
   OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- action_items
UPDATE action_items
SET
  due_date = CASE WHEN typeof(due_date) = 'text' THEN unixepoch(due_date) ELSE due_date END,
  completed_at = CASE WHEN typeof(completed_at) = 'text' THEN unixepoch(completed_at) ELSE completed_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(due_date) = 'text' OR typeof(completed_at) = 'text'
   OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- bridge_conversations
UPDATE bridge_conversations
SET created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END
WHERE typeof(created_at) = 'text';

-- faq_library
UPDATE faq_library
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- document_uploads
UPDATE document_uploads
SET
  reviewed_at = CASE WHEN typeof(reviewed_at) = 'text' THEN unixepoch(reviewed_at) ELSE reviewed_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(reviewed_at) = 'text' OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- snapshot_versions
UPDATE snapshot_versions
SET
  sent_at = CASE WHEN typeof(sent_at) = 'text' THEN unixepoch(sent_at) ELSE sent_at END,
  approved_at = CASE WHEN typeof(approved_at) = 'text' THEN unixepoch(approved_at) ELSE approved_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(sent_at) = 'text' OR typeof(approved_at) = 'text'
   OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- automations
UPDATE automations
SET
  last_executed_at = CASE WHEN typeof(last_executed_at) = 'text' THEN unixepoch(last_executed_at) ELSE last_executed_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(last_executed_at) = 'text' OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- marketing_sources
UPDATE marketing_sources
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- client_marketing_attribution
UPDATE client_marketing_attribution
SET created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END
WHERE typeof(created_at) = 'text';

-- uploaded_documents
UPDATE uploaded_documents
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  processed_at = CASE WHEN typeof(processed_at) = 'text' THEN unixepoch(processed_at) ELSE processed_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(processed_at) = 'text' OR typeof(updated_at) = 'text';

-- lawpay_connections
UPDATE lawpay_connections
SET
  expires_at = CASE WHEN typeof(expires_at) = 'text' THEN unixepoch(expires_at) ELSE expires_at END,
  revoked_at = CASE WHEN typeof(revoked_at) = 'text' THEN unixepoch(revoked_at) ELSE revoked_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(expires_at) = 'text' OR typeof(revoked_at) = 'text'
   OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- additional_grantors
UPDATE additional_grantors
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- attorney_calendars
UPDATE attorney_calendars
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- document_summaries
UPDATE document_summaries
SET
  generated_at = CASE WHEN typeof(generated_at) = 'text' THEN unixepoch(generated_at) ELSE generated_at END,
  viewed_at = CASE WHEN typeof(viewed_at) = 'text' THEN unixepoch(viewed_at) ELSE viewed_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(generated_at) = 'text' OR typeof(viewed_at) = 'text'
   OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- service_packages
UPDATE service_packages
SET
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- client_selected_packages
UPDATE client_selected_packages
SET
  selected_at = CASE WHEN typeof(selected_at) = 'text' THEN unixepoch(selected_at) ELSE selected_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END
WHERE typeof(selected_at) = 'text' OR typeof(created_at) = 'text';

-- service_payments
UPDATE service_payments
SET
  paid_at = CASE WHEN typeof(paid_at) = 'text' THEN unixepoch(paid_at) ELSE paid_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(paid_at) = 'text' OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- notary_documents
UPDATE notary_documents
SET
  downloaded_at = CASE WHEN typeof(downloaded_at) = 'text' THEN unixepoch(downloaded_at) ELSE downloaded_at END,
  uploaded_at = CASE WHEN typeof(uploaded_at) = 'text' THEN unixepoch(uploaded_at) ELSE uploaded_at END,
  notary_expiration_date = CASE WHEN typeof(notary_expiration_date) = 'text' THEN unixepoch(notary_expiration_date) ELSE notary_expiration_date END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(downloaded_at) = 'text' OR typeof(uploaded_at) = 'text'
   OR typeof(notary_expiration_date) = 'text'
   OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- public_bookings
UPDATE public_bookings
SET
  booking_completed_at = CASE WHEN typeof(booking_completed_at) = 'text' THEN unixepoch(booking_completed_at) ELSE booking_completed_at END,
  converted_to_client_at = CASE WHEN typeof(converted_to_client_at) = 'text' THEN unixepoch(converted_to_client_at) ELSE converted_to_client_at END,
  created_at = CASE WHEN typeof(created_at) = 'text' THEN unixepoch(created_at) ELSE created_at END,
  updated_at = CASE WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at) ELSE updated_at END
WHERE typeof(booking_completed_at) = 'text' OR typeof(converted_to_client_at) = 'text'
   OR typeof(created_at) = 'text' OR typeof(updated_at) = 'text';
