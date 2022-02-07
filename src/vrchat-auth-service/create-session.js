import * as vrchat from "vrchat";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { Session } from "./lib/connections/dynamodb/Credentials";

const SSM_PARAMETER_PREFIX = "/vrchat/credentials/";
const VRCHAT_API_URL = "https://api.vrchat.cloud";
const client = new SSMClient();

async function getSecretCredentials(account) {
  try {
    const command = new GetParameterCommand({
      Name: SSM_PARAMETER_PREFIX + account,
      WithDecryption: true,
    });

    const response = await client.send(command);
    const credentials = response.Parameter.Value;

    return JSON.parse(credentials);
  } catch (error) {
    console.log("Error! Couldn't load account credentials parameter.")
    console.log(error);

    throw error;
  }
}

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

async function authenticateWithVRChat(username, password) {
  try {
    const configuration = new vrchat.Configuration({ username, password });

    const AuthenticationApi = new vrchat.AuthenticationApi(configuration);
    const response = await AuthenticationApi.getCurrentUser();

    const cookieString = await response.config.jar.getCookieString(VRCHAT_API_URL);
    const cookies = cookieString.split(';').map(x => x.trim())

    const auth = cookies.find(x => x.startsWith('auth=')).substring(5);
    const apiKey = cookies.find(x => x.startsWith('apiKey=')).substring(7);
    const bearer = response.request._header.split('\r\n').find(x => x.startsWith('Authorization')).substring(15);

    return { auth, apiKey, bearer };
  } catch (error) {
    // Important!
    // Do not log out the error since it might contain username and password.

    throw new Error("Failed to authenticate with vrchat: " + error.message);
  }
}

async function saveSession(account, auth, apiKey, bearer) {
  // TODO: clear local cookie jar after saving the session
  // to prevent errors when executing this function again before new coldstart
  try {
    await Session.create({
      account,
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
}

export async function handler(event = {}) {
  const { account = "account00" } = event;
  const { username, password } = await getSecretCredentials(account);

  const { auth, apiKey, bearer } = await authenticateWithVRChat(username, password);

  await saveSession(account, auth, apiKey, bearer);

  return { statusCode: 200 };
}
