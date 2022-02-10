import { Client, Intents } from 'discord.js';
import sleep from 'await-sleep';
import { parse } from '../lib/connections/sqs';

const { DISCORD_BOT_TOKEN } = process.env;

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(DISCORD_BOT_TOKEN);

async function waitUntilClientReady() {
  while(!client.isReady()) {
    await sleep(50);
  }
}

export async function handler(event) {
  const messages = parse(event);

  if (messages.length > 0) {
    await waitUntilClientReady();

    const channel = client.channels.cache.find(channel => channel.name.includes("robocracky"));
    if (channel) {
      for (const message of messages) {
        channel.send(JSON.stringify(message, null, 2));
      }
    }
  }

  return { statusCode: 200 };
}
