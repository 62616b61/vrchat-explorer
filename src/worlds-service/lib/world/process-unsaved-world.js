import { table, World, WorldHistory } from '../connections/dynamodb/Worlds';
import { publishWorldStatistics } from '../publish/publish-world-statistics';
import { calculateWorldHash } from './calculate-world-hash';

export async function processUnsavedWorld(world) {
  console.log(`World ${world.id} - saving new world`);

  const worldHash = calculateWorldHash(world);
  const discoveredAt = new Date().toISOString();

  let batch = {};

  await World.create(
    {
      // TODO: determine optimal update schedule from available data
      schedule: '24h',
      worldId: world.id,
      discoveredAt: discoveredAt,
    },
    { batch },
  );

  await WorldHistory.create(
    {
      hash: worldHash,
      worldId: world.id,
      authorId: world.authorId,
      authorName: world.authorName,
      imageUrl: world.imageUrl,
      thumbnailImageUrl: world.thumbnailImageUrl,

      favorites: world.favorites,
      heat: world.heat,
      tags: world.tags,
      unityPackages: world.unityPackages,
      name: world.name,

      description: world.description,
      releaseStatus: world.releaseStatus,
      popularity: world.popularity,
      capacity: world.capacity,

      version: world.version,
      createdAt: world.created_at,
      updatedAt: world.updated_at,
      discoveredAt: discoveredAt,
      publicationDate: world.publicationDate !== "none" ? world.publicationDate : null,
      labsPublicationDate: world.labsPublicationDate !== "none" ? world.labsPublicationDate : null,
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
