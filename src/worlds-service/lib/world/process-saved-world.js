import { xor, isEqual } from 'lodash';
import { World, WorldHistory } from '../connections/dynamodb/Worlds';
import { publishWorldUpdate } from '../publish/publish-world-update';
import { publishWorldStatistics } from '../publish/publish-world-statistics';
import { WorldCommonFields } from '../serializers/WorldCommonFields';
import { calculateWorldHash } from './calculate-world-hash';
import { calculateWorldDelta } from './calculate-world-delta';

export async function processSavedWorld(world, savedWorld) {
  const worldHash = calculateWorldHash(world);
  const hashHasChanged = !isEqual(worldHash, savedWorld.hash);

  if (hashHasChanged) {
    console.log(`World ${world.id} - version changed from ${savedWorld.version} to ${world.version}`)

    const worldDelta = calculateWorldDelta(world, savedWorld);
    const commonFields = WorldCommonFields(world, worldHash);

    await World.update(
      {
        hash: worldHash,
        worldId: world.id,
        updatedAt: world.updated_at,
        version: world.version,
        unityPackages: world.unityPackages,

        publicationDate: world.publicationDate !== "none" ? world.publicationDate : null,
        labsPublicationDate: world.labsPublicationDate !== "none" ? world.labsPublicationDate : null,

        ...(!isEqual(world.authorName, savedWorld.authorName) && { authorName: world.authorName }),
        ...(!isEqual(world.imageUrl, savedWorld.imageUrl) && { imageUrl: world.imageUrl }),
        ...(!isEqual(world.thumbnailImageUrl, savedWorld.thumbnailImageUrl) && { thumbnailImageUrl: world.thumbnailImageUrl }),

        ...(!isEqual(world.name, savedWorld.name) && { name: world.name }),
        ...(!isEqual(world.favorites, savedWorld.favorites) && { favorites: world.favorites }),
        ...(xor(world.tags, savedWorld.tags).length > 0 && { tags: world.tags }),

        ...(!isEqual(world.description, savedWorld.description) && { description: world.description }),
        ...(!isEqual(world.releaseStatus, savedWorld.releaseStatus) && { releaseStatus: world.releaseStatus }),
        ...(!isEqual(world.heat, savedWorld.heat) && { heat: world.heat }),
        ...(!isEqual(world.popularity, savedWorld.popularity) && { popularity: world.popularity }),
        ...(!isEqual(world.capacity, savedWorld.capacity) && { capacity: world.capacity }),
      },
    );

    await WorldHistory.create(
      {
        delta: worldDelta,
        description: world.description,
        releaseStatus: world.releaseStatus,
        popularity: world.popularity,
        capacity: world.capacity,

        ...commonFields,
      },
    );

    await publishWorldUpdate(world, worldDelta);
  }

  return publishWorldStatistics(world);
}

