import axios from 'axios';
import { CookieJar } from 'tough-cookie'

const { VRCHAT_AUTH_API_URL } = process.env;

const VRCHAT_API_URL = 'https://api.vrchat.cloud';

export async function initializeVRChatSession (api) {
  if (!VRCHAT_AUTH_API_URL) {
    throw new Error('You forgot to provide VRCHAT_AUTH_API_URL!');
  }

  const cookieString = await api.axios.defaults.jar.getCookieString(VRCHAT_API_URL);

  // Return if session cookies are already set.
  if (cookieString.length > 0) {
    return;
  }

  try { 
    console.log("RETRIEVING SESSION FROM VRCHAT-AUTH-SERVICE")
    //const { data: session } = await axios.get(`${VRCHAT_AUTH_API_URL}/session`);

    const jar_data = {
      version: 'tough-cookie@4.0.0',
      storeType: 'MemoryCookieStore',
      rejectPublicSuffixes: true,
      cookies: [
        {
          key: 'auth',
          value: 'authcookie_f9d64bb6-c223-4b67-b9c2-f1d145a16408',
          expires: '2022-01-24T10:18:48.000Z',
          maxAge: 604800,
          domain: 'api.vrchat.cloud',
          path: '/',
          httpOnly: true,
          hostOnly: true,
          creation: '2022-01-17T10:18:49.217Z',
          lastAccessed: '2022-01-17T10:18:49.217Z'
        },
        {
          key: 'apiKey',
          value: 'JlE5Jldo5Jibnk5O5hTx6XVqsJu4WJ26',
          domain: 'api.vrchat.cloud',
          path: '/',
          hostOnly: true,
          creation: '2022-01-17T10:18:49.217Z',
          lastAccessed: '2022-01-17T10:18:49.217Z'
        }
      ]
    }
    const jar = CookieJar.deserializeSync(jar_data)

    api.axios.defaults.jar = jar

    //AuthenticationApi.axios.defaults.jar.setCookieSync(`auth=${session.auth}`, VRCHAT_API_URL);
    //AuthenticationApi.axios.defaults.jar.setCookieSync(`apiKey=${session.apiKey}`, VRCHAT_API_URL);
  } catch (error) {
    console.error(error);
  }
}
