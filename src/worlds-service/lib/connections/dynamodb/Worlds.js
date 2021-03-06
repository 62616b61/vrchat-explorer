import Dynamo from 'dynamodb-onetable/Dynamo';
import { Table } from 'dynamodb-onetable';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const { WORLDS_TABLE } = process.env;
const client = new Dynamo({ client: new DynamoDBClient() });

const WorldsTableSchema = {
  format: 'onetable:1.1.0',
  version: '0.0.2',
  indexes: {
    primary: { hash: 'PK', sort: 'SK' },
    GSI1:    { hash: 'GSI1PK', sort: 'GSI1SK', project: 'keys' },
  },

  models: {
    World: {
      PK:                  { type: String, value: 'WORLD#${worldId}' },
      SK:                  { type: String, value: 'INFO' },
      GSI1PK:              { type: String, value: 'STATUS#${status}#${releaseStatus}' },
      GSI1SK:              { type: String, value: 'SCHEDULE#${schedule}' },

      worldId:             { type: String, required: true },
      authorId:            { type: String, required: true },
      status:              { type: String, enum: ['enabled', 'disabled'], required: true, default: 'enabled' },
      releaseStatus:       { type: String, enum: ['public', 'private', 'hidden'] },
      schedule:            { type: String, enum: ['10m', '1h', '24h'], required: true },
      discoveredAt:        { type: String, required: true },
      historyCount:        { type: Number, default: 0 },
    },

    WorldHistory: {
      PK:                  { type: String, value: 'WORLD#${worldId}' },
      SK:                  { type: String, value: 'HISTORY#${historyId}' },

      historyId:           { type: String, generate: 'ulid' },
      hash:                { type: String, required: true },
      delta:               { type: Set },

      worldId:             { type: String, required: true },
      authorId:            { type: String, required: true },
      authorName:          { type: String, required: true },
      imageUrl:            { type: String, required: true },
      thumbnailImageUrl:   { type: String, required: true },

      favorites:           { type: Number, required: true },
      heat:                { type: Number, required: true },
      tags:                { type: Set,    required: true },
      unityPackages:       { type: Array,  required: true },
      name:                { type: String, required: true },

      description:         { type: String, required: true },
      releaseStatus:       { type: String, enum: ['public', 'private', 'hidden'] },
      popularity:          { type: Number, required: true },
      capacity:            { type: Number, required: true },

      version:             { type: Number, required: true },
      createdAt:           { type: String, required: true },
      updatedAt:           { type: String, required: true },
      discoveredAt:        { type: String, required: true },
      publicationDate:     { type: String },
      labsPublicationDate: { type: String },
    },

    WorldsMetadata: {
      PK:              { type: String, value: 'WORLDS' },
      SK:              { type: String, value: 'METADATA' },
      totalCount:      { type: Number, required: true },
    },
  },

  params: {
    isoDates: true,
    timestamps: false,
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
