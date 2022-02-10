import { WorldsMetadata, WorldHistoryMetadata } from "./lib/connections/dynamodb/Worlds";
import { groupBy } from "lodash";

async function handleWorldEvent({ count }) {
  return WorldsMetadata.update(
    {},
    {
      exists: null,
      add: { count },
    },
  );
}

async function handleWorldHistoryEvent({ PK, count }) {
  const worldId = PK.split("#")[1];

  return WorldHistoryMetadata.update(
    { worldId },
    {
      exists: null,
      add: { count },
    },
  );
}

function extractPKandSK(record) {
  const PK = record.dynamodb.Keys.PK.S;
  const SK = record.dynamodb.Keys.SK.S;

  return { PK, SK };
}

function prepareRecords(records, worldRecords = false) {
  const filteredRecords = records.filter(record => record.eventName !== "MODIFY");
  const groupedRecords = groupBy(filteredRecords, record => worldRecords ? "dummy" : record.dynamodb.Keys.PK.S);

  const processedRecords = Object.values(groupedRecords).map(group => {
    const PK = group[0].dynamodb.Keys.PK.S;
    const SK = group[0].dynamodb.Keys.SK.S;
    const count = group.reduce((acc, cur) => cur.eventName === "INSERT" ? acc + 1 : acc - 1, 0);

    return { PK, SK, count };
  });

  const nonZeroRecords = processedRecords.filter(record => record.count !== 0);

  return nonZeroRecords;
}

export async function handler(event) {
  console.log("Number of received records: ", event.Records.length);
  let transaction = {};

  // WORLD RECORDS
  const worldRecords = event.Records.filter(record => {
    const { PK, SK } = extractPKandSK(record);
    return PK.startsWith("WORLD#") && SK.startsWith("LATEST");
  });

  for (const { count } of prepareRecords(worldRecords, true)) {
    await handleWorldEvent({ transaction, count });
  }

  // WORLD HISTORY RECORDS
  const worldHistoryRecords = event.Records.filter(record => {
    const { PK, SK } = extractPKandSK(record);
    return PK.startsWith("WORLD#") && SK.startsWith("HISTORY#");
  });

  for (const { PK, count } of prepareRecords(worldHistoryRecords)) {
    await handleWorldHistoryEvent({ PK, transaction, count });
  }

  return { statusCode: 200 };
}
