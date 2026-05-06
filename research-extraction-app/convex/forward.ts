'use node';

import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { requireUserId } from './lib/auth';
import { decrypt } from './lib/encryption';

export const send = action({
  args: {
    config_id: v.id('aigentsConfigs'),
    audit_id: v.optional(v.id('deidentAudits')),
    payload: v.any()
  },
  handler: async (ctx, { config_id, audit_id, payload }) => {
    await requireUserId(ctx);

    const config = await ctx.runQuery(internal.aigentsConfigs.getWithTokenInternal, { id: config_id });
    if (!config) throw new Error('Aigents config not found');
    if (!config.is_active) throw new Error('Aigents config is inactive');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.auth_token_encrypted) {
      const token = decrypt(config.auth_token_encrypted);
      if (config.auth_type === 'bearer') headers.Authorization = `Bearer ${token}`;
      else if (config.auth_type === 'basic') headers.Authorization = `Basic ${token}`;
    }

    let upstream: Response;
    try {
      upstream = await fetch(config.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (err) {
      return {
        success: false,
        status: 0,
        error: `Failed to reach Aigents: ${(err as Error).message}`
      };
    }

    const text = await upstream.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }

    const chainRunId =
      data && typeof data === 'object' && data !== null
        ? ((data as Record<string, unknown>).chain_run_id ??
           (data as Record<string, unknown>).run_id ??
           (data as Record<string, unknown>).id) as string | undefined
        : undefined;

    if (audit_id && chainRunId) {
      await ctx.runMutation(internal.audits.linkChainRunInternal, {
        id: audit_id,
        aigents_config_id: config_id,
        aigents_chain_run_id: String(chainRunId),
        aigents_chain_title: typeof payload?.chain_title === 'string' ? payload.chain_title : undefined
      });
    }

    return {
      success: upstream.ok,
      status: upstream.status,
      chain_run_id: chainRunId,
      data
    };
  }
});
