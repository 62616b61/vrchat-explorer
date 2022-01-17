import vrchat from 'vrchat';
import globalAxios from 'axios';
import { CookieJar } from 'tough-cookie'

const { VRCHAT_AUTH_API_URL } = process.env;

const VRCHAT_API_URL = 'https://api.vrchat.cloud';

export async function initializeVRChatSession () {
  if (!VRCHAT_AUTH_API_URL) {
    throw new Error('You forgot to provide VRCHAT_AUTH_API_URL!');
  }

  //const cookieString = await globalAxios.defaults.jar.getCookieString(VRCHAT_API_URL);

  // Return if session cookies are already set.
  //if (cookieString.length > 0) {
    //return;
  //}

  try { 
    console.log("RETRIEVING SESSION FROM VRCHAT-AUTH-SERVICE")
    //const { data: session } = await axios.get(`${VRCHAT_AUTH_API_URL}/session`);

    const oldJar = {
      version: 'tough-cookie@4.0.0',
      storeType: 'ks',
      rejectPublicSuffixes: true,
      cookies: [
        {
          key: 'auth',
          value: 'authcookie_c87f2e37-e1e4-4739-9534-40a91a84464d',
          expires: '2022-01-24T12:12:44.000Z',
          maxAge: 604800,
          domain: 'api.vrchat.cloud',
          path: '/',
          httpOnly: true,
          hostOnly: true,
          creation: '2022-01-17T12:12:44.949Z',
          lastAccessed: '2022-01-17T12:12:44.949Z'
        },
        {
          key: 'apiKey',
          value: 'JlE5Jldo5Jibnk5O5hTx6XVqsJu4WJ26',
          domain: 'api.vrchat.cloud',
          path: '/',
          hostOnly: true,
          creation: '2022-01-17T12:12:44.949Z',
          lastAccessed: '2022-01-17T12:12:44.949Z'
        }
      ]
    }
    const newJar = CookieJar.deserializeSync(oldJar);

    globalAxios.defaults.jar = newJar;

    const AuthenticationApi = new vrchat.AuthenticationApi({});
    const user = await AuthenticationApi.getCurrentUser();

    console.log("USER", user)

    //AuthenticationApi.axios.defaults.jar.setCookieSync(`auth=${session.auth}`, VRCHAT_API_URL);
    //AuthenticationApi.axios.defaults.jar.setCookieSync(`apiKey=${session.apiKey}`, VRCHAT_API_URL);
  } catch (error) {
    console.error(error);
    if (error.isAxiosError) {
      console.error(error.response.data);
    }
  }
}
