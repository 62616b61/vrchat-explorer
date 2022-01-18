import vrchat from 'vrchat';
import axios from 'axios';

const { VRCHAT_AUTH_API_URL } = process.env;

const VRCHAT_API_URL = "https://api.vrchat.cloud";

export async function initializeVRChatSession () {
  if (!VRCHAT_AUTH_API_URL) {
    throw new Error('You forgot to provide VRCHAT_AUTH_API_URL env var to this lambda!');
  }

  const cookieString = await axios.defaults.jar.getCookieString(VRCHAT_API_URL);

  // Return if session cookies are already set.
  if (cookieString.length > 0) {
    return;
  }

  try { 
    console.log("RETRIEVING SESSION FROM VRCHAT-AUTH-SERVICE")
    const { data: session } = await axios.get(`${VRCHAT_AUTH_API_URL}/session`);

    if (!session) {
      throw new Error('Received empty session from vrchat-auth-service.');
    }

    const authCookie = `auth=${session.auth}; Path=/; HttpOnly`
    const apiKeyCookie = `apiKey=${session.apiKey}; Path=/`

    axios.defaults.jar.setCookieSync(authCookie, VRCHAT_API_URL);
    axios.defaults.jar.setCookieSync(apiKeyCookie, VRCHAT_API_URL);
    axios.defaults.headers.common = { "Authorization": session.bearer };

    const AuthenticationApi = new vrchat.AuthenticationApi();
    await AuthenticationApi.getCurrentUser();

    delete axios.defaults.headers.common.Authorization;
  } catch (error) {
    console.error(error);
    if (error.isAxiosError) {
      console.error(error.response.data);
    }
  }
}
