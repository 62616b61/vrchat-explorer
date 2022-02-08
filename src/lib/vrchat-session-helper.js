import * as vrchat from "vrchat";
import axios from "axios";
import { getSession, suspendSession } from "../lib/connections/api/vrchat-auth-api";

const VRCHAT_API_URL = "https://api.vrchat.cloud";
const AuthenticationApi = new vrchat.AuthenticationApi();

async function sessionInitialized() {
  const cookieString = await axios.defaults.jar.getCookieString(VRCHAT_API_URL);
  return cookieString.length > 0;
}

async function retrieveSession() {
  let session;

  try {
    const response = await getSession();

    session = response.data;
  } catch (error) {
    console.error(error);
    console.error(error.response.data);
  }

  if (!session) {
    throw new Error('Received empty session from vrchat-auth-service.');
  }

  console.log(`RETRIEVED VRCHAT SESSION (account, id): (${session.account}, ${session.id})`);

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

    if (status_code === 401) {
      console.log("ERROR", error.response.data);
      await suspendSession({ account: session.account, id: session.id, reason: error.message });
      throw new Error(`Error: ${message}`);
    }
  }
}

export async function initializeVRChatSession () {
  if (await sessionInitialized()) return;

  const session = await retrieveSession();

  prepareCookies(session);

  await authenticateWithVRChat(session);

  delete axios.defaults.headers.common.Authorization;
}
