import { schema } from '../index'
import { SEED_IDS } from './constants'
import type { SeedDb } from './types'

export async function seedQuestionnaires(db: SeedDb): Promise<string> {
  console.log('Seeding questionnaires...')

  const questionnaireId = SEED_IDS.questionnaires.initial

  await db.insert(schema.questionnaires).values({
    id: questionnaireId,
    name: 'Initial Consultation Questionnaire',
    description: 'Pre-consultation questions for prospects',
    questions: JSON.stringify([
      {
        id: 'q1',
        type: 'text',
        question: 'What is your primary reason for seeking asset protection?',
        required: true
      },
      {
        id: 'q2',
        type: 'number',
        question: 'Estimated net worth (USD)',
        required: true
      },
      {
        id: 'q3',
        type: 'select',
        question: 'What type of assets do you need to protect?',
        options: ['Real Estate', 'Business Assets', 'Investment Portfolio', 'Cryptocurrency', 'Other'],
        required: true
      },
      {
        id: 'q4',
        type: 'text',
        question: 'Do you currently have any legal structures in place (trusts, LLCs, etc.)?',
        required: false
      },
      {
        id: 'q5',
        type: 'select',
        question: 'What is your timeline for implementation?',
        options: ['Immediate (within 1 month)', '1-3 months', '3-6 months', '6+ months'],
        required: true
      }
    ])
  }).onConflictDoNothing()

  console.log('  Created 1 questionnaire')

  return questionnaireId
}
