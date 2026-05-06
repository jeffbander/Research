import { query } from './_generated/server';
import { isAdmin } from './lib/auth';

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return {
      id: identity.subject,
      email: identity.email,
      name: identity.name,
      isAdmin: isAdmin(identity.subject)
    };
  }
});
