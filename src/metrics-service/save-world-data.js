import { TimestreamWriteClient, WriteRecordsCommand } from "@aws-sdk/client-timestream-write";

const { TIMESTREAM_DATABASE, TIMESTREAM_TABLE } = process.env;
const client = new TimestreamWriteClient();

function record(dimensions, name, value, timestamp) {
  return {
    Dimensions: dimensions,
    MeasureName: name,
    MeasureValue: String(value),
    MeasureValueType: 'BIGINT',
    Time: timestamp
  };
}

async function writeToTimestream(world, timestamp) {
  const dimensions = [
    {
      Name: 'id',
      Value: world.id
    },
    {
      Name: 'authorId',
      Value: world.authorId
    }
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
    DatabaseName: TIMESTREAM_DATABASE,
    TableName: TIMESTREAM_TABLE,
    Records: records
  };

  const command = new WriteRecordsCommand(params);
  return client.send(command);
}

export async function handler(event) {
  try {
    const promises = event.Records.map(record => {
      const body = JSON.parse(record.body)

      const world = JSON.parse(body.Message);
      const timestamp = body.MessageAttributes.Timestamp.Value;

      return writeToTimestream(world, timestamp);
    });

    await Promise.all(promises);

    return { statusCode: 200 };
  } catch (e) {
    console.log(e);
  }
}
