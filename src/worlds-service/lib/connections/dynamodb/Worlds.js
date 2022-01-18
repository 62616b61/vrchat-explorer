import Dynamo from 'dynamodb-onetable/Dynamo';
import { Model, Table } from 'dynamodb-onetable';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const { WORLDS_TABLE } = process.env;
const client = new Dynamo({ client: new DynamoDBClient() });

const commonFields = {
  worldId:             { type: String, required: true },
  authorId:            { type: String, required: true },
  authorName:          { type: String, required: true },

  favorites:           { type: Number, required: true },
  tags:                { type: Array,  required: true },
  name:                { type: String, required: true },

  version:             { type: Number, required: true },
  createdAt:           { type: String, required: true },
  updatedAt:           { type: String, required: true },
  publicationDate:     { type: String },
  labsPublicationDate: { type: String },
}

const WorldsTableSchema = {
  format: 'onetable:1.1.0',
  version: '0.0.1',
  indexes: {
    primary: { hash: 'PK', sort: 'SK' },
    GSI1:    { hash: 'GSI1PK', sort: 'GSI1SK' },
  },

  models: {
    World: {
      PK:              { type: String, value: 'WORLD:${worldId}' },
      SK:              { type: String, value: 'LATEST' },
      GSI1PK:          { type: String, value: '${releaseStatus}:${status}:${schedule}' },
      GSI1SK:          { type: String, value: '${worldId}:${version}' },

      status:          { type: String, enum: ['enabled', 'disabled'], required: true, default: 'enabled' },
      schedule:        { type: String, enum: ['10m', '1h', '24h'], required: true },
      description:     { type: String, required: true },
      releaseStatus:   { type: String, enum: ['public', 'private', 'hidden'] },
      heat:            { type: Number, required: true },
      popularity:      { type: Number, required: true },
      capacity:        { type: Number, required: true },

      ...commonFields,
    },

    WorldHistory: {
      PK:              { type: String, value: 'WORLD:${worldId}' },
      SK:              { type: String, value: 'HISTORY:${updatedAt}:${version}' },
      GSI1PK:          { type: String, value: 'WORLD:${worldId}' },
      GSI1SK:          { type: String, value: 'VERSION:${version}' },

      description:     { type: String, required: true },
      releaseStatus:   { type: String, enum: ['public', 'private', 'hidden'] },
      heat:            { type: Number, required: true },
      popularity:      { type: Number, required: true },
      capacity:        { type: Number, required: true },

      ...commonFields,
    },

    Author: {
      PK:              { type: String, value: 'AUTHOR:${authorId}' },
      SK:              { type: String, value: '${createdAt}:${worldId}' },

      ...commonFields,
    },

    Tag: {
      PK:              { type: String, value: 'TAG:${tag}' },
      SK:              { type: String, value: '${createdAt}:${worldId}' },

      tag:             { type: String, required: true },

      ...commonFields,
    }
  },

  params: {
    'isoDates': true,
    'timestamps': false,
  },
}

export const table = new Table({
  client: client,
  name: WORLDS_TABLE,
  schema: WorldsTableSchema,
});

export const World = table.getModel('World');
export const WorldHistory = table.getModel('WorldHistory');
export const Author = table.getModel('Author');
export const Tag = table.getModel('Tag');