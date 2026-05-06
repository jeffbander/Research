import { v } from 'convex/values';
import { mutation, query, internalMutation } from './_generated/server';
import { requireUserId } from './lib/auth';

const fieldStats = v.object({
  original_chars: v.number(),
  cleansed_chars: v.number(),
  chunks: v.number(),
  redactions: v.number()
});

export const create = mutation({
  args: {
    doc_id: v.string(),
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
    })
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert('deidentAudits', {
      ...args,
      user_id: userId,
      scrubbed_at: Date.now()
    });
  }
});

export const listForUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query('deidentAudits')
      .withIndex('by_user', q => q.eq('user_id', userId))
      .order('desc')
      .take(limit ?? 50);
  }
});

export const linkChainRunInternal = internalMutation({
  args: {
    id: v.id('deidentAudits'),
    aigents_config_id: v.string(),
    aigents_chain_run_id: v.string(),
    aigents_chain_title: v.optional(v.string())
  },
  handler: async (ctx, { id, ...rest }) => {
    await ctx.db.patch(id, {
      ...rest,
      aigents_forwarded_at: Date.now()
    });
  }
});
