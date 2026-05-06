import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const fieldStats = v.object({
  original_chars: v.number(),
  cleansed_chars: v.number(),
  chunks: v.number(),
  redactions: v.number()
});

export default defineSchema({
  aigentsConfigs: defineTable({
    name: v.string(),
    webhook_url: v.string(),
    auth_type: v.union(v.literal('none'), v.literal('bearer'), v.literal('basic')),
    auth_token_encrypted: v.optional(v.string()),
    default_chain_title: v.optional(v.string()),
    default_folder_id: v.optional(v.string()),
    description: v.optional(v.string()),
    is_active: v.boolean(),
    variables: v.object({
      notes: v.string(),
      procedures: v.string(),
      labs: v.string()
    }),
    created_by: v.optional(v.string())
  })
    .index('by_name', ['name'])
    .index('by_active', ['is_active']),

  deidentAudits: defineTable({
    doc_id: v.string(),
    user_id: v.string(),
    fields: v.object({
      notes: fieldStats,
      procedures: fieldStats,
      labs: fieldStats
    }),
    combined: v.object({
      input_sha256: v.string(),
      output_sha256: v.string(),
      redaction_categories: v.record(v.string(), v.number())
    }),
    model_used: v.string(),
    elapsed_ms: v.number(),
    policy: v.object({
      preset: v.string(),
      is_safe_harbor: v.boolean(),
      redacted_categories: v.array(v.string()),
      preserved_categories: v.array(v.string()),
      notes: v.optional(v.string())
    }),
    aigents_config_id: v.optional(v.string()),
    aigents_chain_run_id: v.optional(v.string()),
    aigents_chain_title: v.optional(v.string()),
    aigents_forwarded_at: v.optional(v.number()),
    scrubbed_at: v.number()
  })
    .index('by_user', ['user_id', 'scrubbed_at'])
    .index('by_doc', ['doc_id']),

  phiPolicies: defineTable({
    name: v.string(),
    preset: v.union(
      v.literal('safe_harbor'),
      v.literal('internal_research'),
      v.literal('minimal'),
      v.literal('custom')
    ),
    redact: v.record(v.string(), v.boolean()),
    notes: v.optional(v.string()),
    irb_protocol: v.optional(v.string()),
    is_active: v.boolean(),
    created_by: v.optional(v.string())
  })
    .index('by_name', ['name'])
    .index('by_active', ['is_active'])
});
