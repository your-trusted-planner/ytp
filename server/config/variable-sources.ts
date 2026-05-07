// Registry of all template variable mapping
// sources and their available fields.

export interface FieldDef {
  label: string
  format?: 'date' | 'currency'
  sensitive?: boolean
}

export interface SourceDef {
  label: string
  fields: Record<string, FieldDef>
}

export const VARIABLE_SOURCES: Record<
  string, SourceDef
> = {
  person: {
    label: 'Client',
    fields: {
      firstName: { label: 'First Name' },
      lastName: { label: 'Last Name' },
      middleNames: { label: 'Middle Names' },
      fullName: { label: 'Full Name' },
      email: { label: 'Email' },
      phone: { label: 'Phone' },
      address: { label: 'Address' },
      address2: { label: 'Address Line 2' },
      city: { label: 'City' },
      state: { label: 'State' },
      zipCode: { label: 'ZIP Code' },
      country: { label: 'Country' },
      dateOfBirth: {
        label: 'Date of Birth',
        format: 'date',
      },
      maritalStatus: {
        label: 'Marital Status',
      },
      tinLast4: {
        label: 'TIN Last 4',
        sensitive: true,
      },
    },
  },
  spouse: {
    label: 'Spouse',
    fields: {
      firstName: { label: 'First Name' },
      lastName: { label: 'Last Name' },
      fullName: { label: 'Full Name' },
      email: { label: 'Email' },
      phone: { label: 'Phone' },
      address: { label: 'Address' },
      city: { label: 'City' },
      state: { label: 'State' },
      zipCode: { label: 'ZIP Code' },
      dateOfBirth: {
        label: 'Date of Birth',
        format: 'date',
      },
    },
  },
  matter: {
    label: 'Matter',
    fields: {
      title: { label: 'Matter Title' },
      matterNumber: { label: 'Matter Number' },
      description: { label: 'Description' },
      status: { label: 'Status' },
    },
  },
  attorney: {
    label: 'Lead Attorney',
    fields: {
      firstName: { label: 'First Name' },
      lastName: { label: 'Last Name' },
      fullName: { label: 'Full Name' },
      email: { label: 'Email' },
      phone: { label: 'Phone' },
    },
  },
  estatePlan: {
    label: 'Estate Plan',
    fields: {
      planName: { label: 'Plan Name' },
      planType: { label: 'Plan Type' },
      effectiveDate: {
        label: 'Effective Date',
        format: 'date',
      },
      status: { label: 'Status' },
    },
  },
  trust: {
    label: 'Trust',
    fields: {
      trustName: { label: 'Trust Name' },
      trustType: { label: 'Trust Type' },
      isJoint: { label: 'Is Joint' },
      jurisdiction: { label: 'Jurisdiction' },
      formationDate: {
        label: 'Formation Date',
        format: 'date',
      },
    },
  },
  planRole: {
    label: 'Plan Role',
    fields: {
      trusteeName: { label: 'Trustee Name' },
      executorName: { label: 'Executor Name' },
      financialAgentName: {
        label: 'Financial Agent Name',
      },
      healthcareAgentName: {
        label: 'Healthcare Agent Name',
      },
      guardianName: { label: 'Guardian Name' },
      beneficiaryName: {
        label: 'Beneficiary Name',
      },
    },
  },
  service: {
    label: 'Service',
    fields: {
      name: { label: 'Service Name' },
      category: { label: 'Category' },
      price: {
        label: 'Price',
        format: 'currency',
      },
    },
  },
  system: {
    label: 'System',
    fields: {
      currentDate: { label: 'Current Date' },
      firmName: { label: 'Firm Name' },
      firmPhone: { label: 'Firm Phone' },
      firmEmail: { label: 'Firm Email' },
    },
  },
}
