import axios from "axios";
import { aws4Interceptor } from "aws4-axios";

const { VRCHAT_AUTH_API_URL } = process.env;

if (!VRCHAT_AUTH_API_URL) {
  throw new Error('You forgot to provide VRCHAT_AUTH_API_URL env var to this lambda!');
}

const client = axios.create();
const interceptor = aws4Interceptor({
  region: "us-east-1",
  service: "execute-api",
});

client.interceptors.request.use(interceptor);

export async function getSession() {
  const url = `${VRCHAT_AUTH_API_URL}/session`;

  return client.get(url);
}

export async function suspendSession({ account, id, reason }) {
  const url = `${VRCHAT_AUTH_API_URL}/session/${account}/${id}/suspend`;
  const data = { reason };

  return client.post(url, data);
}
