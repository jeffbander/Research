const express = require('express');
const router = express.Router();
const {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  listAigentsConfigs,
  getAigentsConfig,
  createAigentsConfig,
  updateAigentsConfig,
  deleteAigentsConfig,
  forwardToAigents
} = require('../controllers/deidentController');

// Audit log
router.post('/audit', createAuditLog);
router.get('/audit', getAuditLogs);
router.get('/audit/:id', getAuditLogById);

// Aigents configs (server-stored webhook URLs + auth tokens)
router.get('/aigents-configs', listAigentsConfigs);
router.get('/aigents-configs/:id', getAigentsConfig);
router.post('/aigents-configs', createAigentsConfig);
router.put('/aigents-configs/:id', updateAigentsConfig);
router.delete('/aigents-configs/:id', deleteAigentsConfig);

// Forward cleansed payload to Aigents (server attaches stored auth)
router.post('/forward', forwardToAigents);

module.exports = router;
