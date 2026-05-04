const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deidentAuditSchema = new Schema({
  doc_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient'
  },
  study: {
    type: Schema.Types.ObjectId,
    ref: 'Study'
  },

  original_chars: Number,
  cleansed_chars: Number,
  chunk_count: Number,
  input_sha256: String,
  output_sha256: String,
  model_used: String,
  model_version: String,
  elapsed_ms: Number,
  user_agent_gpu: String,

  policy: {
    preset: { type: String, enum: ['safe_harbor', 'internal_research', 'minimal', 'custom'] },
    is_safe_harbor: Boolean,
    redacted_categories: [String],
    preserved_categories: [String],
    notes: String
  },

  redaction_categories: {
    type: Map,
    of: Number,
    default: {}
  },

  aigents_chain_run_id: String,
  aigents_chain_title: String,
  aigents_forwarded_at: Date,

  scrubbed_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

deidentAuditSchema.index({ user: 1, scrubbed_at: -1 });
deidentAuditSchema.index({ patient: 1, scrubbed_at: -1 });
deidentAuditSchema.index({ study: 1, scrubbed_at: -1 });
deidentAuditSchema.index({ 'policy.is_safe_harbor': 1 });

module.exports = mongoose.model('DeidentAudit', deidentAuditSchema);
