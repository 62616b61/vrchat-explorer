import vrchat from 'vrchat';
import { World } from './lib/connections/dynamodb/Worlds';
import { initializeVRChatSession } from '../lib/vrchat-session-helper';
import { processSavedWorld } from './lib/process-saved-world';
import { processUnsavedWorld } from './lib/process-unsaved-world';

async function processMessage(message) {
  console.log(`World ${message.id} - start processing`)

  const savedWorld = message.version
    ? message
    : await World.get({ worldId: message.id });

  const WorldsApi = new vrchat.WorldsApi({});
  try {
    const { data: discoveredWorld } = await WorldsApi.getWorld(message.id);

    if (savedWorld && savedWorld.status === "enabled") {
      return processSavedWorld(discoveredWorld, savedWorld);
    } else {
      return processUnsavedWorld(discoveredWorld);
    }
  } catch (error) {
    if (error.isAxiosError) {
      if (error.response.status === 404) {
        // TODO: send removal request
        console.log("World not found!");
        return;
      }

      // error.response = status: 429, statusText: 'Too Many Requests',
      // error.response.data = { error: 'slow down', status_code: 429 }
      if (error.response.status === 429) {
        // TODO: send removal request
        console.log("Too many requests");
        return;
      }

      if (error.isAxiosError) {
        console.log("RESEPONSE: ", error.response);
        console.log("RESPONSE DATA: ", error.response.data);
      } else {
        console.log("ERROR GENERIC: ", error);
      }
      throw error;
    }
  }
}

export async function handler(event) {
  // TODO: catch for malformed message
  const body = JSON.parse(event.Records[0].body);
  const messages = JSON.parse(body.Message);

  if (messages.length > 0) {
    await initializeVRChatSession();
  }

  for (const message of messages) {
    await processMessage(message);
  }
  
  return { statusCode: 200 };
}
