/* eslint-disable */
/**
 * THIS FILE IS A STUB. Run `npx convex dev` once to replace it with the
 * real auto-generated file derived from your schema.
 */
import type { DataModelFromSchemaDefinition, DocumentByName, TableNamesInDataModel } from 'convex/server';
import type { GenericId } from 'convex/values';
import schema from '../schema';

export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
export type TableNames = TableNamesInDataModel<DataModel>;
export type Doc<TableName extends TableNames> = DocumentByName<DataModel, TableName>;
export type Id<TableName extends TableNames | string> = GenericId<TableName>;
