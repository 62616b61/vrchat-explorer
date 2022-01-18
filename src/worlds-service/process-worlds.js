import vrchat from 'vrchat';
import { table, Author, Tag, World, WorldHistory } from './lib/connections/dynamodb/Worlds';
import { initializeVRChatSession } from '../lib/vrchat-session-helper';
import { xor, difference, isEqual } from 'lodash';

async function processUnsavedWorld(world) {
  //console.log(`World ${world.id} - saving`);
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

  await World.create(
    {
      status: 'enabled',
      // TODO: determine optimal update schedule from available data
      schedule: '24h',
      description: world.description,
      releaseStatus: world.releaseStatus,
      heat: world.heat,
      popularity: world.popularity,
      capacity: world.capacity,
      ...commonFields,
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

  await Author.create(
    { ...commonFields },
    { transaction },
  );

  await Promise.all(world.tags.map((tag) => Tag.create({ tag, ...commonFields }, { transaction })));

  return table.transact("write", transaction);
}

async function processSavedWorld(world, savedWorld) {
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

async function processMessage(message) {
  console.log(`World ${message.id} - start processing`)
  const savedWorld = await World.get({ worldId: message.id });

  const WorldsApi = new vrchat.WorldsApi({});
  try {
    // error.response = status: 429, statusText: 'Too Many Requests',
    // error.response.data = { error: 'slow down', status_code: 429 }
    const { data: discoveredWorld } = await WorldsApi.getWorld(message.id);

    if (savedWorld && savedWorld.status === "enabled") {
      return processSavedWorld(discoveredWorld, savedWorld);
    } else {
      return processUnsavedWorld(discoveredWorld);
    }
  } catch (error) {
    if (error.isAxiosError) {
      console.log(error.response)
      console.log(error.response.data)
    }
  }
}

export async function handler(event) {
  // TODO: catch for malformed message
  const body = JSON.parse(event.Records[0].body);
  const messages = JSON.parse(body.Message);

  if (messages.length > 0) {
    await initializeVRChatSession();
  }

  for (const message of messages) {
    await processMessage(message);
  }
  
  return { statusCode: 200 };
}
