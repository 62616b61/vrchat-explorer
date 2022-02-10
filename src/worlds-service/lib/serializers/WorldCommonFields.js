export function WorldCommonFields(world, worldHash) {
  const commonFields = {
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
    publicationDate: world.publicationDate !== "none" ? world.publicationDate : null,
    labsPublicationDate: world.labsPublicationDate !== "none" ? world.labsPublicationDate : null,
  };

  return commonFields;
}
