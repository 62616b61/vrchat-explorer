export function serialize(world) {
  return {
    id: world.worldId,
    name: world.name,
    authorId: world.authorId,
    authorName: world.authorName,
    version: world.version,
    status: world.status,
    capacity: world.capacity,
    imageUrl: world.imageUrl,
    thumbnailImageUrl: world.thumbnailImageUrl,
    releaseStatus: world.releaseStatus,
    tags: world.tags,
    favorites: world.favorites,
    created_at: world.createdAt,
    updated_at: world.updatedAt,
    publicationDate: world.publicationDate,
    labsPublicationDate: world.labsPublicationDate,
    popularity: world.popularity,
    heat: world.heat,
    unityPackages: world.unityPackages,
  };
}
