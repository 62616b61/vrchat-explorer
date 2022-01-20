import { table, Author, Tag, World, WorldHistory } from './connections/dynamodb/Worlds';
import { publishWorldVersion } from './publish-world-version';

export async function processUnsavedWorld(world) {
  console.log(`World ${world.id} - saving new world`);
  const commonFields = {
    worldId: world.id,
    authorId: world.authorId,
    authorName: world.authorName,
    imageUrl: world.imageUrl,
    thumbnailImageUrl: world.thumbnailImageUrl,

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

  try {
    await table.transact("write", transaction);
  } catch (error) {
    console.log("error message", error.message);
    console.log("error code", error.code);
    console.log("error context", error.context);
    console.log("cancellation reasons", error.context.err.CancellationReasons);
  }

  return publishWorldVersion(world);
}
