import { LOCKED_CATEGORIES, OPTIONAL_CATEGORIES, PhiPolicy, PhiCategory } from './phi-policy';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  PATIENT_NAME: "the patient's full name, first name, last name, nicknames, initials",
  DOB:          'date of birth in any format',
  SSN:          'Social Security Numbers in any format',
  MRN:          'medical record numbers, chart numbers, patient IDs',
  PROVIDER_NAME:'names of physicians, nurses, and other clinical staff (Dr., NP, PA, RN)',
  VISIT_DATE:   'admission, discharge, encounter, procedure, and follow-up dates',
  PHONE:        'telephone and fax numbers',
  EMAIL:        'email addresses',
  ADDRESS:      'street addresses, cities, ZIP codes (any geographic detail finer than state)',
  AGE_OVER_89:  'ages 90 and above (replace with "over 89")',
  ACCOUNT_NUMBER:'health plan, account, certificate, and license numbers',
  DEVICE_ID:    'device serial numbers, implant identifiers',
  RELATIVE_NAME:"names of family members, household members, employers' contacts",
  EMPLOYER_NAME:"names of the patient's employer",
  URL_OR_IP:    'web URLs and IP addresses tied to the patient',
  BIOMETRIC_ID: 'fingerprints, voiceprints, retina scans',
  FACIAL_PHOTO_REF:'references to identifying photos',
  OTHER_UNIQUE_ID:'any other unique identifier or code'
};

export function buildSystemPrompt(policy: PhiPolicy): string {
  const toRedact: PhiCategory[] = [
    ...LOCKED_CATEGORIES,
    ...OPTIONAL_CATEGORIES.filter(c => policy.redact[c])
  ];
  const toPreserve = OPTIONAL_CATEGORIES.filter(c => !policy.redact[c]);

  const redactList = toRedact
    .map(c => `- [${c}] — ${CATEGORY_DESCRIPTIONS[c]}`)
    .join('\n');

  const preserveList = toPreserve.length
    ? toPreserve.map(c => `- ${CATEGORY_DESCRIPTIONS[c]}`).join('\n')
    : '(none — redact everything listed above)';

  return `You are a PHI redaction tool. Process the user's clinical text and return it with ONLY the following categories replaced.

REDACT these categories. Replace each occurrence with [CATEGORY: original-text] so the original is preserved inside the bracket exactly as it appeared:
${redactList}

PRESERVE these verbatim — do NOT redact, do NOT alter:
${preserveList}

Rules:
1. Only redact categories listed in REDACT above. Do not invent new categories.
2. Output the FULL text with substitutions in place. Preserve all formatting, line breaks, headers, bullets, and clinical content.
3. The bracket format is exactly [CATEGORY: original-text] — single space after the colon, original text verbatim including capitalization.
4. If a value spans categories (e.g. a date that is also a DOB), use the most specific (DOB).
5. Do not add commentary, prefaces, or summaries. Output only the transformed text.`;
}
