// Usage:
//   MONGODB_URI=... DEIDENT_ENCRYPTION_KEY=... AIGENTS_WEBHOOK_URL=... \
//   AIGENTS_TOKEN=... AIGENTS_CHAIN_TITLE=... npm run seed:aigents
//
// Idempotent: upserts a single AigentsConfig record by name.

import 'dotenv/config';
import mongoose from 'mongoose';
import { AigentsConfig } from '../models/AigentsConfig';

const NAME = process.env.AIGENTS_CONFIG_NAME || 'default';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await mongoose.connect(uri);

  const existing = await AigentsConfig.findOne({ name: NAME }).select('+auth_token');
  const fields = {
    name: NAME,
    webhook_url: process.env.AIGENTS_WEBHOOK_URL ?? existing?.webhook_url,
    auth_type: (process.env.AIGENTS_AUTH_TYPE as 'bearer' | 'basic' | 'none') ?? existing?.auth_type ?? 'bearer',
    default_chain_title: process.env.AIGENTS_CHAIN_TITLE ?? existing?.default_chain_title,
    description: process.env.AIGENTS_DESCRIPTION ?? existing?.description ?? 'seeded',
    is_active: true,
    variables: {
      notes:      process.env.AIGENTS_VAR_NOTES      ?? existing?.variables?.notes      ?? 'notes_cleansed',
      procedures: process.env.AIGENTS_VAR_PROCEDURES ?? existing?.variables?.procedures ?? 'procedures_cleansed',
      labs:       process.env.AIGENTS_VAR_LABS       ?? existing?.variables?.labs       ?? 'labs_cleansed'
    }
  };

  if (!fields.webhook_url) throw new Error('AIGENTS_WEBHOOK_URL is required for first run');

  if (existing) {
    Object.assign(existing, fields);
    if (process.env.AIGENTS_TOKEN) existing.auth_token = process.env.AIGENTS_TOKEN;
    await existing.save();
    console.log(`Updated AigentsConfig "${NAME}" (${existing._id})`);
  } else {
    const created = await AigentsConfig.create({
      ...fields,
      auth_token: process.env.AIGENTS_TOKEN
    });
    console.log(`Created AigentsConfig "${NAME}" (${created._id})`);
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
