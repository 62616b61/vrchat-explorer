export function serialize(world, worldDelta) {
  return {
    id: world.id,
    name: world.name,
    authorId: world.authorId,
    authorName: world.authorName,
    version: world.version,
    capacity: world.capacity,
    imageUrl: world.imageUrl,
    releaseStatus: world.releaseStatus,
    tags: world.tags,
    updated_at: world.updated_at,
    publicationDate: world.publicationDate,

    delta: worldDelta,
  };
}
