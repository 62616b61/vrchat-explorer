const { WORLD_TOPIC } = process.env;

import { serialize } from '../../lib/serializers/World/WorldStats';
import { publish } from '../../lib/connections/sns';

function getSNSAttributes(timestamp) {
  return {
    timestamp: {
      DataType: 'String',
      StringValue: timestamp,
    },
    type: {
      DataType: 'String',
      StringValue: 'world-statistics',
    },
  };
}

export function publishWorldStatistics(world) {
  const timestamp = Date.now().toString();
  const attributes = getSNSAttributes(timestamp);
  const message = serialize({ ...world, timestamp });

  return publish(WORLD_TOPIC, message, attributes);
}
