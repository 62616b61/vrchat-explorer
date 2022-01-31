import Dynamo from 'dynamodb-onetable/Dynamo';
import { Table } from 'dynamodb-onetable';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const { CREDENTIALS_TABLE } = process.env;
const client = new Dynamo({ client: new DynamoDBClient() });

const CredentialsTableSchema = {
  format: 'onetable:1.1.0',
  version: '0.0.1',
  indexes: {
    primary: { hash: 'PK', sort: 'SK' },
  },

  models: {
    Session: {
      PK:       { type: String, value: 'USERNAME:${username}' },
      SK:       { type: String, generate: 'ulid' },
      TTL:      { type: Number, ttl: true },
      username: { type: String, required: true },
      auth:     { type: String, required: true },
      apiKey:   { type: String, required: true },
      bearer:   { type: String, required: true },
    },
  },

  params: {
    isoDates: true,
    timestamps: true,
  },
}

export const table = new Table({
  client: client,
  name: CREDENTIALS_TABLE,
  schema: CredentialsTableSchema,
});

export const Session = table.getModel('Session');
