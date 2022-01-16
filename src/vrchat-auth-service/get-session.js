import { Session } from './lib/connections/dynamodb/Credentials';

export async function handler() {
  // TODO: rethink and refactor
  // TODO: handle if there's no sessions
  const sessions = await Session.scan();

  // pick random session
  const session = sessions[Math.floor(Math.random() * sessions.length)];

  return {
    statusCode: 200,
    body: JSON.stringify(session),
  };
}
