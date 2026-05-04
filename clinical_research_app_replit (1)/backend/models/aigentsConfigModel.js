const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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

module.exports = mongoose.model('AigentsConfig', aigentsConfigSchema);
