import { xor, difference, isEqual, intersectionWith } from 'lodash';
import { table, Author, Tag, World, WorldHistory } from '../connections/dynamodb/Worlds';
//import { publishWorldVersion } from '../publish/publish-world-version';
import { publishWorldStatistics } from '../publish/publish-world-statistics';
import { WorldCommonFields } from '../serializers/WorldCommonFields';
import { calculateWorldHash } from './calculate-world-hash'
import { detectPlatforms } from './detect-platforms';

export async function processSavedWorld(world, savedWorld) {
  const versionHasChanged = !isEqual(world.version, savedWorld.version);
  //const previewHasChanged = !isEqual(world.imageUrl, savedWorld.imageUrl);

  if (versionHasChanged) {
    console.log(`World ${world.id} - version changed from ${savedWorld.version} to ${world.version}`)

    const commonFields = WorldCommonFields(world);
    const worldHash = calculateWorldHash(world);

    //let batch = {};

    await World.update(
      {
        worldId: world.id,
        updatedAt: world.updated_at,
        version: world.version,
        ...(world.authorName !== savedWorld.authorName && { authorName: world.authorName }),
        ...(world.imageUrl !== savedWorld.imageUrl && { imageUrl: world.imageUrl }),
        ...(world.thumbnailImageUrl !== savedWorld.thumbnailImageUrl && { thumbnailImageUrl: world.thumbnailImageUrl }),

        ...(world.name !== savedWorld.name && { name: world.name }),
        ...(world.favorites !== savedWorld.favorites && { favorites: world.favorites }),
        ...(xor(world.tags, savedWorld.tags).length > 0 && { tags: world.tags }),

        ...(world.description !== savedWorld.description && { description: world.description }),
        ...(world.releaseStatus !== savedWorld.releaseStatus && { releaseStatus: world.releaseStatus }),
        ...(world.heat !== savedWorld.heat && { heat: world.heat }),
        ...(world.popularity !== savedWorld.popularity && { popularity: world.popularity }),
        ...(world.capacity !== savedWorld.capacity && { capacity: world.capacity }),

        platforms: detectPlatforms(world),

        publicationDate: world.publicationDate !== "none" ? world.publicationDate : null,
        labsPublicationDate: world.labsPublicationDate !== "none" ? world.labsPublicationDate : null,
      },
      //{ batch },
    );

    await WorldHistory.create(
      {
        hash: worldHash,
        description: world.description,
        releaseStatus: world.releaseStatus,
        popularity: world.popularity,
        capacity: world.capacity,
        ...commonFields,
      },
      //{ batch },
    );

    await Author.update(
      {
        worldId: world.id,
        authorId: world.authorId,
        updatedAt: world.updated_at,
        createdAt: world.created_at,
        version: world.version,
        ...(world.authorName !== savedWorld.authorName && { authorName: world.authorName }),
        ...(world.imageUrl !== savedWorld.imageUrl && { imageUrl: world.imageUrl }),
        ...(world.thumbnailImageUrl !== savedWorld.thumbnailImageUrl && { thumbnailImageUrl: world.thumbnailImageUrl }),

        ...(world.name !== savedWorld.name && { name: world.name }),
        ...(world.favorites !== savedWorld.favorites && { favorites: world.favorites }),
        ...(world.heat !== savedWorld.heat && { heat: world.heat }),
        ...(xor(world.tags, savedWorld.tags).length > 0 && { tags: world.tags }),

        platforms: detectPlatforms(world),

        publicationDate: world.publicationDate !== "none" ? world.publicationDate : null,
        labsPublicationDate: world.labsPublicationDate !== "none" ? world.labsPublicationDate : null,
      },
      //{ batch },
    );

    //const addedTags = difference(world.tags, savedWorld.tags);
    //await Promise.all(addedTags.map((tag) => Tag.create({ tag, ...commonFields }, { transaction })));

    //const removedTags = difference(savedWorld.tags, world.tags);
    //await Promise.all(removedTags.map((tag) => Tag.remove({ tag, ...commonFields }, { transaction })));

    //const unchangedTags = intersectionWith(world.tags, savedWorld.tags, isEqual);
    //await Promise.all(unchangedTags.map((tag) => Tag.update({ tag, ...commonFields }, { transaction, exists: null })));

    //try {
      //await table.batchWrite(batch);
    //} catch (error) {
      //console.log("error message", error);
      ////console.log("error code", error.code);
      ////console.log("error context", error.context);
      ////console.log("cancellation reasons", error.context.err.CancellationReasons);
      //console.log("world", world);
      //throw error;
    //}

    //await publishWorldVersion(world, previewHasChanged);
  } else {
    //console.log(`World ${world.id} - version unchanged`);
    // TODO: compare tags and other stuff that can change without version changing
  }

  return publishWorldStatistics(world);
}

