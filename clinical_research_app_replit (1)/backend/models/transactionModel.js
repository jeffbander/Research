const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  // Basic Information
  study: {
    type: Schema.Types.ObjectId,
    ref: 'Study',
    required: true
  },
  budget: {
    type: Schema.Types.ObjectId,
    ref: 'Budget'
  },
  transactionType: {
    type: String,
    enum: ['invoice', 'payment', 'adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'overdue', 'cancelled'],
    default: 'pending'
  },
  
  // Invoice Specific
  invoiceNumber: {
    type: String,
    trim: true
  },
  dueDate: {
    type: Date
  },
  itemsBilled: [{
    description: String,
    amount: Number,
    quantity: {
      type: Number,
      default: 1
    }
  }],
  recipient: {
    name: String,
    email: String,
    address: String
  },
  
  // Payment Specific
  paymentMethod: {
    type: String,
    enum: ['check', 'wire_transfer', 'credit_card', 'other'],
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  payerInformation: {
    name: String,
    contactInfo: String
  },
  
  // Associated Documents
  documents: [{
    title: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    filePath: String
  }],
  
  notes: {
    type: String
  },
  
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
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for days overdue
transactionSchema.virtual('daysOverdue').get(function() {
  if (this.status !== 'overdue' || !this.dueDate) return 0;
  
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = Math.abs(today - dueDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
