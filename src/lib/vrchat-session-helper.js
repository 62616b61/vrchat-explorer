import axios from 'axios';
import vrchat from 'vrchat';
import { CookieJar } from 'tough-cookie'

const { VRCHAT_AUTH_API_URL } = process.env;

const VRCHAT_API_URL = 'https://api.vrchat.cloud';

export async function initializeVRChatSession () {
  if (!VRCHAT_AUTH_API_URL) {
    throw new Error('You forgot to provide VRCHAT_AUTH_API_URL!');
  }

  const AuthenticationApi = new vrchat.AuthenticationApi();
  const cookieString = await AuthenticationApi.axios.defaults.jar.getCookieString(VRCHAT_API_URL);

  // Return if session cookies are already set.
  if (cookieString.length > 0) {
    return;
  }

  try { 
    console.log("RETRIEVING SESSION FROM VRCHAT-AUTH-SERVICE")
    const { data: session } = await axios.get(`${VRCHAT_AUTH_API_URL}/session`);

    const jar_data = {
      version: 'tough-cookie@4.0.0',
      storeType: 'MemoryCookieStore',
      rejectPublicSuffixes: true,
      cookies: [
        {
          key: 'auth',
          value: session.auth,
          domain: 'api.vrchat.cloud',
          path: '/',
          hostOnly: true,
          pathIsDefault: true,
          //creation: '2022-01-16T21:53:00.646Z',
          //lastAccessed: '2022-01-16T21:53:00.646Z'
        },
        {
          key: 'apiKey',
          value: session.apiKey,
          domain: 'api.vrchat.cloud',
          path: '/',
          hostOnly: true,
          pathIsDefault: true,
          //creation: '2022-01-16T21:53:00.646Z',
          //lastAccessed: '2022-01-16T21:53:00.646Z'
        }
      ]
    }

    const jar = CookieJar.deserializeSync(jar_data)

    AuthenticationApi.axios.defaults.jar = jar

    //AuthenticationApi.axios.defaults.jar.setCookieSync(`auth=${session.auth}`, VRCHAT_API_URL);
    //AuthenticationApi.axios.defaults.jar.setCookieSync(`apiKey=${session.apiKey}`, VRCHAT_API_URL);
  } catch (error) {
    console.error(error);
  }
}
