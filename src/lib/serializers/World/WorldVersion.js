export function serialize(world) {
  return {
    id: world.id,
    name: world.name,
    authorId: world.authorId,
    authorName: world.authorName,
    version: world.version,
    capacity: world.capacity,
    imageUrl: world.imageUrl,
    thumbnailImageUrl: world.thumbnailImageUrl,
    releaseStatus: world.releaseStatus,
    tags: world.tags,
    favorites: world.favorites,
    created_at: world.created_at,
    updated_at: world.updated_at,
    publicationDate: world.publicationDate,
    labsPublicationDate: world.labsPublicationDate,
    popularity: world.popularity,
    heat: world.heat,
  };
}
