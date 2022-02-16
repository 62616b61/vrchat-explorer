import { UnityPackages } from './UnityPackages';

export function ParsedWorld(world) {
  return {
    ...world,
    tags: new Set(world.tags),
    unityPackages: UnityPackages(world.unityPackages),
  };
}
