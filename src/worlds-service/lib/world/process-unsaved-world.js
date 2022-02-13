import { table, World, WorldHistory } from '../connections/dynamodb/Worlds';
import { publishWorldStatistics } from '../publish/publish-world-statistics';
import { WorldCommonFields } from '../serializers/WorldCommonFields';
import { calculateWorldHash } from './calculate-world-hash';

export async function processUnsavedWorld(world) {
  console.log(`World ${world.id} - saving new world`);

  const worldHash = calculateWorldHash(world);
  const commonFields = WorldCommonFields(world, worldHash);
  const discoveredAt = new Date().toISOString();

  let batch = {};

  await World.create(
    {
      // TODO: determine optimal update schedule from available data
      schedule: '24h',
      discoveredAt,
      ...commonFields,
    },
    { batch },
  );

  await WorldHistory.create(
    {
      discoveredAt,
      ...commonFields
    },
    { batch },
  );

  try {
    await table.batchWrite(batch);
  } catch (error) {
    console.log("error message", error);
    console.log("world", world);
    throw error;
  }

  return publishWorldStatistics(world);
}
