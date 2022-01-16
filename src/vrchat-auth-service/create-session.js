import vrchat from 'vrchat';

import { Session } from './lib/connections/dynamodb/Credentials';

const { VRCHAT_USERNAME, VRCHAT_PASSWORD } = process.env;

export async function handler() {
  const configuration = new vrchat.Configuration({
      username: VRCHAT_USERNAME,
      password: VRCHAT_PASSWORD,
  });

  const AuthenticationApi = new vrchat.AuthenticationApi(configuration);
  const response = await AuthenticationApi.getCurrentUser();

  const cookieString = await response.config.jar.getCookieString('https://api.vrchat.cloud');
  const cookies = cookieString.split(';').map(x => x.trim())
  const authString = cookies.find(x => x.startsWith('auth=')).substring(5);
  const apiKeyString = cookies.find(x => x.startsWith('apiKey=')).substring(7);

  // TODO: clear local cookie jar after saving the session
  // to prevent errors when executing this function again before new coldstart
  await Session.create({
    username: VRCHAT_USERNAME,
    auth: authString,
    apiKey: apiKeyString
  });

  return { statusCode: 200 };
}
