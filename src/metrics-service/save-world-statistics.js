import { TimestreamWriteClient, WriteRecordsCommand } from "@aws-sdk/client-timestream-write";
import { chunk, flatten } from "lodash";
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

async function processMessages(worlds) {
  const recordGroups = worlds.map(world => {
    const timestamp = world.timestamp;
    const dimensions = [
      {
        Name: 'id',
        Value: world.id,
      },
      {
        Name: 'authorId',
        Value: world.authorId,
      },
    ];

    return [
      record(dimensions, 'visits', world.visits, timestamp),
      record(dimensions, 'favorites', world.favorites, timestamp),
      record(dimensions, 'popularity', world.popularity, timestamp),
      record(dimensions, 'heat', world.heat, timestamp),
      record(dimensions, 'publicOccupants', world.publicOccupants, timestamp),
      record(dimensions, 'privateOccupants', world.privateOccupants, timestamp),
      //record(dimensions, 'occupants', world.occupants, timestamp),
    ];
  });

  const records = flatten(recordGroups);

  console.log("Records: ", records.length);

  const parts = chunk(records, 100);

  for (const part of parts) {
    const params = {
      DatabaseName: METRICS_DATABASE,
      TableName: METRICS_TABLE,
      Records: part,
    };

    const command = new WriteRecordsCommand(params);
    await client.send(command);
    
    console.log("Saved records: ", part.length);
  }
}

export async function handler(event) {
  const messages = parse(event);

  console.log("Incoming messages: ", messages.length)

  try {
    await processMessages(messages);
  } catch (error) {
    console.log(error);
    throw error;
  }

  return { statusCode: 200 };
}
