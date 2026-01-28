import fs from 'fs';
import { parseWealthCounselXml, summarizeParsedData } from '../server/utils/wealthcounsel-parser';

const filePath = process.argv[2] || 'doc/wealthCounselSamples/Christensen Estate Plan.xml';
const xml = fs.readFileSync(filePath, 'utf-8');

console.log('=== Analyzing:', filePath, '===\n');

const parsed = parseWealthCounselXml(xml);
const summary = summarizeParsedData(parsed);

console.log('--- Summary ---');
console.log('Client Summary:', summary.clientSummary);
console.log('Plan Summary:', summary.planSummary);
console.log('Field Count:', summary.fieldCount);
console.log('Role Counts:', summary.roleCounts);

console.log('\n--- Client ---');
console.log('Full Name:', parsed.client.fullName);
console.log('First Name:', parsed.client.firstName);
console.log('Last Name:', parsed.client.lastName);
console.log('Email:', parsed.client.email);
console.log('Phone:', parsed.client.phone);
console.log('DOB:', parsed.client.dateOfBirth);
console.log('Address:', parsed.client.address);
console.log('City:', parsed.client.city);
console.log('Zip:', parsed.client.zipCode);

if (parsed.spouse) {
  console.log('\n--- Spouse ---');
  console.log('Full Name:', parsed.spouse.fullName);
  console.log('First Name:', parsed.spouse.firstName);
  console.log('Last Name:', parsed.spouse.lastName);
  console.log('Email:', parsed.spouse.email);
}

console.log('\n--- Children ---');
for (const child of parsed.children) {
  console.log(`- ${child.fullName} (DOB: ${child.dateOfBirth})`);
}

console.log('\n--- Trust ---');
if (parsed.trust) {
  console.log('Name:', parsed.trust.name);
  console.log('Is Joint:', parsed.trust.isJoint);
  console.log('Sign Date:', parsed.trust.signDate);
  console.log('Trustees:', parsed.trust.trusteeNames);
  console.log('Successor Trustees:', parsed.trust.successorTrusteeNames);
}

console.log('\n--- Trust Fiduciaries ---');
console.log('Trustees:', parsed.fiduciaries.trustees.map(t => t.personName));
console.log('Successor Trustees:', parsed.fiduciaries.successorTrustees.map(t => t.personName));

console.log('\n--- Client Individual Fiduciaries ---');
console.log('Financial Agents:', parsed.fiduciaries.client.financialAgents.map(t => t.personName));
console.log('Financial Agent Successors:', parsed.fiduciaries.client.financialAgentSuccessors.map(t => t.personName));
console.log('Healthcare Agents:', parsed.fiduciaries.client.healthcareAgents.map(t => t.personName));
console.log('Healthcare Agent Successors:', parsed.fiduciaries.client.healthcareAgentSuccessors.map(t => t.personName));
console.log('Executors:', parsed.fiduciaries.client.executors.map(t => t.personName));
console.log('Guardians:', parsed.fiduciaries.client.guardians.map(t => t.personName));

if (parsed.spouse) {
  console.log('\n--- Spouse Individual Fiduciaries ---');
  console.log('Financial Agents:', parsed.fiduciaries.spouse.financialAgents.map(t => t.personName));
  console.log('Financial Agent Successors:', parsed.fiduciaries.spouse.financialAgentSuccessors.map(t => t.personName));
  console.log('Healthcare Agents:', parsed.fiduciaries.spouse.healthcareAgents.map(t => t.personName));
  console.log('Healthcare Agent Successors:', parsed.fiduciaries.spouse.healthcareAgentSuccessors.map(t => t.personName));
  console.log('Executors:', parsed.fiduciaries.spouse.executors.map(t => t.personName));
  console.log('Guardians:', parsed.fiduciaries.spouse.guardians.map(t => t.personName));
}

console.log('\n--- Beneficiaries ---');
for (const ben of parsed.beneficiaries) {
  console.log(`- ${ben.name} (${ben.percentage}, ${ben.relationship})`);
}
