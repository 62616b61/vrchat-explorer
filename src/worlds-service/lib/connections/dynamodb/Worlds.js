import Dynamo from 'dynamodb-onetable/Dynamo';
import { Table } from 'dynamodb-onetable';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const { WORLDS_TABLE } = process.env;
const client = new Dynamo({ client: new DynamoDBClient() });

const commonFields = {
  hash:                { type: String, required: true },
  worldId:             { type: String, required: true },
  authorId:            { type: String, required: true },
  authorName:          { type: String, required: true },
  imageUrl:            { type: String, required: true },
  thumbnailImageUrl:   { type: String, required: true },

  favorites:           { type: Number, required: true },
  heat:                { type: Number, required: true },
  tags:                { type: Array,  required: true },
  unityPackages:       { type: Array, required: true },
  name:                { type: String, required: true },

  description:         { type: String, required: true },
  releaseStatus:       { type: String, enum: ['public', 'private', 'hidden'] },
  popularity:          { type: Number, required: true },
  capacity:            { type: Number, required: true },

  version:             { type: Number, required: true },
  createdAt:           { type: String, required: true },
  updatedAt:           { type: String, required: true },
  publicationDate:     { type: String },
  labsPublicationDate: { type: String },
};

const WorldsTableSchema = {
  format: 'onetable:1.1.0',
  version: '0.0.2',
  indexes: {
    primary: { hash: 'PK', sort: 'SK' },
    GSI1:    { hash: 'GSI1PK', sort: 'GSI1SK', project: 'keys' },
  },

  models: {
    World: {
      PK:              { type: String, value: 'WORLD#${worldId}' },
      SK:              { type: String, value: 'LATEST' },
      GSI1PK:          { type: String, value: 'SCHEDULE#${releaseStatus}#${status}#${schedule}' },
      GSI1SK:          { type: String, value: 'WORLD#${worldId}' },

      status:          { type: String, enum: ['enabled', 'disabled'], required: true, default: 'enabled' },
      schedule:        { type: String, enum: ['10m', '1h', '24h'], required: true },

      ...commonFields,
    },

    WorldHistory: {
      PK:              { type: String, value: 'WORLD#${worldId}' },
      SK:              { type: String, value: 'HISTORY#${updatedAt}#${version}#${hash}' },

      delta:           { type: Array },

      ...commonFields,
    },

    WorldsMetadata: {
      PK:              { type: String, value: 'WORLDS' },
      SK:              { type: String, value: 'METADATA' },
      count:           { type: Number, required: true },
    },

    WorldHistoryMetadata: {
      PK:              { type: String, value: 'WORLD#${worldId}' },
      SK:              { type: String, value: 'METADATA' },
      count:           { type: Number, required: true },
    },
  },

  params: {
    'isoDates': true,
    'timestamps': false,
  },
};

export const table = new Table({
  client: client,
  name: WORLDS_TABLE,
  schema: WorldsTableSchema,
});

export const World = table.getModel('World');
export const WorldHistory = table.getModel('WorldHistory');

export const WorldsMetadata = table.getModel('WorldsMetadata');
export const WorldHistoryMetadata = table.getModel('WorldHistoryMetadata');
