export function serialize(world) {
   //{
    //PK: 'WORLD#wrld_03050f8f-1f5f-4c99-a02a-76c985f9fc86',
    //SK: 'LATEST',
    //GSI1PK: 'SCHEDULE#public#enabled#24h',
    //GSI1SK: 'WORLD#wrld_03050f8f-1f5f-4c99-a02a-76c985f9fc86',
    //_type: 'World'
  //};

  const worldId = world.PK.split('#')[1];

  return { id: worldId };
}
