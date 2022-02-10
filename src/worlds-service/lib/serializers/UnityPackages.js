export function UnityPackages(unityPackages) {
  return unityPackages.map(unityPackage => ({
     unityVersion: unityPackage.unityVersion,
     assetUrl: unityPackage.assetUrl,
     platform: unityPackage.platform,
  }));
}
