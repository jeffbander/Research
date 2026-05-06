import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { requireUserId, requireAdmin } from './lib/auth';
import { LOCKED_CATEGORIES, OPTIONAL_CATEGORIES } from '../lib/phi-policy';

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const policies = await ctx.db
      .query('phiPolicies')
      .withIndex('by_active', q => q.eq('is_active', true))
      .collect();
    return {
      policies,
      meta: {
        locked_categories: LOCKED_CATEGORIES,
        optional_categories: OPTIONAL_CATEGORIES
      }
    };
  }
});

export const create = mutation({
  args: {
    name: v.string(),
    preset: v.union(
      v.literal('safe_harbor'),
      v.literal('internal_research'),
      v.literal('minimal'),
      v.literal('custom')
    ),
    redact: v.record(v.string(), v.boolean()),
    notes: v.optional(v.string()),
    irb_protocol: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    return await ctx.db.insert('phiPolicies', {
      ...args,
      is_active: true,
      created_by: userId
    });
  }
});

export const update = mutation({
  args: {
    id: v.id('phiPolicies'),
    name: v.optional(v.string()),
    preset: v.optional(v.union(
      v.literal('safe_harbor'),
      v.literal('internal_research'),
      v.literal('minimal'),
      v.literal('custom')
    )),
    redact: v.optional(v.record(v.string(), v.boolean())),
    notes: v.optional(v.string()),
    irb_protocol: v.optional(v.string()),
    is_active: v.optional(v.boolean())
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, patch);
    return id;
  }
});

export const remove = mutation({
  args: { id: v.id('phiPolicies') },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  }
});
