const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const budgetSchema = new Schema({
  // Basic Information
  study: {
    type: Schema.Types.ObjectId,
    ref: 'Study',
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  approvalDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'active', 'closed'],
    default: 'draft'
  },
  
  // Budget Line Items
  lineItems: [{
    category: {
      type: String,
      enum: ['personnel', 'patient_care', 'supplies', 'equipment', 'travel', 'other'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    budgetedAmount: {
      type: Number,
      required: true
    },
    actualAmount: {
      type: Number,
      default: 0
    },
    notes: String
  }],
  
  // Financial Transactions
  transactions: [{
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Pre-save middleware to update the updatedAt field
budgetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for budget variance
budgetSchema.virtual('totalVariance').get(function() {
  if (!this.lineItems || this.lineItems.length === 0) return 0;
  
  const totalActual = this.lineItems.reduce((sum, item) => sum + (item.actualAmount || 0), 0);
  return this.totalAmount - totalActual;
});

// Virtual for budget utilization percentage
budgetSchema.virtual('utilizationPercentage').get(function() {
  if (!this.lineItems || this.lineItems.length === 0 || this.totalAmount === 0) return 0;
  
  const totalActual = this.lineItems.reduce((sum, item) => sum + (item.actualAmount || 0), 0);
  return (totalActual / this.totalAmount) * 100;
});

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;
