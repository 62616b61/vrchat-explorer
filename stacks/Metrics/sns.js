import { Topic } from "@serverless-stack/resources";

export default function sns(scope) {
  const timestreamScheduledQueryResultsTopic = new Topic(scope, "metrics-service-timestream-scheduled-query-results-topic", {
    snsTopic: {
      topicName: scope.node.root.logicalPrefixedName("metrics-service-timestream-scheduled-query-results"),
    },
  });

  return { timestreamScheduledQueryResultsTopic };
}
