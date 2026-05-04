const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LOCKED_CATEGORIES = ['PATIENT_NAME', 'DOB', 'SSN'];
const OPTIONAL_CATEGORIES = [
  'MRN', 'PROVIDER_NAME', 'VISIT_DATE', 'PHONE', 'EMAIL', 'ADDRESS',
  'AGE_OVER_89', 'ACCOUNT_NUMBER', 'DEVICE_ID', 'RELATIVE_NAME',
  'EMPLOYER_NAME', 'URL_OR_IP', 'BIOMETRIC_ID', 'FACIAL_PHOTO_REF',
  'OTHER_UNIQUE_ID'
];

const phiPolicySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  preset: {
    type: String,
    enum: ['safe_harbor', 'internal_research', 'minimal', 'custom'],
    default: 'custom'
  },
  redact: {
    type: Map,
    of: Boolean,
    default: () => new Map(OPTIONAL_CATEGORIES.map(c => [c, true]))
  },
  notes: {
    type: String,
    trim: true
  },
  study: {
    type: Schema.Types.ObjectId,
    ref: 'Study'
  },
  irb_protocol: {
    type: String,
    trim: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

phiPolicySchema.virtual('is_safe_harbor').get(function () {
  return OPTIONAL_CATEGORIES.every(c => this.redact?.get(c) === true);
});

phiPolicySchema.set('toJSON', { virtuals: true });
phiPolicySchema.set('toObject', { virtuals: true });

phiPolicySchema.statics.LOCKED_CATEGORIES = LOCKED_CATEGORIES;
phiPolicySchema.statics.OPTIONAL_CATEGORIES = OPTIONAL_CATEGORIES;

module.exports = mongoose.model('PhiPolicy', phiPolicySchema);
