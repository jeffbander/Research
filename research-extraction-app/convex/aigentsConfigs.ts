import { v } from 'convex/values';
import { query, internalMutation, internalQuery } from './_generated/server';
import { requireUserId } from './lib/auth';
import type { Doc } from './_generated/dataModel';

function stripToken(c: Doc<'aigentsConfigs'>) {
  const { auth_token_encrypted: _t, ...safe } = c;
  return safe;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const configs = await ctx.db
      .query('aigentsConfigs')
      .withIndex('by_active', q => q.eq('is_active', true))
      .collect();
    return configs.map(stripToken);
  }
});

export const get = query({
  args: { id: v.id('aigentsConfigs') },
  handler: async (ctx, { id }) => {
    await requireUserId(ctx);
    const config = await ctx.db.get(id);
    return config ? stripToken(config) : null;
  }
});

// Internal helpers used by actions in aigentsConfigsAdmin.ts.
// Marked internal so the client can't bypass the action layer.

export const insertInternal = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('aigentsConfigs', args);
  }
});

export const patchInternal = internalMutation({
  args: {
    id: v.id('aigentsConfigs'),
    patch: v.object({
      name: v.optional(v.string()),
      webhook_url: v.optional(v.string()),
      auth_type: v.optional(v.union(v.literal('none'), v.literal('bearer'), v.literal('basic'))),
      auth_token_encrypted: v.optional(v.string()),
      default_chain_title: v.optional(v.string()),
      default_folder_id: v.optional(v.string()),
      description: v.optional(v.string()),
      is_active: v.optional(v.boolean()),
      variables: v.optional(v.object({
        notes: v.string(),
        procedures: v.string(),
        labs: v.string()
      }))
    })
  },
  handler: async (ctx, { id, patch }) => {
    await ctx.db.patch(id, patch);
    return id;
  }
});

export const deleteInternal = internalMutation({
  args: { id: v.id('aigentsConfigs') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  }
});

export const getWithTokenInternal = internalQuery({
  args: { id: v.id('aigentsConfigs') },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  }
});
