import * as vrchat from 'vrchat';
import { initializeVRChatSession } from '../lib/vrchat-session-helper';
import { serialize } from '../lib/serializers/World/DiscoveredWorld';
import { publish } from '../lib/connections/sns';
import { chunk } from 'lodash';

const { WORLDS_TOPIC, IS_LOCAL } = process.env;

const PARAMETER_OFFSET_HARD_LIMIT = 999;
const PARAMETER_NUMBER_HARD_LIMIT = 100;

const DEFAULT_ARGUMENTS = {
  batching: {
    FETCH_LIMIT: 20,
    FETCH_BATCH_SIZE: 10,
    PUBLISH_BATCH_SIZE: 5,
  },
  filters: {
    featured: 'false',
    sort: 'heat',
    user: undefined,
    userId: undefined,
    n: 5,
    order: 'descending',
    offset: 0,
    search: undefined,
    tag: 'system_approved',
    notag: undefined,
    releaseStatus: 'public',
    maxUnityVersion: '2019.4.31f1',
    minUnityVersion: undefined,
    platform: undefined,
  },
};

const ARGUMENTS_ORDER = [
  'featured',
  'sort',
  'user',
  'userId',
  'n',
  'order',
  'offset',
  'search',
  'tag',
  'notag',
  'releaseStatus',
  'maxUnityVersion',
  'minUnityVersion',
  'platform',
];

function getSNSAttributes() {
  return {
    type: {
      DataType: "String",
      StringValue: "world-discovery",
    },
  };
}

function prepareArguments(parameters = {}, number, offset) {
  return ARGUMENTS_ORDER.map(argument => {
    if (argument === "n") {
      if (number > PARAMETER_NUMBER_HARD_LIMIT){
        console.log(`Parameter "number" exceeded the hard limit of ${PARAMETER_NUMBER_HARD_LIMIT}! Forcefully set it to ${PARAMETER_NUMBER_HARD_LIMIT}.`);
        return PARAMETER_NUMBER_HARD_LIMIT;
      }

      return number;
    }

    if (argument === "offset") {
      if (offset > PARAMETER_OFFSET_HARD_LIMIT) {
        console.log(`Parameter "offset" exceeded the hard limit of ${PARAMETER_OFFSET_HARD_LIMIT}! Forcefully set it to ${PARAMETER_OFFSET_HARD_LIMIT}.`);
        return PARAMETER_OFFSET_HARD_LIMIT;
      }

      return offset;
    }

    const defaultValue = DEFAULT_ARGUMENTS.filters[argument];
    const providedValue = parameters.filters ? parameters.filters[argument] : null;

    return providedValue || defaultValue;
  });
}

// TODO: max value for offset is 999 (when offset >= 1000, cloudflare throws error)
// TODO: max value for number is 100 (when number > 100, api throws error)
async function loadVRChatWorlds({ parameters, number = DEFAULT_ARGUMENTS.batching.FETCH_BATCH_SIZE, offset = 0, fetched = 0 } = {}) {
  const options = prepareArguments(parameters, number, offset);

  const WorldsApi = new vrchat.WorldsApi();
  const { data: worlds } = await WorldsApi.searchWorlds(...options);
  console.log("Loaded batch (size, total): ", worlds.length, worlds.length + fetched);

  // Publish results to SNS
  if (!IS_LOCAL) {
    const attributes = getSNSAttributes();
    const message = worlds.map(world => serialize(world));

    const parts = chunk(message, parameters?.batching?.PUBLISH_BATCH_SIZE || DEFAULT_ARGUMENTS.batching.PUBLISH_BATCH_SIZE);
    await Promise.all(
      parts.map(part => publish(WORLDS_TOPIC, part, attributes))
    );
  }

  if (!worlds || !worlds.length) return;
  if (worlds.length && worlds.length === 0) return;
  if (offset >= PARAMETER_OFFSET_HARD_LIMIT) return;
  if ((worlds.length + fetched) >= (parameters?.batching?.FETCH_LIMIT || DEFAULT_ARGUMENTS.batching.FETCH_LIMIT)) {
    return;
  }

  return loadVRChatWorlds({
    parameters,
    number, 
    offset: offset + number,
    fetched: fetched + worlds.length,
  });
}

export async function handler(event) {
  console.log("Incoming event: ", event);

  await initializeVRChatSession();

  try {
    await loadVRChatWorlds({ 
      parameters: event,
      number: event?.batching?.FETCH_BATCH_SIZE,
      offset: 0,
      fetched: 0,
    });
  } catch (error) {
    console.log(error);
    console.log(error.response.data);
    throw error;
  }

  return { statusCode: 200 };
}
