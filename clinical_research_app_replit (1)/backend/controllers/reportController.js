const Study = require('../models/studyModel');
const Budget = require('../models/budgetModel');
const Transaction = require('../models/transactionModel');
const Patient = require('../models/patientModel');

// Get financial summary
exports.getFinancialSummary = async (req, res) => {
  try {
    // Get total budget amount across all studies
    const budgets = await Budget.find();
    const totalBudgeted = budgets.reduce((sum, budget) => sum + budget.totalAmount, 0);
    
    // Get total actual expenses
    const totalActual = budgets.reduce((sum, budget) => {
      if (!budget.lineItems || budget.lineItems.length === 0) return sum;
      return sum + budget.lineItems.reduce((itemSum, item) => itemSum + (item.actualAmount || 0), 0);
    }, 0);
    
    // Get total received payments
    const transactions = await Transaction.find({ transactionType: 'payment', status: 'completed' });
    const totalReceived = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    // Get pending payments
    const pendingTransactions = await Transaction.find({ 
      transactionType: 'invoice', 
      status: { $in: ['pending', 'overdue'] } 
    });
    const totalPending = pendingTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    // Get overdue payments
    const overdueTransactions = await Transaction.find({ 
      transactionType: 'invoice', 
      status: 'overdue' 
    });
    const totalOverdue = overdueTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    res.status(200).json({
      success: true,
      data: {
        totalBudgeted,
        totalActual,
        totalReceived,
        totalPending,
        totalOverdue,
        balance: totalReceived - totalActual,
        utilizationPercentage: totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate financial summary',
      error: error.message
    });
  }
};

// Get profit and loss report
exports.getProfitLossReport = async (req, res) => {
  try {
    // Get studies with their budgets
    const studies = await Study.find().select('studyId name shortTitle');
    
    const profitLossData = await Promise.all(studies.map(async (study) => {
      // Get budget for this study
      const budget = await Budget.findOne({ study: study._id });
      
      // Get completed payments for this study
      const payments = await Transaction.find({ 
        study: study._id, 
        transactionType: 'payment', 
        status: 'completed' 
      });
      const totalReceived = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      // Get actual expenses for this study
      let totalExpenses = 0;
      if (budget && budget.lineItems && budget.lineItems.length > 0) {
        totalExpenses = budget.lineItems.reduce((sum, item) => sum + (item.actualAmount || 0), 0);
      }
      
      // Calculate profit/loss
      const profitLoss = totalReceived - totalExpenses;
      
      return {
        studyId: study.studyId,
        name: study.name,
        shortTitle: study.shortTitle,
        totalReceived,
        totalExpenses,
        profitLoss,
        profitMargin: totalReceived > 0 ? (profitLoss / totalReceived) * 100 : 0
      };
    }));
    
    res.status(200).json({
      success: true,
      count: profitLossData.length,
      data: profitLossData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate profit and loss report',
      error: error.message
    });
  }
};

// Get missing payments report
exports.getMissingPaymentsReport = async (req, res) => {
  try {
    // Get all pending and overdue invoices
    const missingPayments = await Transaction.find({ 
      transactionType: 'invoice', 
      status: { $in: ['pending', 'overdue'] } 
    }).populate('study', 'studyId name shortTitle');
    
    // Group by study and status
    const groupedByStudy = {};
    
    missingPayments.forEach(payment => {
      const studyId = payment.study._id.toString();
      
      if (!groupedByStudy[studyId]) {
        groupedByStudy[studyId] = {
          studyId: payment.study.studyId,
          name: payment.study.name,
          shortTitle: payment.study.shortTitle,
          pending: [],
          overdue: []
        };
      }
      
      if (payment.status === 'pending') {
        groupedByStudy[studyId].pending.push({
          id: payment._id,
          amount: payment.amount,
          dueDate: payment.dueDate,
          invoiceNumber: payment.invoiceNumber
        });
      } else {
        groupedByStudy[studyId].overdue.push({
          id: payment._id,
          amount: payment.amount,
          dueDate: payment.dueDate,
          invoiceNumber: payment.invoiceNumber,
          daysOverdue: payment.daysOverdue
        });
      }
    });
    
    const result = Object.values(groupedByStudy).map(study => {
      const totalPending = study.pending.reduce((sum, payment) => sum + payment.amount, 0);
      const totalOverdue = study.overdue.reduce((sum, payment) => sum + payment.amount, 0);
      
      return {
        ...study,
        totalPending,
        totalOverdue,
        totalMissing: totalPending + totalOverdue
      };
    });
    
    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate missing payments report',
      error: error.message
    });
  }
};

// Get enrollment report
exports.getEnrollmentReport = async (req, res) => {
  try {
    // Get studies with their enrollment targets
    const studies = await Study.find().select('studyId name shortTitle');
    
    const enrollmentData = await Promise.all(studies.map(async (study) => {
      // Get patients for this study
      const patients = await Patient.find({ study: study._id });
      
      // Count by enrollment status
      const statusCounts = {
        screened: 0,
        enrolled: 0,
        completed: 0,
        withdrawn: 0,
        ineligible: 0
      };
      
      patients.forEach(patient => {
        if (statusCounts.hasOwnProperty(patient.enrollmentStatus)) {
          statusCounts[patient.enrollmentStatus]++;
        }
      });
      
      return {
        studyId: study.studyId,
        name: study.name,
        shortTitle: study.shortTitle,
        totalPatients: patients.length,
        ...statusCounts,
        screenFailureRate: statusCounts.screened > 0 ? 
          (statusCounts.ineligible / statusCounts.screened) * 100 : 0,
        completionRate: statusCounts.enrolled > 0 ? 
          (statusCounts.completed / statusCounts.enrolled) * 100 : 0
      };
    }));
    
    res.status(200).json({
      success: true,
      count: enrollmentData.length,
      data: enrollmentData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate enrollment report',
      error: error.message
    });
  }
};

// Get study status report
exports.getStudyStatusReport = async (req, res) => {
  try {
    // Count studies by status
    const statusCounts = await Study.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Format the results
    const formattedCounts = {};
    statusCounts.forEach(item => {
      formattedCounts[item._id] = item.count;
    });
    
    // Get total count
    const totalStudies = await Study.countDocuments();
    
    // Get studies by workflow stage
    const workflowData = {
      underConsideration: await Study.countDocuments({ 'workflowStatus.underConsideration.date': { $exists: true } }),
      sponsorApproval: await Study.countDocuments({ 'workflowStatus.sponsorApproval.date': { $exists: true } }),
      ctaExecuted: await Study.countDocuments({ 'workflowStatus.ctaStatus.status': 'completed' }),
      gcoSubmitted: await Study.countDocuments({ 'workflowStatus.gcoSubmission.date': { $exists: true } }),
      gcoApproved: await Study.countDocuments({ 'workflowStatus.gcoApproval.date': { $exists: true } }),
      irbSubmitted: await Study.countDocuments({ 'workflowStatus.irbSubmission.date': { $exists: true } }),
      irbApproved: await Study.countDocuments({ 'workflowStatus.irbApproval.date': { $exists: true } })
    };
    
    res.status(200).json({
      success: true,
      data: {
        totalStudies,
        statusCounts: formattedCounts,
        workflowData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate study status report',
      error: error.message
    });
  }
};

// Generate custom report
exports.generateCustomReport = async (req, res) => {
  try {
    const { reportType, filters, dateRange } = req.body;
    
    if (!reportType) {
      return res.status(400).json({
        success: false,
        message: 'Report type is required'
      });
    }
    
    // This is a placeholder for custom report generation
    // In a real implementation, this would handle various report types with custom logic
    
    res.status(200).json({
      success: true,
      message: 'Custom report generation is not fully implemented in this MVP',
      data: {
        reportType,
        filters,
        dateRange
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate custom report',
      error: error.message
    });
  }
};
