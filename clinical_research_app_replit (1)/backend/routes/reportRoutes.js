const express = require('express');
const router = express.Router();
const { 
  getFinancialSummary, 
  getProfitLossReport, 
  getMissingPaymentsReport,
  getEnrollmentReport,
  getStudyStatusReport,
  generateCustomReport
} = require('../controllers/reportController');

// Get financial summary
router.get('/financial-summary', getFinancialSummary);

// Get profit and loss report
router.get('/profit-loss', getProfitLossReport);

// Get missing payments report
router.get('/missing-payments', getMissingPaymentsReport);

// Get enrollment report
router.get('/enrollment', getEnrollmentReport);

// Get study status report
router.get('/study-status', getStudyStatusReport);

// Generate custom report
router.post('/custom', generateCustomReport);

module.exports = router;
