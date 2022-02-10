import { UnityPackages } from './UnityPackages';

export function ParsedWorld(world) {
  return {
    ...world,
    unityPackages: UnityPackages(world.unityPackages),
  };
}
