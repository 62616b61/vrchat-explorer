const { WORLD_TOPIC } = process.env;

import { serialize } from '../../lib/serializers/World/WorldVersion';
import { publish } from '../../lib/connections/sns';

function getSNSAttributes(previewHasChanged) {
  return {
    type: {
      DataType: 'String',
      StringValue: 'world-version',
    },
    previewHasChanged: {
      DataType: 'String',
      StringValue: String(previewHasChanged),
    },
  };
}

export function publishWorldVersion(world, previewHasChanged = true) {
  const attributes = getSNSAttributes(previewHasChanged);
  const message = serialize(world);

  return publish(WORLD_TOPIC, message, attributes);
}
