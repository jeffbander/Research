const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const patientSchema = new Schema({
  // Basic Information
  medicalRecordNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  study: {
    type: Schema.Types.ObjectId,
    ref: 'Study',
    required: true
  },
  enrollmentDate: {
    type: Date,
    required: true
  },
  enrollmentStatus: {
    type: String,
    enum: ['screened', 'enrolled', 'completed', 'withdrawn', 'ineligible'],
    default: 'screened'
  },
  withdrawalReason: {
    type: String,
    trim: true
  },
  
  // Visit Information
  visitSchedule: [{
    visitNumber: Number,
    scheduledDate: Date,
    actualDate: Date,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'missed', 'rescheduled'],
      default: 'scheduled'
    },
    notes: String
  }],
  
  // Event Tracking
  events: [{
    eventType: {
      type: String,
      enum: ['adverse_event', 'protocol_deviation', 'special_procedure', 'other'],
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'n/a'],
      default: 'n/a'
    },
    relatedToStudy: {
      type: Boolean,
      default: false
    },
    resolution: {
      type: String
    },
    resolutionDate: {
      type: Date
    }
  }],
  
  // Documents
  documents: [{
    title: String,
    type: {
      type: String,
      enum: ['consent', 'eligibility', 'medical_record', 'other']
    },
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
patientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for completed visits count
patientSchema.virtual('completedVisitsCount').get(function() {
  return this.visitSchedule ? this.visitSchedule.filter(visit => visit.status === 'completed').length : 0;
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
