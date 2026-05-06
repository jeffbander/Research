/* eslint-disable */
/**
 * Generated `server` utilities.
 *
 * THIS FILE IS A STUB. Run `npx convex dev` once to replace it with the
 * real auto-generated file from your Convex deployment.
 */
import {
  actionGeneric,
  httpActionGeneric,
  queryGeneric,
  mutationGeneric,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  type GenericQueryCtx,
  type GenericMutationCtx,
  type GenericActionCtx
} from 'convex/server';
import type { DataModel } from './dataModel';

export const query = queryGeneric;
export const mutation = mutationGeneric;
export const action = actionGeneric;
export const httpAction = httpActionGeneric;
export const internalQuery = internalQueryGeneric;
export const internalMutation = internalMutationGeneric;
export const internalAction = internalActionGeneric;

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;
