import { Session } from './lib/connections/dynamodb/Credentials';

async function suspendSession(account, id, reason) {
  const suspendedAt = Date.now().toString();

  try {
    await Session.update({
      account,
      id,
    }, {
      remove: ['TTL'],
      set: {
        suspension: { reason, suspendedAt },
      },
    });
  } catch (error) {
    console.log("error message", error.message);
    console.log("error code", error.code);
    console.log("error context", error.context);
    throw error;
  }
}

export async function handler(event) {
  const { pathParameters = {}, body = {} } = event;

  const { account, id } = pathParameters;
  const { reason } = JSON.parse(body);

  // TODO: check incoming parameters

  await suspendSession(account, id, reason);

  return { statusCode: 200 };
}
