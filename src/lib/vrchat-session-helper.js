import axios from 'axios';
import vrchat from 'vrchat';

const { VRCHAT_AUTH_API_URL } = process.env;

export async function initializeVRChatSession () {
  if (!VRCHAT_AUTH_API_URL) {
    throw new Error('You forgot to provide VRCHAT_AUTH_API_URL!');
  }

  try { 
    const { data: session } = await axios.get(`${VRCHAT_AUTH_API_URL}/session`);

    const AuthenticationApi = new vrchat.AuthenticationApi();

    AuthenticationApi.axios.defaults.jar.setCookieSync(`auth=${session.auth}`, 'https://api.vrchat.cloud');
    AuthenticationApi.axios.defaults.jar.setCookieSync(`apiKey=${session.apiKey}`, 'https://api.vrchat.cloud');
  } catch (error) {
    console.error(error);
  }
}
