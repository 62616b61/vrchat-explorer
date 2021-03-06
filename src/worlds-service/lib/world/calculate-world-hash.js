import hash from 'object-hash';

//const PROPS_TO_HASH = [
  //'id',
  //'imageUrl',
  //'unityPackages',
//];

const PROPS_TO_HASH = [
  'id',
  'name',
  'description',
  'capacity',
  'tags',
  'releaseStatus',
  'imageUrl',
  'unityPackages',
  'previewYoutubeId',
  'publicationDate',
];

export function calculateWorldHash(world) {
  const objectToHash = PROPS_TO_HASH.reduce((acc, prop) => {
    acc[prop] = world[prop];

    return acc;
  }, {});

  return hash(objectToHash);
}
