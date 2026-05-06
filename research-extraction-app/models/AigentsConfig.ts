import mongoose, { Schema, Document, Model } from 'mongoose';
import { encrypt, decrypt } from '@/lib/encryption';

export interface AigentsConfigDoc extends Document {
  name: string;
  webhook_url: string;
  auth_type: 'none' | 'bearer' | 'basic';
  auth_token?: string;
  default_chain_title?: string;
  default_folder_id?: string;
  description?: string;
  is_active: boolean;
  // Variable names the chain expects for the three cleansed fields.
  // Configurable so existing chains can plug in their own variable names.
  variables: {
    notes: string;
    procedures: string;
    labs: string;
  };
  created_by?: string;
  toSafeJSON(): Record<string, unknown>;
  decryptedToken(): string | null;
}

const aigentsConfigSchema = new Schema<AigentsConfigDoc>({
  name: { type: String, required: true, unique: true, trim: true },
  webhook_url: { type: String, required: true, trim: true },
  auth_type: { type: String, enum: ['none', 'bearer', 'basic'], default: 'none' },
  auth_token: { type: String, select: false },
  default_chain_title: { type: String, trim: true },
  default_folder_id: { type: String, trim: true },
  description: { type: String, trim: true },
  is_active: { type: Boolean, default: true },
  variables: {
    notes: { type: String, default: 'notes_cleansed' },
    procedures: { type: String, default: 'procedures_cleansed' },
    labs: { type: String, default: 'labs_cleansed' }
  },
  created_by: { type: String }
}, { timestamps: true });

aigentsConfigSchema.methods.toSafeJSON = function (this: AigentsConfigDoc) {
  const obj = this.toObject();
  delete obj.auth_token;
  return obj;
};

aigentsConfigSchema.pre('save', function (this: AigentsConfigDoc, next) {
  if (this.isModified('auth_token') && this.auth_token) {
    try {
      this.auth_token = encrypt(this.auth_token) as string;
    } catch (err) {
      return next(err as Error);
    }
  }
  next();
});

aigentsConfigSchema.methods.decryptedToken = function (this: AigentsConfigDoc) {
  if (!this.auth_token) return null;
  return decrypt(this.auth_token) as string;
};

export const AigentsConfig: Model<AigentsConfigDoc> =
  (mongoose.models.AigentsConfig as Model<AigentsConfigDoc>) ||
  mongoose.model<AigentsConfigDoc>('AigentsConfig', aigentsConfigSchema);
