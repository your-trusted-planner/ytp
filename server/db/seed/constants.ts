// Fixed seed IDs for idempotent seeding
// These IDs are deterministic so re-running seed updates existing records
// instead of creating duplicates

export const SEED_IDS = {
  // Users
  users: {
    admin: 'seed_user_admin',
    lawyer: 'seed_user_lawyer',
    lawyer2: 'seed_user_lawyer2',
    staff: 'seed_user_staff',
    advisor: 'seed_user_advisor',
    client1: 'seed_user_client1',
    client2: 'seed_user_client2',
    client3: 'seed_user_client3'
  },

  // People (Belly Button Principle)
  people: {
    janeDoe: 'seed_person_jane_doe',
    michaelJohnson: 'seed_person_michael_johnson',
    sarahWilliams: 'seed_person_sarah_williams',
    robertDoe: 'seed_person_robert_doe',
    emilyDoe: 'seed_person_emily_doe',
    jamesDoe: 'seed_person_james_doe',
    margaretSmith: 'seed_person_margaret_smith',
    janeDoeMatter: 'seed_person_jane_doe_matter' // For matter roles
  },

  // Clients
  clients: {
    jane: 'seed_client_jane',
    michael: 'seed_client_michael',
    sarah: 'seed_client_sarah'
  },

  // Client Profiles (legacy)
  clientProfiles: {
    jane: 'seed_profile_jane',
    michael: 'seed_profile_michael',
    sarah: 'seed_profile_sarah'
  },

  // Templates
  templates: {
    folder: 'seed_template_folder',
    simpleWill: 'seed_template_simple_will',
    engagement: 'seed_template_engagement',
    trust: 'seed_template_trust'
  },

  // Services
  services: {
    category1: 'seed_service_cat_estate',
    category2: 'seed_service_cat_entity',
    category3: 'seed_service_cat_maintenance',
    category4: 'seed_service_cat_asset',
    wydapt: 'seed_service_wydapt',
    maintenance: 'seed_service_maintenance',
    llc: 'seed_service_llc'
  },

  // Matters
  matters: {
    janeDoe: 'seed_matter_jane_doe',
    michaelJohnson: 'seed_matter_michael_johnson',
    sarahWilliams: 'seed_matter_sarah_williams'
  },

  // Journey
  journey: {
    wydapt: 'seed_journey_wydapt',
    step1: 'seed_journey_step_1',
    step2: 'seed_journey_step_2',
    step3: 'seed_journey_step_3',
    step4: 'seed_journey_step_4',
    step5: 'seed_journey_step_5',
    step6: 'seed_journey_step_6',
    step7: 'seed_journey_step_7'
  },

  // Client Journeys
  clientJourneys: {
    jane: 'seed_client_journey_jane',
    michael: 'seed_client_journey_michael',
    sarah: 'seed_client_journey_sarah'
  },

  // Journey Step Progress
  journeyProgress: {
    jane_step1: 'seed_progress_jane_step1',
    jane_step2: 'seed_progress_jane_step2',
    jane_step3: 'seed_progress_jane_step3',
    jane_step4: 'seed_progress_jane_step4',
    jane_step5: 'seed_progress_jane_step5',
    jane_step6: 'seed_progress_jane_step6',
    jane_step7: 'seed_progress_jane_step7',
    sarah_step1: 'seed_progress_sarah_step1',
    sarah_step2: 'seed_progress_sarah_step2',
    sarah_step3: 'seed_progress_sarah_step3',
    sarah_step4: 'seed_progress_sarah_step4',
    sarah_step5: 'seed_progress_sarah_step5',
    sarah_step6: 'seed_progress_sarah_step6',
    sarah_step7: 'seed_progress_sarah_step7'
  },

  // Action Items
  actions: {
    jane_step1_esign: 'seed_action_jane_s1_esign',
    jane_step1_payment: 'seed_action_jane_s1_payment',
    jane_step2_questionnaire: 'seed_action_jane_s2_questionnaire',
    jane_step2_upload: 'seed_action_jane_s2_upload',
    jane_step3_review: 'seed_action_jane_s3_review',
    jane_step4_llc: 'seed_action_jane_s4_llc',
    jane_step4_ein: 'seed_action_jane_s4_ein',
    jane_step4_operating: 'seed_action_jane_s4_operating',
    jane_step5_deed: 'seed_action_jane_s5_deed',
    jane_step5_accounts: 'seed_action_jane_s5_accounts'
  },

  // Client Relationships
  clientRelationships: {
    jane_robert: 'seed_rel_jane_robert',
    jane_emily: 'seed_rel_jane_emily',
    jane_james: 'seed_rel_jane_james',
    jane_margaret: 'seed_rel_jane_margaret'
  },

  // Matter Relationships
  matterRelationships: {
    jane_grantor: 'seed_mrel_jane_grantor',
    robert_cotrustee: 'seed_mrel_robert_cotrustee',
    emily_beneficiary: 'seed_mrel_emily_beneficiary',
    james_beneficiary: 'seed_mrel_james_beneficiary'
  },

  // Documents
  documents: {
    jane_engagement: 'seed_doc_jane_engagement',
    jane_trust: 'seed_doc_jane_trust',
    sarah_engagement: 'seed_doc_sarah_engagement',
    sarah_trust: 'seed_doc_sarah_trust'
  },

  // Billing
  billing: {
    trustAccount: 'seed_trust_account',
    ledger_jane: 'seed_ledger_jane',
    ledger_michael: 'seed_ledger_michael',
    ledger_sarah: 'seed_ledger_sarah',
    tx_jane_deposit: 'seed_tx_jane_deposit',
    tx_jane_disbursement: 'seed_tx_jane_disbursement',
    tx_jane_expense: 'seed_tx_jane_expense',
    tx_sarah_deposit1: 'seed_tx_sarah_deposit1',
    tx_sarah_deposit2: 'seed_tx_sarah_deposit2',
    tx_sarah_disbursement: 'seed_tx_sarah_disbursement',
    tx_michael_deposit: 'seed_tx_michael_deposit',
    invoice1: 'seed_invoice_1',
    invoice2: 'seed_invoice_2',
    invoice3: 'seed_invoice_3',
    invoice4: 'seed_invoice_4',
    lineItem1_1: 'seed_line_1_1',
    lineItem1_2: 'seed_line_1_2',
    lineItem1_3: 'seed_line_1_3',
    lineItem2_1: 'seed_line_2_1',
    lineItem2_2: 'seed_line_2_2',
    lineItem3_1: 'seed_line_3_1',
    lineItem4_1: 'seed_line_4_1',
    payment1: 'seed_payment_1',
    payment2: 'seed_payment_2',
    payment3: 'seed_payment_3',
    payment4: 'seed_payment_4',
    payment5: 'seed_payment_5'
  },

  // Questionnaires
  questionnaires: {
    initial: 'seed_questionnaire_initial'
  }
} as const
