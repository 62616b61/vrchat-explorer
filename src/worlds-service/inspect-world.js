import vrchat from 'vrchat';
import { publish } from '../lib/connections/sns';

const { VRCHAT_USERNAME, VRCHAT_PASSWORD, WORLD_TOPIC } = process.env;

function serialize(world) {
  const currentTime = Date.now().toString();

  const message = {
    id: world.id,
    authorId: world.authorId,
    visits: world.visits,
    favorites: world.favorites,
    popularity: world.popularity,
    heat: world.heat,
    publicOccupants: world.publicOccupants,
    privateOccupants: world.privateOccupants,
    occupants: world.occupants,
  };

  const attributes = {
    timestamp: {
      DataType: 'String',
      StringValue: currentTime,
    },
    type: {
      DataType: 'String',
      StringValue: 'world-statistics',
    }
  };

  return { message, attributes };
}

// TODO: get world id from event
export async function handler(event) {
  try {
    const worldId = 'wrld_829c1f70-ed07-4dac-ad58-df7152655a09';
    const configuration = new vrchat.Configuration({
        username: VRCHAT_USERNAME,
        password: VRCHAT_PASSWORD,
    });
    
    const AuthenticationApi = new vrchat.AuthenticationApi(configuration);
    await AuthenticationApi.getCurrentUser();

    const WorldsApi = new vrchat.WorldsApi(configuration);
    const response = await WorldsApi.getWorld(worldId);

    const { message, attributes } = serialize(response.data);
    return publish(WORLD_TOPIC, message, attributes);
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