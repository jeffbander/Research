import mongoose, { Schema, Document, Model } from 'mongoose';

export interface DeidentAuditDoc extends Document {
  doc_id: string;
  user_id?: string; // Clerk user id
  fields: {
    notes:      { original_chars: number; cleansed_chars: number; chunks: number; redactions: number };
    procedures: { original_chars: number; cleansed_chars: number; chunks: number; redactions: number };
    labs:       { original_chars: number; cleansed_chars: number; chunks: number; redactions: number };
  };
  combined: {
    input_sha256: string;
    output_sha256: string;
    redaction_categories: Map<string, number>;
  };
  model_used: string;
  model_version?: string;
  elapsed_ms?: number;
  policy: {
    preset: string;
    is_safe_harbor: boolean;
    redacted_categories: string[];
    preserved_categories: string[];
    notes?: string;
  };
  aigents_config_id?: string;
  aigents_chain_run_id?: string;
  aigents_chain_title?: string;
  aigents_forwarded_at?: Date;
  scrubbed_at: Date;
}

const fieldStats = {
  original_chars: Number,
  cleansed_chars: Number,
  chunks: Number,
  redactions: Number
};

const deidentAuditSchema = new Schema<DeidentAuditDoc>({
  doc_id: { type: String, required: true, unique: true, trim: true },
  user_id: { type: String, index: true },
  fields: {
    notes: fieldStats,
    procedures: fieldStats,
    labs: fieldStats
  },
  combined: {
    input_sha256: String,
    output_sha256: String,
    redaction_categories: { type: Map, of: Number, default: {} }
  },
  model_used: String,
  model_version: String,
  elapsed_ms: Number,
  policy: {
    preset: { type: String, enum: ['safe_harbor', 'internal_research', 'minimal', 'custom'] },
    is_safe_harbor: Boolean,
    redacted_categories: [String],
    preserved_categories: [String],
    notes: String
  },
  aigents_config_id: String,
  aigents_chain_run_id: String,
  aigents_chain_title: String,
  aigents_forwarded_at: Date,
  scrubbed_at: { type: Date, default: Date.now }
}, { timestamps: true });

deidentAuditSchema.index({ user_id: 1, scrubbed_at: -1 });
deidentAuditSchema.index({ 'policy.is_safe_harbor': 1 });

export const DeidentAudit: Model<DeidentAuditDoc> =
  (mongoose.models.DeidentAudit as Model<DeidentAuditDoc>) ||
  mongoose.model<DeidentAuditDoc>('DeidentAudit', deidentAuditSchema);
