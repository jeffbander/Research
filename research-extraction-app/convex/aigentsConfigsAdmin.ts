'use node';

import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { requireAdmin } from './lib/auth';
import { encrypt } from './lib/encryption';

const variablesShape = v.object({
  notes: v.string(),
  procedures: v.string(),
  labs: v.string()
});

export const create = action({
  args: {
    name: v.string(),
    webhook_url: v.string(),
    auth_type: v.union(v.literal('none'), v.literal('bearer'), v.literal('basic')),
    auth_token: v.optional(v.string()),
    default_chain_title: v.optional(v.string()),
    default_folder_id: v.optional(v.string()),
    description: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    variables: v.optional(variablesShape)
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    const auth_token_encrypted = args.auth_token ? encrypt(args.auth_token) : undefined;
    return await ctx.runMutation(internal.aigentsConfigs.insertInternal, {
      name: args.name,
      webhook_url: args.webhook_url,
      auth_type: args.auth_type,
      auth_token_encrypted,
      default_chain_title: args.default_chain_title,
      default_folder_id: args.default_folder_id,
      description: args.description,
      is_active: args.is_active ?? true,
      variables: args.variables ?? {
        notes: 'notes_cleansed',
        procedures: 'procedures_cleansed',
        labs: 'labs_cleansed'
      },
      created_by: userId
    });
  }
});

export const update = action({
  args: {
    id: v.id('aigentsConfigs'),
    name: v.optional(v.string()),
    webhook_url: v.optional(v.string()),
    auth_type: v.optional(v.union(v.literal('none'), v.literal('bearer'), v.literal('basic'))),
    auth_token: v.optional(v.string()),
    default_chain_title: v.optional(v.string()),
    default_folder_id: v.optional(v.string()),
    description: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    variables: v.optional(variablesShape)
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, auth_token, ...rest } = args;
    const patch: Record<string, unknown> = { ...rest };
    if (auth_token !== undefined) {
      patch.auth_token_encrypted = auth_token ? encrypt(auth_token) : undefined;
    }
    await ctx.runMutation(internal.aigentsConfigs.patchInternal, {
      id,
      patch: patch as Parameters<typeof internal.aigentsConfigs.patchInternal>[0] extends never
        ? never
        : typeof patch
    });
    return id;
  }
});

export const remove = action({
  args: { id: v.id('aigentsConfigs') },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.runMutation(internal.aigentsConfigs.deleteInternal, { id });
  }
});
