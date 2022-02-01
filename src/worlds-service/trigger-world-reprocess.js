import { chunk } from 'lodash';
import { World } from './lib/connections/dynamodb/Worlds';
import { serialize } from '../lib/serializers/World/WorldReprocess';
import { publish } from '../lib/connections/sns';

const { PUBLISH_BATCH_SIZE, WORLD_TOPIC, IS_LOCAL } = process.env;

const DEFAULT_ARGUMENTS = {
  parameters: {
    releaseStatus: 'public',
    status: 'enabled',
    schedule: '24h',
  },
}

function getSNSAttributes(parameters) {
  return {
    type: {
      DataType: "String",
      StringValue: "world-reprocess",
    },
    schedule: {
      DataType: "String",
      StringValue: `${parameters.releaseStatus}:${parameters.status}:${parameters.schedule}`,
    },
  };
}

async function loadWorlds({ parameters, next } = DEFAULT_ARGUMENTS) {
  const worlds = await World.find(parameters, {
    index: 'GSI1',
    limit: 100,
    next,
  });

  console.log("Loaded: ", worlds.length);

  if (!IS_LOCAL) {
    const attributes = getSNSAttributes(parameters);
    const message = worlds.map(world => serialize(world));


    const parts = chunk(message, String(PUBLISH_BATCH_SIZE));
    await Promise.all(
      parts.map(part => publish(WORLD_TOPIC, part, attributes))
    );
  }

  if (worlds.next) {
    return loadWorlds({
      parameters,
      next: worlds.next,
    });
  }
}

export async function handler(event) {
  console.log("Incoming event: ", event);

  try {
    await loadWorlds({ parameters: event });
  } catch (error) {
    console.log(error);
    console.log(error.response.data);
    throw error;
  }

  return { statusCode: 200 };
}
