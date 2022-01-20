const { WORLD_TOPIC } = process.env;

import { serialize } from '../../lib/serializers/World/WorldVersion';
import { publish } from '../../lib/connections/sns';

function getSNSAttributes() {
  return {
    type: {
      DataType: 'String',
      StringValue: 'world-version',
    }
  };
}

export function publishWorldVersion(world) {
  const attributes = getSNSAttributes();
  const message = serialize(world);

  return publish(WORLD_TOPIC, message, attributes);
}
