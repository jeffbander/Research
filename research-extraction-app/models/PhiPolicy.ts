import mongoose, { Schema, Document, Model } from 'mongoose';
import { OPTIONAL_CATEGORIES } from '@/lib/phi-policy';

export interface PhiPolicyDoc extends Document {
  name: string;
  preset: 'safe_harbor' | 'internal_research' | 'minimal' | 'custom';
  redact: Map<string, boolean>;
  notes?: string;
  irb_protocol?: string;
  is_active: boolean;
  created_by?: string;
  is_safe_harbor: boolean;
}

const phiPolicySchema = new Schema<PhiPolicyDoc>({
  name: { type: String, required: true, unique: true, trim: true },
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
  notes: { type: String, trim: true },
  irb_protocol: { type: String, trim: true },
  is_active: { type: Boolean, default: true },
  created_by: { type: String }
}, { timestamps: true });

phiPolicySchema.virtual('is_safe_harbor').get(function (this: PhiPolicyDoc) {
  return OPTIONAL_CATEGORIES.every(c => this.redact?.get(c) === true);
});

phiPolicySchema.set('toJSON', { virtuals: true });
phiPolicySchema.set('toObject', { virtuals: true });

export const PhiPolicy: Model<PhiPolicyDoc> =
  (mongoose.models.PhiPolicy as Model<PhiPolicyDoc>) ||
  mongoose.model<PhiPolicyDoc>('PhiPolicy', phiPolicySchema);
