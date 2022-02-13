import { Queue } from "@serverless-stack/resources";
import { SubscriptionFilter } from "aws-cdk-lib/aws-sns";
import { Duration } from "aws-cdk-lib";

export default function sqs(scope, {
  worldsTopic,
}) {
  const worldStatisticsDLQ = new Queue(scope, "metrics-service-world-statistics-queue-dlq", {
    sqsQueue: {
      retentionPeriod: Duration.seconds(1209600),
    },
  });

  const worldStatisticsQueue = new Queue(scope, "metrics-service-world-statistics-queue", {
    sqsQueue: {
      visibilityTimeout: Duration.seconds(30 * 3),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: worldStatisticsDLQ.sqsQueue
      },
    },
  });

  worldsTopic.addSubscribers(scope, [{
    queue: worldStatisticsQueue,
    subscriberProps: {
      filterPolicy: {
        type: SubscriptionFilter.stringFilter({
          whitelist: ["world-statistics"],
        }),
      },
    }
  }]);

  return { worldStatisticsQueue };
}
