import { flatten } from "lodash";

export function parse(event) {
  if (!event.Records) {
    throw new Error("Incoming event is missing Records property!");
  }

  const messages = event.Records.map(record => {
    const body = JSON.parse(record.body);
    const messages = JSON.parse(body.Message);

    return messages;
  });

  return flatten(messages);
}
