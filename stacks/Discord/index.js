import { Stack, Function, Queue } from "@serverless-stack/resources";
import { SubscriptionFilter } from "aws-cdk-lib/aws-sns";
import { Duration } from "aws-cdk-lib";

const { DISCORD_BOT_TOKEN } = process.env;

export default class DiscordServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const { worldsTopic } = props;

    // SQS
    // WORLD UPDATES QUEUE
    const worldUpdatesDLQ = new Queue(this, "discord-service-world-updates-queue-dlq", {
      sqsQueue: {
        retentionPeriod: Duration.seconds(1209600),
      },
    });

    const worldUpdatesQueue = new Queue(this, "discord-service-world-updates-queue", {
      sqsQueue: {
        visibilityTimeout: Duration.seconds(30 * 3),
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: worldUpdatesDLQ.sqsQueue
        },
      },
    });

    worldsTopic.addSubscribers(this, [{
      queue: worldUpdatesQueue,
      subscriberProps: {
        filterPolicy: {
          type: SubscriptionFilter.stringFilter({
            whitelist: ["world-update"],
          }),
        },
      }
    }]);

    // LAMBDAS
    const notifyWorldUpdatesLambda = new Function(this, "discord-service-notify-world-updates-lambda", {
      functionName: this.node.root.logicalPrefixedName("discord-service-notify-world-updates"),
      handler: "src/discord-service/notify-world-updates.handler",
      environment: {
        DISCORD_BOT_TOKEN,
      },
      timeout: 30,
      reservedConcurrentExecutions: 1,
    });

    worldUpdatesQueue.addConsumer(this, {
      function: notifyWorldUpdatesLambda,
      consumerProps: {
        enabled: true,
        batchSize: 1,
      },
    });
  }
}
