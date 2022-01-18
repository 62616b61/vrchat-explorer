import vrchat from 'vrchat';
import { initializeVRChatSession } from '../lib/vrchat-session-helper';
import { serialize } from '../lib/serializers/World/WorldStats';
import { publish } from '../lib/connections/sns';

const { WORLD_TOPIC, IS_LOCAL } = process.env;

function getSNSAttributes() {
  const currentTime = Date.now().toString();

  return {
    timestamp: {
      DataType: 'String',
      StringValue: currentTime,
    },
    type: {
      DataType: 'String',
      StringValue: 'world-statistics',
    }
  };
}

// TODO: get world id from event
export async function handler(event) {
  await initializeVRChatSession();

  try {
    const worldId = 'wrld_829c1f70-ed07-4dac-ad58-df7152655a09';

    const WorldsApi = new vrchat.WorldsApi({});
    const { data } = await WorldsApi.getWorld(worldId);

    console.log("RESPONSE", data);

    if (!IS_LOCAL) {
      const attributes = getSNSAttributes();
      const message = serialize(data);

      return publish(WORLD_TOPIC, message, attributes);
    }
  } catch (error) {

    // TODO: needs great improvements
    // TODO: handle this error:
    //{
      //error: {
        //message: `"It looks like you're logging in from somewhere new! Check your email for a message from VRChat."`,
        //status_code: 401
      //}
    //}
    if (error.isAxiosError) {
      console.error(error.response.data);
    } else {
      console.error(error);
    }
  }

  return { statusCode: 200 };
}
