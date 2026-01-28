/**
 * WealthCounsel Test Fixtures
 *
 * Sample XML data and expected parse results for testing
 */

// Minimal valid WealthCounsel XML for a single client will-based plan
export const singleClientWillXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<wc:set xmlns:wc="http://counsel.com">
<wc:data key="Client_id"><wc:repeat><wc:string>11111111111111111111</wc:string></wc:repeat></wc:data>
<wc:data key="Data File Version"><wc:repeat><wc:string>2.5</wc:string></wc:repeat></wc:data>
<wc:data key="Client name"><wc:repeat><wc:string>Sandra Lynn Jenkins</wc:string></wc:repeat></wc:data>
<wc:data key="Client name first"><wc:repeat><wc:string>Sandra</wc:string></wc:repeat></wc:data>
<wc:data key="Client name last"><wc:repeat><wc:string>Jenkins</wc:string></wc:repeat></wc:data>
<wc:data key="Client name middle"><wc:repeat><wc:string>Lynn</wc:string></wc:repeat></wc:data>
<wc:data key="Client email"><wc:repeat><wc:string>sandra@example.com</wc:string></wc:repeat></wc:data>
<wc:data key="Client phone"><wc:repeat><wc:string>(555) 123-4567</wc:string></wc:repeat></wc:data>
<wc:data key="Client street address"><wc:repeat><wc:string>123 Main Street</wc:string></wc:repeat></wc:data>
<wc:data key="Client city"><wc:repeat><wc:string>Springfield</wc:string></wc:repeat></wc:data>
<wc:data key="Client zip"><wc:repeat><wc:string>12345</wc:string></wc:repeat></wc:data>
<wc:data key="Client dob"><wc:repeat><wc:date>15/05/1960</wc:date></wc:repeat></wc:data>
<wc:data key="Client ssn"><wc:repeat><wc:string>123-45-6789</wc:string></wc:repeat></wc:data>
<wc:data key="Personal Representative name"><wc:repeat><wc:string>John Jenkins</wc:string></wc:repeat></wc:data>
<wc:data key="Will execution date"><wc:repeat><wc:date>01/15/2024</wc:date></wc:repeat></wc:data>
<wc:data key="Residuary Beneficiary name 1"><wc:repeat><wc:string>Michael Jenkins</wc:string></wc:repeat></wc:data>
<wc:data key="Residuary Beneficiary percentage 1"><wc:repeat><wc:string>50%</wc:string></wc:repeat></wc:data>
<wc:data key="Residuary Beneficiary relationship 1"><wc:repeat><wc:string>Son</wc:string></wc:repeat></wc:data>
<wc:data key="Residuary Beneficiary name 2"><wc:repeat><wc:string>Sarah Jenkins</wc:string></wc:repeat></wc:data>
<wc:data key="Residuary Beneficiary percentage 2"><wc:repeat><wc:string>50%</wc:string></wc:repeat></wc:data>
<wc:data key="Residuary Beneficiary relationship 2"><wc:repeat><wc:string>Daughter</wc:string></wc:repeat></wc:data>
</wc:set>`

// Joint trust-based plan for a married couple
export const jointTrustXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<wc:set xmlns:wc="http://counsel.com">
<wc:data key="Client_id"><wc:repeat><wc:string>22222222222222222222</wc:string></wc:repeat></wc:data>
<wc:data key="Data File Version"><wc:repeat><wc:string>2.5</wc:string></wc:repeat></wc:data>
<wc:data key="Client name"><wc:repeat><wc:string>Matthew James Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Client name first"><wc:repeat><wc:string>Matthew</wc:string></wc:repeat></wc:data>
<wc:data key="Client name last"><wc:repeat><wc:string>Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Client name middle"><wc:repeat><wc:string>James</wc:string></wc:repeat></wc:data>
<wc:data key="Client email"><wc:repeat><wc:string>matt@example.com</wc:string></wc:repeat></wc:data>
<wc:data key="Client phone"><wc:repeat><wc:string>(555) 987-6543</wc:string></wc:repeat></wc:data>
<wc:data key="Client dob"><wc:repeat><wc:date>22/03/1975</wc:date></wc:repeat></wc:data>
<wc:data key="Spouse name"><wc:repeat><wc:string>Desiree Marie Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Spouse name first"><wc:repeat><wc:string>Desiree</wc:string></wc:repeat></wc:data>
<wc:data key="Spouse name last"><wc:repeat><wc:string>Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Spouse name middle"><wc:repeat><wc:string>Marie</wc:string></wc:repeat></wc:data>
<wc:data key="Spouse email"><wc:repeat><wc:string>desiree@example.com</wc:string></wc:repeat></wc:data>
<wc:data key="Spouse dob"><wc:repeat><wc:date>14/08/1978</wc:date></wc:repeat></wc:data>
<wc:data key="RLT trust name"><wc:repeat><wc:string>Christensen Legacy Family Trust</wc:string></wc:repeat></wc:data>
<wc:data key="Joint Trust"><wc:repeat><wc:boolean>true</wc:boolean></wc:repeat></wc:data>
<wc:data key="Trust sign date"><wc:repeat><wc:date>10/01/2023</wc:date></wc:repeat></wc:data>
<wc:data key="MC RLT Trust Type"><wc:repeat><wc:string>Revocable Living Trust</wc:string></wc:repeat></wc:data>
<wc:data key="RLT Trustee Initial name"><wc:repeat><wc:string>Matthew James Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="RLT Trustee Initial name wf"><wc:repeat><wc:string>Desiree Marie Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Successor Trustee incapacity"><wc:repeat><wc:string>Robert Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="RLT Trustee Successor name"><wc:repeat><wc:string>Robert Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Trust Protector name RLT"><wc:repeat><wc:string>Jason Smith</wc:string></wc:repeat></wc:data>
<wc:data key="Financial Agent initial name"><wc:repeat><wc:string>Desiree Marie Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Financial Agent initial name wf"><wc:repeat><wc:string>Matthew James Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Healthcare Agent name"><wc:repeat><wc:string>Desiree Marie Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Healthcare Agent name wf"><wc:repeat><wc:string>Matthew James Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Child name"><wc:repeat><wc:string>Carter Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Child dob"><wc:repeat><wc:date>05/12/2010</wc:date></wc:repeat></wc:data>
<wc:data key="Residuary Beneficiary name 1"><wc:repeat><wc:string>Carter Christensen</wc:string></wc:repeat></wc:data>
<wc:data key="Residuary Beneficiary percentage 1"><wc:repeat><wc:string>100%</wc:string></wc:repeat></wc:data>
<wc:data key="Residuary Beneficiary relationship 1"><wc:repeat><wc:string>Son</wc:string></wc:repeat></wc:data>
<wc:data key="Will Guardian name"><wc:repeat><wc:string>Robert Christensen</wc:string></wc:repeat></wc:data>
</wc:set>`

// Minimal XML with just client name
export const minimalXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<wc:set xmlns:wc="http://counsel.com">
<wc:data key="Client name"><wc:repeat><wc:string>John Doe</wc:string></wc:repeat></wc:data>
<wc:data key="Client name first"><wc:repeat><wc:string>John</wc:string></wc:repeat></wc:data>
<wc:data key="Client name last"><wc:repeat><wc:string>Doe</wc:string></wc:repeat></wc:data>
</wc:set>`

// XML with multiple children (array values)
export const multipleChildrenXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<wc:set xmlns:wc="http://counsel.com">
<wc:data key="Client name"><wc:repeat><wc:string>Jane Smith</wc:string></wc:repeat></wc:data>
<wc:data key="Client name first"><wc:repeat><wc:string>Jane</wc:string></wc:repeat></wc:data>
<wc:data key="Client name last"><wc:repeat><wc:string>Smith</wc:string></wc:repeat></wc:data>
<wc:data key="Child name"><wc:repeat><wc:string>Alice Smith</wc:string></wc:repeat></wc:data>
<wc:data key="Child name"><wc:repeat><wc:string>Bob Smith</wc:string></wc:repeat></wc:data>
<wc:data key="Child name"><wc:repeat><wc:string>Charlie Smith</wc:string></wc:repeat></wc:data>
<wc:data key="Child dob"><wc:repeat><wc:date>01/01/2000</wc:date></wc:repeat></wc:data>
<wc:data key="Child dob"><wc:repeat><wc:date>02/02/2002</wc:date></wc:repeat></wc:data>
<wc:data key="Child dob"><wc:repeat><wc:date>03/03/2004</wc:date></wc:repeat></wc:data>
</wc:set>`

// XML with empty/None values
export const emptyValuesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<wc:set xmlns:wc="http://counsel.com">
<wc:data key="Client name"><wc:repeat><wc:string>Test Client</wc:string></wc:repeat></wc:data>
<wc:data key="Client email"><wc:repeat><wc:string>None</wc:string></wc:repeat></wc:data>
<wc:data key="Client phone"><wc:repeat><wc:string></wc:string></wc:repeat></wc:data>
<wc:data key="Spouse name"><wc:repeat><wc:string>None</wc:string></wc:repeat></wc:data>
</wc:set>`

// XML with various data types
export const mixedTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<wc:set xmlns:wc="http://counsel.com">
<wc:data key="Client name"><wc:repeat><wc:string>Type Test</wc:string></wc:repeat></wc:data>
<wc:data key="Joint Trust"><wc:repeat><wc:boolean>true</wc:boolean></wc:repeat></wc:data>
<wc:data key="Assemble Ancillaries"><wc:repeat><wc:boolean>false</wc:boolean></wc:repeat></wc:data>
<wc:data key="Client dob"><wc:repeat><wc:date>25/12/1980</wc:date></wc:repeat></wc:data>
<wc:data key="Some Number"><wc:repeat><wc:number>42</wc:number></wc:repeat></wc:data>
<wc:data key="MC RLT Option 1"><wc:repeat><wc:string>value1</wc:string></wc:repeat></wc:data>
<wc:data key="MC RLT Option 2"><wc:repeat><wc:boolean>true</wc:boolean></wc:repeat></wc:data>
</wc:set>`

// Invalid/malformed XML for error handling tests
export const malformedXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<wc:set xmlns:wc="http://counsel.com">
<wc:data key="Client name"><wc:repeat><wc:string>Unclosed Tag
</wc:set>`

// Empty XML
export const emptyXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<wc:set xmlns:wc="http://counsel.com">
</wc:set>`

// Helper to load real anonymized XML files
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Load real anonymized WealthCounsel XML files from the fixtures directory.
 * These files have the full complexity of real exports including:
 * - Multiple <wc:string> elements within a single <wc:repeat>
 * - Attributes on value elements (type="contact", id, ref, location)
 * - 500-900+ fields per file
 */
export function loadRealXmlFixture(name: 'joint-trust-plan' | 'single-will-plan'): string {
  const fixturePath = resolve(__dirname, 'wealthcounsel', `${name}.xml`)
  return readFileSync(fixturePath, 'utf-8')
}

// Pre-loaded real XML fixtures for convenience
// Note: These are anonymized versions of real WealthCounsel exports
export const realJointTrustXml = (() => {
  try {
    return loadRealXmlFixture('joint-trust-plan')
  } catch {
    // Return empty string if file not found (for CI environments)
    return ''
  }
})()

export const realSingleWillXml = (() => {
  try {
    return loadRealXmlFixture('single-will-plan')
  } catch {
    // Return empty string if file not found (for CI environments)
    return ''
  }
})()
