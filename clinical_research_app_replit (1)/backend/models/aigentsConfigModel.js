const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { encrypt, decrypt } = require('../utils/encryption');

const aigentsConfigSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  webhook_url: {
    type: String,
    required: true,
    trim: true
  },
  auth_type: {
    type: String,
    enum: ['none', 'bearer', 'basic'],
    default: 'none'
  },
  auth_token: {
    type: String,
    select: false
  },
  default_chain_title: {
    type: String,
    trim: true
  },
  default_folder_id: {
    type: String,
    trim: true
  },
  description: {
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

aigentsConfigSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.auth_token;
  return obj;
};

// Token is encrypted at rest. Encryption only triggers when the field
// changes, so re-saves of a loaded doc don't double-encrypt.
aigentsConfigSchema.pre('save', function (next) {
  if (this.isModified('auth_token') && this.auth_token) {
    try {
      this.auth_token = encrypt(this.auth_token);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

aigentsConfigSchema.methods.decryptedToken = function () {
  if (!this.auth_token) return null;
  return decrypt(this.auth_token);
};

module.exports = mongoose.model('AigentsConfig', aigentsConfigSchema);
