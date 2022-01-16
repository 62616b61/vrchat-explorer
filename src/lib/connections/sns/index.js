import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const client = new SNSClient();

export async function publish(topic, message, attributes) {
  const params = {
    Message: JSON.stringify(message),
    MessageAttributes: attributes,
    TopicArn: topic,
  };

  const command = new PublishCommand(params);

  return client.send(command);
}
