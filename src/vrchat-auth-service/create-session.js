import vrchat from 'vrchat';

import { Session } from './lib/connections/dynamodb/Credentials';

const { VRCHAT_USERNAME, VRCHAT_PASSWORD } = process.env;
const VRCHAT_API_URL = "https://api.vrchat.cloud";

function getTTL() {
  const today = new Date();
  const tomorrow = new Date();

  // add 1 Day
  tomorrow.setDate(today.getDate() + 1);

  // translate to unix seconds
  const millis = tomorrow.getTime();
  const seconds = Math.floor(millis / 1000);

  return seconds;
}

export async function handler() {
  const configuration = new vrchat.Configuration({
    username: VRCHAT_USERNAME,
    password: VRCHAT_PASSWORD,
  });

  const AuthenticationApi = new vrchat.AuthenticationApi(configuration);
  const response = await AuthenticationApi.getCurrentUser();

  const cookieString = await response.config.jar.getCookieString(VRCHAT_API_URL);
  const cookies = cookieString.split(';').map(x => x.trim())

  const auth = cookies.find(x => x.startsWith('auth=')).substring(5);
  const apiKey = cookies.find(x => x.startsWith('apiKey=')).substring(7);
  const bearer = response.request._header.split('\r\n').find(x => x.startsWith('Authorization')).substring(15);

  // TODO: clear local cookie jar after saving the session
  // to prevent errors when executing this function again before new coldstart
  try {
    await Session.create({
      username: VRCHAT_USERNAME,
      auth,
      apiKey,
      bearer,
      TTL: getTTL(),
    });
  } catch (error) {
    console.log("error message", error.message);
    console.log("error code", error.code);
    console.log("error context", error.context);
    throw error;
  }

  return { statusCode: 200 };
}
