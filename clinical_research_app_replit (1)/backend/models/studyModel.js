const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studySchema = new Schema({
  // Basic Information
  studyId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  shortTitle: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  studyType: {
    type: String,
    enum: ['interventional', 'observational', 'expanded_access', 'other'],
    required: true
  },
  phase: {
    type: String,
    enum: ['n/a', 'phase_1', 'phase_2', 'phase_3', 'phase_4'],
    default: 'n/a'
  },
  therapeuticArea: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  estimatedEndDate: {
    type: Date,
    required: true
  },
  actualEndDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['draft', 'under_consideration', 'sponsor_approved', 'cta_executed', 'gco_submitted', 'gco_approved', 'irb_submitted', 'irb_approved', 'active', 'completed', 'terminated', 'on_hold'],
    default: 'draft'
  },

  // Administrative Information
  irbProtocolNumber: {
    type: String,
    trim: true
  },
  principalInvestigator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subInvestigators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  researchCoordinators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  sponsorName: {
    type: String,
    required: true,
    trim: true
  },
  sponsorType: {
    type: String,
    enum: ['industry', 'government', 'internal', 'other'],
    required: true
  },
  sponsorContact: {
    name: String,
    email: String,
    phone: String
  },
  fundAccountNumbers: [{
    type: String,
    trim: true
  }],
  hospitalResearchIdentifiers: [{
    type: String,
    trim: true
  }],

  // Workflow Status
  workflowStatus: {
    underConsideration: {
      date: Date,
      notes: String
    },
    sponsorApproval: {
      date: Date,
      notes: String
    },
    ctaStatus: {
      date: Date,
      status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started'
      },
      notes: String
    },
    gcoSubmission: {
      date: Date,
      notes: String
    },
    gcoApproval: {
      date: Date,
      notes: String
    },
    irbSubmission: {
      date: Date,
      notes: String
    },
    irbApproval: {
      date: Date,
      notes: String
    },
    irbExpiration: {
      date: Date
    },
    renewalStatus: {
      type: String,
      enum: ['not_needed', 'pending', 'approved'],
      default: 'not_needed'
    }
  },

  // Documents
  documents: [{
    title: String,
    type: {
      type: String,
      enum: ['protocol', 'consent_form', 'budget', 'contract', 'irb_submission', 'other']
    },
    version: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    filePath: String,
    notes: String
  }],

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update the updatedAt field
studySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for enrollment count
studySchema.virtual('enrollmentCount').get(function() {
  return this.patients ? this.patients.length : 0;
});

const Study = mongoose.model('Study', studySchema);

module.exports = Study;
