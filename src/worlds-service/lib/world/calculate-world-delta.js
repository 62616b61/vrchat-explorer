import { isEqual } from 'lodash';

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
    return {
      property,
      previous,
    };
  }

  return null;
}

export function calculateWorldDelta(world, savedWorld) {
  if (!savedWorld) return null;

  const delta = PROPERTIES_TO_CHECK.reduce((acc, property) => {
    const result = findDifference(world, savedWorld, property);

    if (result) {
      acc.push(result);
    }

    return acc;
  }, []);

  return delta;
}
