const { WORLD_TOPIC } = process.env;

import { serialize } from '../../../lib/serializers/World/WorldUpdate';
import { publish } from '../../../lib/connections/sns';

function getSNSAttributes(worldDelta) {
  return {
    type: {
      DataType: 'String',
      StringValue: 'world-update',
    },
    delta: {
      DataType: 'String.Array',
      StringValue: JSON.stringify(worldDelta),
    },
  };
}

export function publishWorldUpdate(world, worldDelta) {
  const attributes = getSNSAttributes(worldDelta);
  const message = serialize(world, worldDelta);

  return publish(WORLD_TOPIC, message, attributes);
}
