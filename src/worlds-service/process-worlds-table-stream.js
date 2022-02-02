import { table, AuthorMetadata, TagMetadata, WorldsMetadata, WorldHistoryMetadata } from './lib/connections/dynamodb/Worlds';
import { groupBy, isEmpty } from "lodash";

async function handleWorldEvent({ transaction, count }) {
  return WorldsMetadata.update(
    {},
    {
      exists: null,
      add: { count },
      //transaction,
    },
  );
}

async function handleWorldHistoryEvent({ PK, transaction, count }) {
  const worldId = PK.split(":")[1];

  return WorldHistoryMetadata.update(
    { worldId },
    {
      exists: null,
      add: { count },
      //transaction,
    },
  );
}

async function handleTagEvent({ PK, transaction, count }) {
  const tag = PK.split(":")[1];

  return TagMetadata.update(
    { tag },
    {
      exists: null,
      add: { count },
      //transaction,
    },
  );
}

async function handleAuthorEvent({ PK, transaction, count }) {
  const authorId = PK.split(":")[1];

  return AuthorMetadata.update(
    { authorId },
    {
      exists: null,
      add: { count },
      //transaction,
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
    return PK.startsWith("WORLD:") && SK.startsWith("LATEST");
  });

  for (const { count } of prepareRecords(worldRecords, true)) {
    await handleWorldEvent({ transaction, count });
  }

  // WORLD HISTORY RECORDS
  const worldHistoryRecords = event.Records.filter(record => {
    const { PK, SK } = extractPKandSK(record);
    return PK.startsWith("WORLD:") && SK.startsWith("HISTORY:");
  });

  for (const { PK, count } of prepareRecords(worldHistoryRecords)) {
    await handleWorldHistoryEvent({ PK, transaction, count });
  }

  // TAG RECORDS
  //const tagRecords = event.Records.filter(record => {
    //const { PK, SK } = extractPKandSK(record);
    //return PK.startsWith("TAG:") && !SK.startsWith("METADATA");
  //});

  //for (const { PK, count } of prepareRecords(tagRecords)) {
    //await handleTagEvent({ PK, transaction, count });
  //}

  // AUTHOR RECORDS
  const authorRecords = event.Records.filter(record => {
    const { PK, SK } = extractPKandSK(record);
    return PK.startsWith("AUTHOR:") && !SK.startsWith("METADATA");
  });

  for (const { PK, count } of prepareRecords(authorRecords)) {
    await handleAuthorEvent({ PK, transaction, count });
  }

  //if (!isEmpty(transaction)) {
    //try {
      //await table.transact("write", transaction);
    //} catch (error) {
      //console.log("error message", error.message);
      //console.log("error code", error.code);
      //console.log("error context", error.context);
      //console.log("cancellation reasons", error.context.err.CancellationReasons);
    //}
  //}

  return { statusCode: 200 };
}
