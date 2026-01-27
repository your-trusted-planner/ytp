/**
 * Anonymize WealthCounsel XML files for use as test fixtures
 * Replaces personal information with fake data while preserving structure
 */

import fs from 'fs'
import path from 'path'

// Mapping of real names to fake names
const nameReplacements: Record<string, string> = {
  // Christensen file
  'Matt Christensen': 'John Smith',
  'Matt': 'John',
  'Christensen': 'Smith',
  'Desiree Christensen': 'Jane Smith',
  'Desiree': 'Jane',
  'Carter Christensen': 'Tommy Smith',
  'Carter': 'Tommy',
  'Laura Lee McCabe': 'Sarah Johnson',
  'Gail Christensen': 'Mary Williams',
  'Jason Christensen': 'Robert Smith',
  'des_mccabe7@yahoo.com': 'jane.smith@example.com',
  'matt@enjoyrealty.net': 'john.smith@example.com',
  'Christensen Legacy Family Trust': 'Smith Family Living Trust',
  '5006 Hollycomb Dr': '123 Main Street',
  'Windsor': 'Anytown',
  '80550': '12345',
  // Contact IDs - replace with generic ones
  '11413423152911100221': '10000000000000000001',
  '16569467762432630528': '10000000000000000002',

  // Jenkins file
  'Sandra Jenkins': 'Alice Brown',
  'Sandra': 'Alice',
  'Jenkins': 'Brown',
  'Miranda Adams': 'Emily Davis',
  'Miranda': 'Emily',
  'Adams': 'Davis',
  'Sheila Ann Lindquist': 'Nancy Wilson',
  'Sheila Ann': 'Nancy',
  'Sheila': 'Nancy',
  'Lindquist': 'Wilson',
  'Gary Lindquist': 'Michael Wilson',
  'Gary': 'Michael',
  'horselvrchick@yahoo.com': 'alice.brown@example.com',
  '3415 N Lincoln Ave, Apt 334': '456 Oak Avenue, Apt 101',
  '3415 N Lincoln Ave': '456 Oak Avenue',
  'Loveland': 'Springfield',
  '80538': '54321',

  // SSNs - replace with zeros
  '586-33-8806': '000-00-0001',
  '585-98-2606': '000-00-0002',
  '639-30-1989': '000-00-0003',
}

// Dates to replace (keep dates but can randomize if needed)
const dateReplacements: Record<string, string> = {
  '05/09/1989': '01/15/1985',
  '07/09/1990': '03/20/1987',
  '08/08/2023': '06/01/2022',
  '19/10/1961': '08/25/1960',
  '23/12/2025': '15/03/2025',
}

function anonymizeXml(xmlContent: string): string {
  let result = xmlContent

  // Replace all names and identifiable info
  for (const [original, replacement] of Object.entries(nameReplacements)) {
    // Use word boundary to avoid partial replacements
    const regex = new RegExp(escapeRegex(original), 'g')
    result = result.replace(regex, replacement)
  }

  // Replace dates
  for (const [original, replacement] of Object.entries(dateReplacements)) {
    result = result.replace(new RegExp(escapeRegex(original), 'g'), replacement)
  }

  return result
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Main
const inputDir = 'doc/wealthCounselSamples'
const outputDir = 'tests/fixtures/wealthcounsel'

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Process both files
const files = [
  { input: 'Christensen Estate Plan.xml', output: 'joint-trust-plan.xml' },
  { input: 'Jenkins, Sandra.xml', output: 'single-will-plan.xml' }
]

for (const file of files) {
  const inputPath = path.join(inputDir, file.input)
  const outputPath = path.join(outputDir, file.output)

  console.log(`Processing: ${file.input} -> ${file.output}`)

  const content = fs.readFileSync(inputPath, 'utf-8')
  const anonymized = anonymizeXml(content)

  fs.writeFileSync(outputPath, anonymized)
  console.log(`  Written: ${outputPath}`)
}

console.log('\nDone! Anonymized files are in:', outputDir)
