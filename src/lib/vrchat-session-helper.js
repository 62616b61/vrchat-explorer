import * as vrchat from 'vrchat';
import axios from 'axios';
import { aws4Interceptor } from "aws4-axios";

const { VRCHAT_AUTH_API_URL } = process.env;
const VRCHAT_API_URL = "https://api.vrchat.cloud";
const AuthenticationApi = new vrchat.AuthenticationApi();

async function sessionInitialized() {
  const cookieString = await axios.defaults.jar.getCookieString(VRCHAT_API_URL);
  return cookieString.length > 0;
}

async function retrieveSession() {
  let session;

  try {
    const client = axios.create();
    const interceptor = aws4Interceptor({
      region: "us-east-1",
      service: "execute-api",
    });

    client.interceptors.request.use(interceptor);

    const response = await client.get(`${VRCHAT_AUTH_API_URL}/session`);

    session = response.data;
  } catch (error) {
    console.error(error);
    console.error(error.response.data);
  }

  if (!session) {
    throw new Error('Received empty session from vrchat-auth-service.');
  }

  console.log(`RETRIEVED VRCHAT SESSION (username, SK): (${session.username}, ${session.SK})`);

  return session;
}

function prepareCookies(session) {
  const authCookie = `auth=${session.auth}; Path=/; HttpOnly`
  const apiKeyCookie = `apiKey=${session.apiKey}; Path=/`

  axios.defaults.jar.setCookieSync(authCookie, VRCHAT_API_URL);
  axios.defaults.jar.setCookieSync(apiKeyCookie, VRCHAT_API_URL);
  axios.defaults.headers.common = { "Authorization": session.bearer };
}

async function authenticateWithVRChat(session) {
  try {
    const { data: user } = await AuthenticationApi.getCurrentUser();
    return user;
  } catch (error) {
    const { message, status_code } = error.response.data.error;

    const locationCheckError = "It looks like you're logging in from somewhere new! Check your email for a message from VRChat.";
    if (status_code === 401 && message.startsWith(locationCheckError)) {
      throw new Error(`Email confirmation required for username ${session.username}!`);
    }

    if (status_code === 401) {
      console.log("ERROR", error.response.data);
      // TODO: send session delete request
    }
  }
}

export async function initializeVRChatSession () {
  if (!VRCHAT_AUTH_API_URL) {
    throw new Error('You forgot to provide VRCHAT_AUTH_API_URL env var to this lambda!');
  }

  if (await sessionInitialized()) return;

  const session = await retrieveSession();

  prepareCookies(session);

  await authenticateWithVRChat(session);

  delete axios.defaults.headers.common.Authorization;
}
