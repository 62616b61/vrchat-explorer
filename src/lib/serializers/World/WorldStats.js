export function serialize(world) {
  return {
    id: world.id,
    authorId: world.authorId,
    visits: world.visits || 0,
    favorites: world.favorites || 0,
    popularity: world.popularity || 0,
    heat: world.heat || 0,
    publicOccupants: world.publicOccupants || 0,
    privateOccupants: world.privateOccupants || 0,
    occupants: world.occupants || 0,
    timestamp: world.timestamp,
  };
}
