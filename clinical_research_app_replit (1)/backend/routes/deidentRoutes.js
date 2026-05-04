const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  listAigentsConfigs,
  getAigentsConfig,
  createAigentsConfig,
  updateAigentsConfig,
  deleteAigentsConfig,
  forwardToAigents,
  listPhiPolicies,
  getPhiPolicy,
  createPhiPolicy,
  updatePhiPolicy,
  deletePhiPolicy
} = require('../controllers/deidentController');

// Audit log — auth required because it ties cleansing events to users
router.post('/audit', protect, createAuditLog);
router.get('/audit', protect, getAuditLogs);
router.get('/audit/:id', protect, getAuditLogById);

// Aigents configs — read open to authed users; mutations admin-only
// because the auth_token is a shared lab-wide secret
router.get('/aigents-configs', protect, listAigentsConfigs);
router.get('/aigents-configs/:id', protect, getAigentsConfig);
router.post('/aigents-configs', protect, authorize('admin'), createAigentsConfig);
router.put('/aigents-configs/:id', protect, authorize('admin'), updateAigentsConfig);
router.delete('/aigents-configs/:id', protect, authorize('admin'), deleteAigentsConfig);

// PHI policies — read open to authed users; mutations restricted so a
// researcher can't silently weaken the policy a study runs under
router.get('/policies', protect, listPhiPolicies);
router.get('/policies/:id', protect, getPhiPolicy);
router.post('/policies', protect, authorize('admin', 'principal_investigator'), createPhiPolicy);
router.put('/policies/:id', protect, authorize('admin', 'principal_investigator'), updatePhiPolicy);
router.delete('/policies/:id', protect, authorize('admin'), deletePhiPolicy);

// Forward cleansed payload to Aigents (server attaches stored auth)
router.post('/forward', protect, forwardToAigents);

module.exports = router;
