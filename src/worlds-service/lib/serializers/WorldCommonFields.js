export function WorldCommonFields(world) {
  const commonFields = {
    worldId: world.id,
    authorId: world.authorId,
    authorName: world.authorName,
    imageUrl: world.imageUrl,
    thumbnailImageUrl: world.thumbnailImageUrl,

    favorites: world.favorites,
    heat: world.heat,
    tags: world.tags,
    name: world.name,

    version: world.version,
    createdAt: world.created_at,
    updatedAt: world.updated_at,
    publicationDate: world.publicationDate !== "none" ? world.publicationDate : null,
    labsPublicationDate: world.labsPublicationDate !== "none" ? world.labsPublicationDate : null,
  };

  return commonFields;
}
