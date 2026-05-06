// Synthetic clinical document generator. Three field-shaped outputs
// (notes / procedures / labs) for a fictional patient, with realistic
// PHI patterns the de-id flow needs to handle. NOT for real patient
// care or real PHI.

const FIRST_NAMES = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica',
                     'Robert', 'Maria', 'James', 'Linda', 'William', 'Patricia'];
const LAST_NAMES  = ['Sample', 'Test', 'Mock', 'Doe', 'Roe', 'Synthetic',
                     'Fictional', 'Placeholder', 'Demo', 'Example'];
const PROVIDERS   = ['Dr. Sarah Mitchell, MD', 'Dr. Robert Chen, MD',
                     'Dr. Lisa Park, NP', 'Dr. James O\'Brien, DO',
                     'Dr. Aisha Patel, MD'];
const RADIOLOGISTS = ['Dr. Henry Wells, MD', 'Dr. Priya Krishnan, MD',
                      'Dr. Marcus Johnson, MD'];
const COMPLAINTS  = ['shortness of breath', 'chest pain', 'fatigue',
                     'palpitations', 'dizziness', 'headache'];
const MEDS        = ['lisinopril 10mg daily', 'metformin 500mg BID',
                     'atorvastatin 40mg qhs', 'aspirin 81mg daily',
                     'metoprolol 25mg BID'];

function pick<T>(arr: T[], seed: number): T { return arr[seed % arr.length]; }
function pad(n: number, w: number) { return String(n).padStart(w, '0'); }

interface PatientContext {
  first: string;
  last: string;
  spouseFirst: string;
  dob: string;
  mrn: string;
  phone: string;
  email: string;
  address: string;
  zip: string;
  city: string;
}

function makePatient(seed: number): PatientContext {
  const first = pick(FIRST_NAMES, seed);
  const last  = pick(LAST_NAMES, seed + 7);
  return {
    first, last,
    spouseFirst: pick(FIRST_NAMES, seed + 4),
    dob: `${pad((seed % 12) + 1, 2)}/${pad((seed % 28) + 1, 2)}/19${50 + (seed % 40)}`,
    mrn: `${10000000 + (seed * 13) % 90000000}`,
    phone: `(${200 + seed % 700}) ${100 + seed % 900}-${1000 + seed % 9000}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    address: `${100 + seed % 9000} ${pick(['Main', 'Oak', 'Elm', 'Park'], seed)} St`,
    zip: `${10000 + seed % 90000}`,
    city: pick(['Springfield', 'Riverside', 'Lakeview', 'Hillsdale'], seed)
  };
}

export interface SyntheticChart {
  notes: string;
  procedures: string;
  labs: string;
  meta: {
    seed: number;
    visits: number;
    chars: { notes: number; procedures: number; labs: number };
  };
}

export function generateSyntheticChart({
  pages = 3,
  seed
}: { pages?: number; seed?: number } = {}): SyntheticChart {
  const s = seed ?? Date.now() % 1000;
  const visits = Math.max(1, Math.round(pages));
  const p = makePatient(s);

  const notes = generateNotes(p, visits, s);
  const procedures = generateProcedures(p, Math.min(2, visits), s);
  const labs = generateLabs(p, visits, s);

  return {
    notes, procedures, labs,
    meta: {
      seed: s, visits,
      chars: { notes: notes.length, procedures: procedures.length, labs: labs.length }
    }
  };
}

function generateNotes(p: PatientContext, visits: number, seed: number): string {
  const banner = `*** SYNTHETIC DATA — DO NOT USE FOR REAL PATIENT CARE ***\n\n`;
  let out = banner;
  for (let i = 0; i < visits; i += 1) {
    const visitDate = `2024-${pad((i % 12) + 1, 2)}-${pad((i * 3 % 28) + 1, 2)}`;
    const provider = pick(PROVIDERS, seed + i);
    const complaint = pick(COMPLAINTS, seed + i);
    const med1 = pick(MEDS, seed);
    const med2 = pick(MEDS, seed + 1);

    out += `==============================================================================
ENCOUNTER NOTE — Visit ${i + 1}
==============================================================================
PATIENT: ${p.first} ${p.last}    DOB: ${p.dob}    MRN: ${p.mrn}
ENCOUNTER DATE: ${visitDate}    PROVIDER: ${provider}
CONTACT: ${p.phone}    EMAIL: ${p.email}

CHIEF COMPLAINT:
${p.first} presents today with ${complaint} ongoing for the past 2 weeks.
Symptoms reported as worse with exertion. Patient denies fevers or chills.

HISTORY OF PRESENT ILLNESS:
${i === 0
  ? `${p.first} is a ${30 + seed % 50}-year-old patient first seen at our clinic for evaluation of ${complaint}.`
  : `${p.first} returns for follow-up of ${complaint}. Per the prior note from ${provider}, the patient was started on ${med1}.`}
The patient reports moderate improvement with current therapy. Sleep is
disturbed. Appetite normal. Spouse, ${p.spouseFirst} ${p.last}, accompanies
the patient and confirms the history.

PAST MEDICAL HISTORY: hypertension, hyperlipidemia, type 2 diabetes (controlled).
PAST SURGICAL HISTORY: appendectomy ${1990 + seed % 20}.
SOCIAL HISTORY: ${pick(['non-smoker', 'former smoker, quit 5 years ago', 'smokes 1/2 ppd'], seed)}.
Lives at ${p.address}, ${p.city}, NY ${p.zip}.

MEDICATIONS:
- ${med1}
- ${med2}
- multivitamin daily

PHYSICAL EXAM:
Vitals: BP ${110 + seed % 40}/${60 + seed % 30}, HR ${60 + seed % 40}, T 98.${seed % 10}, SpO2 ${94 + seed % 6}%.
General: well-appearing, NAD. Cardiac: regular rate and rhythm, no murmurs.
Lungs: clear bilaterally. Abdomen: soft, non-tender.

ASSESSMENT AND PLAN:
1. ${complaint.charAt(0).toUpperCase() + complaint.slice(1)} — likely ${pick(['multifactorial', 'cardiac in origin', 'related to deconditioning'], seed)}.
   Plan: continue ${med1}, add ${med2} pending labs.
2. Routine health maintenance — labs ordered, follow-up in 6 weeks.

Reviewed and signed,
${provider}

`;
  }
  return out.trimEnd();
}

function generateProcedures(p: PatientContext, count: number, seed: number): string {
  const banner = `*** SYNTHETIC DATA — DO NOT USE FOR REAL PATIENT CARE ***\n\n`;
  let out = banner;
  const studies = [
    { type: 'TRANSTHORACIC ECHOCARDIOGRAM', body: echoBody },
    { type: 'CT CHEST WITH CONTRAST', body: ctBody },
    { type: 'MRI BRAIN WITH AND WITHOUT CONTRAST', body: mriBody }
  ];
  for (let i = 0; i < count; i += 1) {
    const study = studies[(seed + i) % studies.length];
    const date = `2024-${pad(((i + 2) % 12) + 1, 2)}-${pad(((i + 5) * 3 % 28) + 1, 2)}`;
    const rad = pick(RADIOLOGISTS, seed + i);
    const accession = `ACC-${100000 + (seed * 17 + i * 31) % 900000}`;

    out += `==============================================================================
${study.type}
==============================================================================
PATIENT: ${p.first} ${p.last}    DOB: ${p.dob}    MRN: ${p.mrn}
STUDY DATE: ${date}    ACCESSION: ${accession}
INTERPRETING RADIOLOGIST: ${rad}

${study.body(seed + i)}

Electronically signed by ${rad} on ${date}.

`;
  }
  return out.trimEnd();
}

function echoBody(seed: number): string {
  return `INDICATION: ${pick(['evaluation of dyspnea', 'follow-up of known cardiomyopathy', 'pre-operative assessment'], seed)}.

FINDINGS:
- Left ventricle: normal size and wall thickness. EF estimated at ${50 + seed % 15}%.
- Right ventricle: normal size and function.
- Atria: mildly dilated bilaterally.
- Valves: trace mitral regurgitation, no aortic stenosis.
- Pericardium: no effusion.

IMPRESSION:
1. Mildly reduced left ventricular ejection fraction at ${50 + seed % 15}%.
2. ${pick(['No regional wall motion abnormalities.', 'Mild concentric LVH.', 'Diastolic dysfunction grade I.'], seed)}
3. Trace mitral regurgitation, otherwise unremarkable valvular study.`;
}

function ctBody(seed: number): string {
  return `INDICATION: ${pick(['rule out pulmonary embolism', 'evaluation of pulmonary nodule', 'staging'], seed)}.

TECHNIQUE: Multi-detector CT of the chest with IV contrast. ${50 + seed % 30} mL Omnipaque 350.

FINDINGS:
- Lungs: ${pick(['no nodules or masses identified', 'a 4mm subpleural nodule in the right lower lobe', 'mild centrilobular emphysema'], seed)}.
- Mediastinum: no lymphadenopathy. Aorta normal caliber.
- Pleura: no effusion or pneumothorax.
- Heart and pericardium: unremarkable.

IMPRESSION:
1. ${pick(['No acute findings.', 'Stable subpleural nodule, recommend follow-up CT in 6 months.', 'No evidence of pulmonary embolism.'], seed)}
2. Otherwise unremarkable chest CT.`;
}

function mriBody(seed: number): string {
  return `INDICATION: ${pick(['headache evaluation', 'follow-up of known lesion', 'first-time seizure'], seed)}.

TECHNIQUE: Multiplanar multisequence MRI of the brain pre and post gadolinium.

FINDINGS:
- Brain parenchyma: ${pick(['no acute infarct or mass', 'a few scattered T2 hyperintensities consistent with chronic small vessel disease', 'unremarkable for age'], seed)}.
- Ventricles and sulci: normal in size and configuration.
- No abnormal enhancement post-contrast.
- Posterior fossa: unremarkable.

IMPRESSION:
1. ${pick(['No acute intracranial process.', 'Mild chronic small vessel ischemic changes.', 'Normal MRI of the brain.'], seed)}`;
}

function generateLabs(p: PatientContext, visits: number, seed: number): string {
  const banner = `*** SYNTHETIC DATA — DO NOT USE FOR REAL PATIENT CARE ***\n\n`;
  let out = banner;
  for (let i = 0; i < visits; i += 1) {
    const collected = `2024-${pad(((i % 12) + 1), 2)}-${pad(((i * 3 % 28) + 1), 2)}`;
    const ordering = pick(PROVIDERS, seed + i);
    out += `==============================================================================
LABORATORY RESULTS
==============================================================================
PATIENT: ${p.first} ${p.last}    DOB: ${p.dob}    MRN: ${p.mrn}
COLLECTED: ${collected}    ORDERING PROVIDER: ${ordering}

COMPLETE BLOOD COUNT:
  WBC      ${(6 + (seed % 10) / 2).toFixed(1)} K/uL    (4.5-11.0)
  RBC      ${(4.5 + (seed % 10) / 10).toFixed(2)} M/uL  (4.20-5.40)
  HGB      ${(13 + (seed % 6)).toFixed(1)} g/dL    (12.0-16.0)
  HCT      ${(38 + (seed % 10)).toFixed(1)} %       (36.0-46.0)
  PLT      ${200 + (seed * 13) % 100} K/uL          (150-450)

COMPREHENSIVE METABOLIC PANEL:
  Na       ${138 + seed % 5} mmol/L    (135-145)
  K        ${(3.5 + (seed % 12) / 10).toFixed(1)} mmol/L    (3.5-5.0)
  Cl       ${100 + seed % 5} mmol/L    (98-107)
  CO2      ${24 + seed % 4} mmol/L     (22-29)
  BUN      ${12 + seed % 10} mg/dL     (7-20)
  Cr       ${(0.8 + (seed % 8) / 10).toFixed(2)} mg/dL    (0.6-1.2)
  Glucose  ${85 + (seed * 7) % 30} mg/dL  (70-99)

LIPID PANEL:
  Total Chol  ${160 + (seed * 11) % 60} mg/dL    (<200)
  LDL         ${90 + (seed * 13) % 50} mg/dL     (<100)
  HDL         ${40 + seed % 25} mg/dL            (>40)
  Trig        ${100 + (seed * 19) % 100} mg/dL   (<150)

`;
  }
  return out.trimEnd();
}
