const DeidentAudit = require('../models/deidentAuditModel');
const AigentsConfig = require('../models/aigentsConfigModel');
const PhiPolicy = require('../models/phiPolicyModel');

// ---------- Audit log ----------

exports.createAuditLog = async (req, res) => {
  try {
    const audit = await DeidentAudit.create({
      ...req.body,
      user: req.user?.id || req.body.user
    });
    res.status(201).json({ success: true, data: audit });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create audit log',
      error: error.message
    });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const filter = {};
    if (req.query.user) filter.user = req.query.user;
    if (req.query.patient) filter.patient = req.query.patient;
    if (req.query.study) filter.study = req.query.study;
    if (req.query.preset) filter['policy.preset'] = req.query.preset;
    if (req.query.is_safe_harbor !== undefined) {
      filter['policy.is_safe_harbor'] = req.query.is_safe_harbor === 'true';
    }
    if (req.query.from || req.query.to) {
      filter.scrubbed_at = {};
      if (req.query.from) filter.scrubbed_at.$gte = new Date(req.query.from);
      if (req.query.to) filter.scrubbed_at.$lte = new Date(req.query.to);
    }

    const audits = await DeidentAudit.find(filter)
      .sort({ scrubbed_at: -1 })
      .limit(parseInt(req.query.limit, 10) || 100)
      .populate('user', 'name email')
      .populate('patient', 'medicalRecordNumber')
      .populate('study', 'studyId name shortTitle');

    res.status(200).json({ success: true, count: audits.length, data: audits });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: error.message
    });
  }
};

exports.getAuditLogById = async (req, res) => {
  try {
    const audit = await DeidentAudit.findById(req.params.id)
      .populate('user', 'name email')
      .populate('patient', 'medicalRecordNumber')
      .populate('study', 'studyId name shortTitle');

    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }
    res.status(200).json({ success: true, data: audit });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit log',
      error: error.message
    });
  }
};

// ---------- Aigents config CRUD ----------

exports.listAigentsConfigs = async (req, res) => {
  try {
    const configs = await AigentsConfig.find({ is_active: true });
    res.status(200).json({
      success: true,
      count: configs.length,
      data: configs.map(c => c.toSafeJSON())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Aigents configs',
      error: error.message
    });
  }
};

exports.getAigentsConfig = async (req, res) => {
  try {
    const config = await AigentsConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({ success: false, message: 'Aigents config not found' });
    }
    res.status(200).json({ success: true, data: config.toSafeJSON() });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Aigents config',
      error: error.message
    });
  }
};

exports.createAigentsConfig = async (req, res) => {
  try {
    const config = await AigentsConfig.create({
      ...req.body,
      created_by: req.user?.id
    });
    res.status(201).json({ success: true, data: config.toSafeJSON() });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create Aigents config',
      error: error.message
    });
  }
};

exports.updateAigentsConfig = async (req, res) => {
  try {
    // Use save() instead of findByIdAndUpdate so the pre-save encryption
    // hook fires when auth_token changes.
    const config = await AigentsConfig.findById(req.params.id).select('+auth_token');
    if (!config) {
      return res.status(404).json({ success: false, message: 'Aigents config not found' });
    }
    const editable = ['name', 'webhook_url', 'auth_type', 'auth_token',
                      'default_chain_title', 'default_folder_id',
                      'description', 'is_active'];
    for (const field of editable) {
      if (req.body[field] !== undefined) config[field] = req.body[field];
    }
    await config.save();
    res.status(200).json({ success: true, data: config.toSafeJSON() });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update Aigents config',
      error: error.message
    });
  }
};

exports.deleteAigentsConfig = async (req, res) => {
  try {
    const config = await AigentsConfig.findByIdAndDelete(req.params.id);
    if (!config) {
      return res.status(404).json({ success: false, message: 'Aigents config not found' });
    }
    res.status(200).json({ success: true, message: 'Aigents config deleted' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete Aigents config',
      error: error.message
    });
  }
};

// ---------- PHI policies (server-stored) ----------

exports.listPhiPolicies = async (req, res) => {
  try {
    const filter = { is_active: true };
    if (req.query.study) filter.study = req.query.study;
    if (req.query.irb_protocol) filter.irb_protocol = req.query.irb_protocol;
    const policies = await PhiPolicy.find(filter).populate('study', 'studyId name shortTitle');
    res.status(200).json({
      success: true,
      count: policies.length,
      data: policies,
      meta: {
        locked_categories: PhiPolicy.LOCKED_CATEGORIES,
        optional_categories: PhiPolicy.OPTIONAL_CATEGORIES
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve PHI policies',
      error: error.message
    });
  }
};

exports.getPhiPolicy = async (req, res) => {
  try {
    const policy = await PhiPolicy.findById(req.params.id)
      .populate('study', 'studyId name shortTitle');
    if (!policy) {
      return res.status(404).json({ success: false, message: 'PHI policy not found' });
    }
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve PHI policy',
      error: error.message
    });
  }
};

exports.createPhiPolicy = async (req, res) => {
  try {
    const policy = await PhiPolicy.create({
      ...req.body,
      created_by: req.user?.id
    });
    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create PHI policy',
      error: error.message
    });
  }
};

exports.updatePhiPolicy = async (req, res) => {
  try {
    const policy = await PhiPolicy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!policy) {
      return res.status(404).json({ success: false, message: 'PHI policy not found' });
    }
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update PHI policy',
      error: error.message
    });
  }
};

exports.deletePhiPolicy = async (req, res) => {
  try {
    const policy = await PhiPolicy.findByIdAndDelete(req.params.id);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'PHI policy not found' });
    }
    res.status(200).json({ success: true, message: 'PHI policy deleted' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete PHI policy',
      error: error.message
    });
  }
};

// ---------- Chain-run cross-reference report ----------
//
// Lists audit records that were forwarded to Aigents (have a chain_run_id),
// joined with study/patient/user. The IRB documentation query: "show me
// every analysis run for study X under non-Safe-Harbor policy this quarter."

exports.getChainRunReport = async (req, res) => {
  try {
    const filter = { aigents_chain_run_id: { $ne: null, $exists: true } };
    if (req.query.user) filter.user = req.query.user;
    if (req.query.patient) filter.patient = req.query.patient;
    if (req.query.study) filter.study = req.query.study;
    if (req.query.preset) filter['policy.preset'] = req.query.preset;
    if (req.query.is_safe_harbor !== undefined) {
      filter['policy.is_safe_harbor'] = req.query.is_safe_harbor === 'true';
    }
    if (req.query.from || req.query.to) {
      filter.aigents_forwarded_at = {};
      if (req.query.from) filter.aigents_forwarded_at.$gte = new Date(req.query.from);
      if (req.query.to) filter.aigents_forwarded_at.$lte = new Date(req.query.to);
    }

    const runs = await DeidentAudit.find(filter)
      .sort({ aigents_forwarded_at: -1 })
      .limit(parseInt(req.query.limit, 10) || 200)
      .populate('user', 'name email')
      .populate('patient', 'medicalRecordNumber')
      .populate('study', 'studyId name shortTitle')
      .select('doc_id aigents_chain_run_id aigents_chain_title aigents_forwarded_at ' +
              'policy redaction_categories model_used model_version ' +
              'original_chars cleansed_chars chunk_count scrubbed_at ' +
              'user patient study');

    const summary = runs.reduce((acc, r) => {
      acc.total += 1;
      if (r.policy?.is_safe_harbor) acc.safe_harbor += 1;
      else acc.non_safe_harbor += 1;
      return acc;
    }, { total: 0, safe_harbor: 0, non_safe_harbor: 0 });

    res.status(200).json({ success: true, summary, count: runs.length, data: runs });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve chain-run report',
      error: error.message
    });
  }
};

// ---------- Synthetic fixture generator (demo / stress test) ----------
//
// Returns a synthetic clinical document with embedded fake PHI for
// demo and benchmarking. NOT for production use. Public endpoint by
// design — no auth — because it generates only fake data.

const FIRST_NAMES = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica',
                    'Robert', 'Maria', 'James', 'Linda', 'William', 'Patricia'];
const LAST_NAMES  = ['Sample', 'Test', 'Mock', 'Doe', 'Roe', 'Synthetic',
                    'Fictional', 'Placeholder', 'Demo', 'Example'];
const PROVIDERS   = ['Dr. Sarah Mitchell, MD', 'Dr. Robert Chen, MD',
                    'Dr. Lisa Park, NP', 'Dr. James O\'Brien, DO',
                    'Dr. Aisha Patel, MD'];
const COMPLAINTS  = ['shortness of breath', 'chest pain', 'fatigue',
                    'palpitations', 'dizziness', 'headache', 'abdominal pain'];
const MEDS        = ['lisinopril 10mg daily', 'metformin 500mg BID',
                    'atorvastatin 40mg qhs', 'aspirin 81mg daily',
                    'metoprolol 25mg BID', 'sertraline 50mg daily'];

function pick(arr, seed) { return arr[seed % arr.length]; }
function pad(n, w) { return String(n).padStart(w, '0'); }

function generateVisit(visitNum, seed) {
  const s = seed * (visitNum + 1);
  const first = pick(FIRST_NAMES, s);
  const last  = pick(LAST_NAMES, s + 7);
  const dob   = `${pad((s % 12) + 1, 2)}/${pad((s % 28) + 1, 2)}/19${50 + (s % 40)}`;
  const mrn   = `${10000000 + (s * 13) % 90000000}`;
  const visitDate = `2024-${pad((visitNum % 12) + 1, 2)}-${pad((visitNum * 3 % 28) + 1, 2)}`;
  const provider = pick(PROVIDERS, s + visitNum);
  const complaint = pick(COMPLAINTS, s + visitNum);
  const med1 = pick(MEDS, s);
  const med2 = pick(MEDS, s + 1);
  const phone = `(${200 + s % 700}) ${100 + s % 900}-${1000 + s % 9000}`;

  return `
==============================================================================
ENCOUNTER NOTE — Visit ${visitNum + 1}
==============================================================================
PATIENT: ${first} ${last}    DOB: ${dob}    MRN: ${mrn}
ENCOUNTER DATE: ${visitDate}    PROVIDER: ${provider}
CONTACT: ${phone}    EMAIL: ${first.toLowerCase()}.${last.toLowerCase()}@example.com

CHIEF COMPLAINT:
${first} presents today with ${complaint} ongoing for the past 2 weeks.
Symptoms reported as worse with exertion. Patient denies fevers or chills.

HISTORY OF PRESENT ILLNESS:
${visitNum === 0 ? `${first} is a ${30 + s % 50}-year-old patient first seen at our clinic for evaluation of ${complaint}.`
                : `${first} returns for follow-up of ${complaint}. Per the prior note from ${provider}, the patient was started on ${med1}.`}
The patient reports moderate improvement with current therapy. Sleep is
disturbed. Appetite normal. Spouse, ${pick(FIRST_NAMES, s + 4)} ${last}, accompanies
the patient and confirms the history.

PAST MEDICAL HISTORY: hypertension, hyperlipidemia, type 2 diabetes (controlled).
PAST SURGICAL HISTORY: appendectomy ${1990 + s % 20}.
SOCIAL HISTORY: ${pick(['non-smoker', 'former smoker, quit 5 years ago', 'smokes 1/2 ppd'], s)}.
Lives at ${100 + s % 9000} ${pick(['Main', 'Oak', 'Elm', 'Park'], s)} St,
${pick(['Springfield', 'Riverside', 'Lakeview', 'Hillsdale'], s)}, NY ${10000 + s % 90000}.

MEDICATIONS:
- ${med1}
- ${med2}
- multivitamin daily

PHYSICAL EXAM:
Vitals: BP ${110 + s % 40}/${60 + s % 30}, HR ${60 + s % 40}, T 98.${s % 10}, SpO2 ${94 + s % 6}%.
General: well-appearing, NAD. HEENT: unremarkable. Cardiac: regular rate
and rhythm, no murmurs. Lungs: clear bilaterally. Abdomen: soft, non-tender.

ASSESSMENT AND PLAN:
1. ${complaint.charAt(0).toUpperCase() + complaint.slice(1)} — likely ${pick(['multifactorial', 'cardiac in origin', 'related to deconditioning'], s)}.
   Plan: continue ${med1}, add ${med2} pending labs.
2. Routine health maintenance — labs ordered, follow-up in 6 weeks.

Reviewed and signed,
${provider}
`;
}

exports.generateSyntheticChart = (req, res) => {
  const pages = Math.max(1, Math.min(parseInt(req.query.pages, 10) || 5, 200));
  const seed = parseInt(req.query.seed, 10) || Date.now() % 1000;
  const visits = Math.max(1, Math.round(pages / 2));

  const header = `*** SYNTHETIC CLINICAL DOCUMENT — DO NOT USE FOR REAL PATIENT CARE ***
Generated for de-identification demo / benchmarking only.
Approximate pages: ${pages}    Visits: ${visits}    Seed: ${seed}
==============================================================================
`;

  let body = '';
  for (let i = 0; i < visits; i += 1) body += generateVisit(i, seed);

  const chart = header + body;
  res.status(200).json({
    success: true,
    meta: {
      pages_requested: pages,
      visits,
      seed,
      chars: chart.length,
      approx_tokens: Math.round(chart.length / 4)
    },
    data: chart
  });
};

// ---------- Aigents proxy forward ----------
//
// The browser POSTs the cleansed payload here along with a config_id.
// The server attaches the saved auth token (never exposed to browser),
// forwards to the Aigents webhook, and links any returned chain_run_id
// back to the audit record.

exports.forwardToAigents = async (req, res) => {
  const { config_id, payload, audit_id } = req.body;

  if (!config_id || !payload) {
    return res.status(400).json({
      success: false,
      message: 'config_id and payload are required'
    });
  }

  try {
    const config = await AigentsConfig.findById(config_id).select('+auth_token');
    if (!config) {
      return res.status(404).json({ success: false, message: 'Aigents config not found' });
    }
    if (!config.is_active) {
      return res.status(400).json({ success: false, message: 'Aigents config is inactive' });
    }

    const headers = { 'Content-Type': 'application/json' };
    const token = config.decryptedToken();
    if (config.auth_type === 'bearer' && token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (config.auth_type === 'basic' && token) {
      headers.Authorization = `Basic ${token}`;
    }

    const upstream = await fetch(config.webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }

    const chainRunId = body && typeof body === 'object'
      ? (body.chain_run_id || body.run_id || body.id)
      : null;

    if (audit_id && chainRunId) {
      await DeidentAudit.findByIdAndUpdate(audit_id, {
        aigents_chain_run_id: chainRunId,
        aigents_chain_title: payload.chain_title,
        aigents_forwarded_at: new Date()
      });
    }

    res.status(upstream.ok ? 200 : 502).json({
      success: upstream.ok,
      status: upstream.status,
      chain_run_id: chainRunId,
      data: body
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      message: 'Failed to forward to Aigents',
      error: error.message
    });
  }
};
