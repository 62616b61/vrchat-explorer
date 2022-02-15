import { isEqual } from 'lodash';
import { WorldHistory } from '../connections/dynamodb/Worlds';
import { publishWorldUpdate } from '../publish/publish-world-update';
import { publishWorldStatistics } from '../publish/publish-world-statistics';
import { calculateWorldHash } from './calculate-world-hash';
import { calculateWorldDelta } from './calculate-world-delta';

export async function processSavedWorld(world, savedWorld) {
  const worldHash = calculateWorldHash(world);
  const hashHasChanged = !isEqual(worldHash, savedWorld.hash);

  if (hashHasChanged) {
    const worldDelta = calculateWorldDelta(world, savedWorld);
    const discoveredAt = new Date().toISOString();

    console.log(`World ${world.id} - hash changed (delta: ${worldDelta})`);

    await WorldHistory.create(
      {
        delta: worldDelta,

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
    );

    await publishWorldUpdate(world, worldHash, worldDelta);
  }

  return publishWorldStatistics(world);
}

