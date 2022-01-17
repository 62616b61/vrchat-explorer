import vrchat from 'vrchat';

import { Session } from './lib/connections/dynamodb/Credentials';

const { VRCHAT_USERNAME, VRCHAT_PASSWORD } = process.env;
const VRCHAT_API_URL = "https://api.vrchat.cloud";

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
  await Session.create({
    username: VRCHAT_USERNAME,
    auth,
    apiKey,
    bearer
  });

  return { statusCode: 200 };
}
