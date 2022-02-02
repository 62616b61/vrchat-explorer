export function serialize(world) {
  return {
    id: world.id,
    authorId: world.authorId,
    visits: world.visits,
    favorites: world.favorites,
    popularity: world.popularity,
    heat: world.heat,
    publicOccupants: world.publicOccupants,
    privateOccupants: world.privateOccupants,
    //occupants: world.occupants,
    timestamp: world.timestamp,
  };
}
