import { uniq } from 'lodash';

export function detectPlatforms(world) {
  const { unityPackages } = world;

  const platforms = unityPackages.map(x => x.platform);

  return uniq(platforms);
}
