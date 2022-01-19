import { table, Author, Tag, World, WorldHistory } from './connections/dynamodb/Worlds';
import { xor, difference, isEqual } from 'lodash';

export async function processSavedWorld(world, savedWorld) {
  if (!isEqual(world.version, savedWorld.version)) {
    //console.log(`World ${world.id} - version changed from ${savedWorld.version} to ${world.version}`)
    const commonFields = {
      worldId: world.id,
      authorId: world.authorId,
      authorName: world.authorName,

      favorites: world.favorites,
      tags: world.tags,
      name: world.name,

      version: world.version,
      createdAt: world.created_at,
      updatedAt: world.updated_at,
      publicationDate: world.publicationDate !== "none" ? world.publicationDate : null,
      labsPublicationDate: world.labsPublicationDate !== "none" ? world.labsPublicationDate : null,
    };

    let transaction = {};

    await World.update(
      {
        worldId: world.id,
        updatedAt: world.updated_at,
        version: world.version,
        ...(world.authorName !== savedWorld.authorName && { authorName: world.authorName }),

        ...(world.name !== savedWorld.name && { name: world.name }),
        ...(world.favorites !== savedWorld.favorites && { favorites: world.favorites }),
        ...(xor(world.tags, savedWorld.tags).length > 0 && { tags: world.tags }),

        ...(world.description !== savedWorld.description && { description: world.description }),
        ...(world.releaseStatus !== savedWorld.releaseStatus && { releaseStatus: world.releaseStatus }),
        ...(world.heat !== savedWorld.heat && { heat: world.heat }),
        ...(world.popularity !== savedWorld.popularity && { popularity: world.popularity }),
        ...(world.capacity !== savedWorld.capacity && { capacity: world.capacity }),

        publicationDate: world.publicationDate !== "none" ? world.publicationDate : null,
        labsPublicationDate: world.labsPublicationDate !== "none" ? world.labsPublicationDate : null,
      },
      { transaction },
    );

    await WorldHistory.create(
      {
        description: world.description,
        releaseStatus: world.releaseStatus,
        heat: world.heat,
        popularity: world.popularity,
        capacity: world.capacity,
        ...commonFields,
      },
      { transaction },
    );

    await Author.update(
      { 
        worldId: world.id,
        authorId: world.authorId,
        updatedAt: world.updated_at,
        createdAt: world.created_at,
        version: world.version,
        ...(world.authorName !== savedWorld.authorName && { authorName: world.authorName }),

        ...(world.name !== savedWorld.name && { name: world.name }),
        ...(world.favorites !== savedWorld.favorites && { favorites: world.favorites }),
        ...(xor(world.tags, savedWorld.tags).length > 0 && { tags: world.tags }),

        publicationDate: world.publicationDate !== "none" ? world.publicationDate : null,
        labsPublicationDate: world.labsPublicationDate !== "none" ? world.labsPublicationDate : null,
      },
      { transaction },
    );

    const addedTags = difference(world.tags, savedWorld.tags);
    await Promise.all(addedTags.map((tag) => Tag.create({ tag, ...commonFields }, { transaction })));

    const removedTags = difference(savedWorld.tags, world.tags);
    await Promise.all(removedTags.map((tag) => Tag.remove({ tag, ...commonFields }, { transaction })));

    return table.transact("write", transaction);
  } else {
    //console.log(`World ${world.id} - version unchanged`);
    // TODO: compare tags and other stuff that can change without version changing
  }
}

