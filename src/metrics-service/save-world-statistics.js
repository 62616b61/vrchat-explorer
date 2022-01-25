import { TimestreamWriteClient, WriteRecordsCommand } from "@aws-sdk/client-timestream-write";
import { parse } from "../lib/connections/sqs";

const { METRICS_DATABASE, METRICS_TABLE } = process.env;
const client = new TimestreamWriteClient();

function record(dimensions, name, value, timestamp) {
  return {
    Dimensions: dimensions,
    MeasureName: name,
    MeasureValue: String(value),
    MeasureValueType: 'BIGINT',
    Time: timestamp,
  };
}

async function processMessage(world) {
  const timestamp = world.timestamp;

  const dimensions = [
    {
      Name: 'id',
      Value: world.id
    },
    {
      Name: 'authorId',
      Value: world.authorId
    },
  ];

  const records = [
    record(dimensions, 'visits', world.visits, timestamp),
    record(dimensions, 'favorites', world.favorites, timestamp),
    record(dimensions, 'popularity', world.popularity, timestamp),
    record(dimensions, 'heat', world.heat, timestamp),
    record(dimensions, 'publicOccupants', world.publicOccupants, timestamp),
    record(dimensions, 'privateOccupants', world.privateOccupants, timestamp),
    record(dimensions, 'occupants', world.occupants, timestamp),
  ];

  const params = {
    DatabaseName: METRICS_DATABASE,
    TableName: METRICS_TABLE,
    Records: records,
  };

  const command = new WriteRecordsCommand(params);
  return client.send(command);
}

export async function handler(event) {
  const messages = parse(event);

  for (const message of messages) {
    await processMessage(message);
  }

  return { statusCode: 200 };
}
