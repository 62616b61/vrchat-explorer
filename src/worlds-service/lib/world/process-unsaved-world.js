import { table, Author, Tag, World, WorldHistory } from '../connections/dynamodb/Worlds';
//import { publishWorldVersion } from '../publish/publish-world-version';
import { publishWorldStatistics } from '../publish/publish-world-statistics';
import { WorldCommonFields } from '../serializers/WorldCommonFields';

export async function processUnsavedWorld(world) {
  console.log(`World ${world.id} - saving new world`);

  const commonFields = WorldCommonFields(world);

  let batch = {};

  await World.create(
    {
      status: 'enabled',
      // TODO: determine optimal update schedule from available data
      schedule: '24h',
      description: world.description,
      releaseStatus: world.releaseStatus,
      popularity: world.popularity,
      capacity: world.capacity,
      unityPackages: world.unityPackages,
      ...commonFields,
    },
    { batch },
  );

  await WorldHistory.create(
    {
      description: world.description,
      releaseStatus: world.releaseStatus,
      popularity: world.popularity,
      capacity: world.capacity,
      unityPackages: world.unityPackages,
      ...commonFields,
    },
    //{ transaction },
  );

  await Author.create(
    { ...commonFields },
    { batch },
  );

  //await Promise.all(world.tags.map((tag) => Tag.create({ tag, ...commonFields }, { transaction })));

  try {
    await table.batchWrite(batch);
  } catch (error) {
    console.log("error message", error);
    //console.log("error code", error.code);
    //console.log("error context", error.context);
    //console.log("cancellation reasons", error.context.err.CancellationReasons);
    console.log("world", world);
    throw error;
  }

  //await publishWorldVersion(world, true);
  return publishWorldStatistics(world);
}
