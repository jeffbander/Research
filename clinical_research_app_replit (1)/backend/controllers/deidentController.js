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
