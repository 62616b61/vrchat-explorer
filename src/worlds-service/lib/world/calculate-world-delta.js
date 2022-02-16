const { isEqual, difference, differenceBy, xor } = require('lodash');

const PROPERTIES_TO_CHECK = [
  'name',
  'description',
  'capacity',
  'tags',
  'releaseStatus',
  'imageUrl',
  'unityPackages',
  'version',
  'publicationDate',
];

function findDifference(world, savedWorld, property) {
  const current = world[property];
  const previous = savedWorld[property];

  const propertyChanged = !isEqual(current, previous);

  if (propertyChanged) {
    // special case for unityPackages
    // determine which platforms and versions have been updated
    if (property === 'unityPackages') {
      const updatedUnityPackages = differenceBy(current, previous, 'assetUrl');

      return updatedUnityPackages.map(upack => `unityPackage:${upack.platform}:${upack.unityVersion}`);
    }

    return [property];
  }

  return null;
}

export function calculateWorldDelta(world, savedWorld) {
  if (!savedWorld) return null;

  const delta = PROPERTIES_TO_CHECK.reduce((acc, property) => {
    const results = findDifference(world, savedWorld, property);

    if (results && results.length) {
      acc.push(...results);
    }

    return acc;
  }, []);

  return new Set(delta);
}
