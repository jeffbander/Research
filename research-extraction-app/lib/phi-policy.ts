export const LOCKED_CATEGORIES = ['PATIENT_NAME', 'DOB', 'SSN'] as const;

export const OPTIONAL_CATEGORIES = [
  'MRN', 'PROVIDER_NAME', 'VISIT_DATE', 'PHONE', 'EMAIL', 'ADDRESS',
  'AGE_OVER_89', 'ACCOUNT_NUMBER', 'DEVICE_ID', 'RELATIVE_NAME',
  'EMPLOYER_NAME', 'URL_OR_IP', 'BIOMETRIC_ID', 'FACIAL_PHOTO_REF',
  'OTHER_UNIQUE_ID'
] as const;

export type LockedCategory = typeof LOCKED_CATEGORIES[number];
export type OptionalCategory = typeof OPTIONAL_CATEGORIES[number];
export type PhiCategory = LockedCategory | OptionalCategory;

export interface PhiPolicy {
  redact: Record<OptionalCategory, boolean>;
  notes?: string;
}

export const PRESETS: Record<string, PhiPolicy> = {
  safe_harbor: {
    redact: Object.fromEntries(OPTIONAL_CATEGORIES.map(c => [c, true])) as Record<OptionalCategory, boolean>
  },
  internal_research: {
    redact: {
      MRN: false, PROVIDER_NAME: false, VISIT_DATE: false,
      PHONE: true, EMAIL: true, ADDRESS: true, AGE_OVER_89: true,
      ACCOUNT_NUMBER: true, DEVICE_ID: true, RELATIVE_NAME: true,
      EMPLOYER_NAME: true, URL_OR_IP: true, BIOMETRIC_ID: true,
      FACIAL_PHOTO_REF: true, OTHER_UNIQUE_ID: true
    }
  },
  minimal: {
    redact: Object.fromEntries(OPTIONAL_CATEGORIES.map(c => [c, false])) as Record<OptionalCategory, boolean>
  }
};

export function isSafeHarborCompliant(policy: PhiPolicy): boolean {
  return OPTIONAL_CATEGORIES.every(c => policy.redact[c]);
}
