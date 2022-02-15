import * as vrchat from 'vrchat';
import sleep from 'await-sleep';
import { parse } from '../lib/connections/sqs';
import { initializeVRChatSession } from '../lib/vrchat-session-helper';
import { table } from './lib/connections/dynamodb/Worlds';
import { ParsedWorld } from './lib/serializers/ParsedWorld';
import { processSavedWorld } from './lib/world/process-saved-world';
import { processUnsavedWorld } from './lib/world/process-unsaved-world';

const WorldsApi = new vrchat.WorldsApi();

async function processMessage(message, retry = 0) {
  if (retry > 3) {
    console.log('Retried 3 times. Dropping message.');
    return;
  }

  if (retry > 0) {
    const duration = 250 * retry;

    console.log(`Sleeping for ${duration}.`);
    await sleep(duration);
  }

  console.log(`World ${message.id} - start processing`)

  const savedWorldEntities = await table.fetch(
    ['World', 'WorldHistory'],
    { PK: `WORLD#${message.id}` },
    { limit: 2, reverse: true },
  );

  const worldInfo = savedWorldEntities.World && savedWorldEntities.World[0];
  const worldHistory = savedWorldEntities.WorldHistory && savedWorldEntities.WorldHistory[0];

  try {
    const { data: discoveredWorld } = await WorldsApi.getWorld(message.id);
    const parsedWorld = ParsedWorld(discoveredWorld);

    if (worldInfo && worldInfo.status === "enabled") {
      return processSavedWorld(parsedWorld, worldHistory);
    } else {
      console.log("World status is disabled. Skipping...")
    }

    if (!worldInfo && !worldHistory) {
      return processUnsavedWorld(parsedWorld);
    }
  } catch (error) {
    if (error.isAxiosError && error.response) {
      if (error.response.status === 404) {
        // TODO: send removal request
        console.log("World not found!");
        return;
      }

      // error.response = status: 429, statusText: 'Too Many Requests',
      // error.response.data = { error: 'slow down', status_code: 429 }
      if (error.response.status === 429) {
        console.log("Too many requests");
        return processMessage(message, retry + 1);
      }

      if (error.response.status === 502) {
        console.log("Bad Gateway");
        return processMessage(message, retry + 1);
      }
    }

    if (error.isAxiosError) {
      console.log("ERROR: ", error);
      console.log("RESEPONSE: ", error?.response);
      console.log("RESPONSE DATA: ", error?.response?.data);
    } else {
      console.log("ERROR GENERIC: ", error);
    }

    throw error;
  }
}

export async function handler(event) {
  const messages = parse(event);

  if (messages.length > 0) {
    await initializeVRChatSession();
  }

  for (const message of messages) {
    await processMessage(message);
  }
  
  return { statusCode: 200 };
}
