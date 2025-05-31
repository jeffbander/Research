const Budget = require('../models/budgetModel');
const Transaction = require('../models/transactionModel');

// Get all budgets
exports.getAllBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find()
      .populate('study', 'studyId name shortTitle')
      .populate('createdBy', 'firstName lastName email')
      .populate('transactions');
    
    res.status(200).json({
      success: true,
      count: budgets.length,
      data: budgets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve budgets',
      error: error.message
    });
  }
};

// Get budget by ID
exports.getBudgetById = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id)
      .populate('study', 'studyId name shortTitle')
      .populate('createdBy', 'firstName lastName email')
      .populate('transactions');
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: budget
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve budget',
      error: error.message
    });
  }
};

// Get budget by study
exports.getBudgetByStudy = async (req, res) => {
  try {
    const budget = await Budget.findOne({ study: req.params.studyId })
      .populate('study', 'studyId name shortTitle')
      .populate('createdBy', 'firstName lastName email')
      .populate('transactions');
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found for this study'
      });
    }
    
    res.status(200).json({
      success: true,
      data: budget
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve budget for this study',
      error: error.message
    });
  }
};

// Create new budget
exports.createBudget = async (req, res) => {
  try {
    // Add current user as creator
    req.body.createdBy = req.user.id;
    
    const budget = await Budget.create(req.body);
    
    res.status(201).json({
      success: true,
      data: budget
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create budget',
      error: error.message
    });
  }
};

// Update budget
exports.updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: budget
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update budget',
      error: error.message
    });
  }
};

// Delete budget
exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    // Check if there are transactions associated with this budget
    const transactions = await Transaction.find({ budget: budget._id });
    
    if (transactions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete budget with associated transactions'
      });
    }
    
    await budget.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete budget',
      error: error.message
    });
  }
};

// Update budget status
exports.updateBudgetStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: budget
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update budget status',
      error: error.message
    });
  }
};
