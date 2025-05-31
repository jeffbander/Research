const express = require('express');
const router = express.Router();
const { 
  getAllBudgets, 
  getBudgetById, 
  createBudget, 
  updateBudget, 
  deleteBudget,
  getBudgetByStudy,
  updateBudgetStatus
} = require('../controllers/budgetController');

// Get all budgets
router.get('/', getAllBudgets);

// Get a specific budget
router.get('/:id', getBudgetById);

// Get budget by study
router.get('/study/:studyId', getBudgetByStudy);

// Create a new budget
router.post('/', createBudget);

// Update a budget
router.put('/:id', updateBudget);

// Delete a budget
router.delete('/:id', deleteBudget);

// Update budget status
router.patch('/:id/status', updateBudgetStatus);

module.exports = router;
