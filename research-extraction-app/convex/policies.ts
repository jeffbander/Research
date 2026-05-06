import { query } from './_generated/server';
import { requireUserId } from './lib/auth';
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
