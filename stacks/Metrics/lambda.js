import { Function } from "@serverless-stack/resources";
import { Duration } from "aws-cdk-lib";

export default function lambda(scope, {
  timestreamDescribeEndpointsPolicyStatement,
  timestreamWriteRecordsPolicyStatement,
  metricsDatabase,
  metricsTable,
  worldStatisticsQueue,
}) {

  const saveWorldStatisticsLambda = new Function(scope, "metrics-service-save-world-statistics-lambda", {
    functionName: scope.node.root.logicalPrefixedName("metrics-service-save-world-statistics"),
    handler: "src/metrics-service/save-world-statistics.handler",
    permissions: [timestreamWriteRecordsPolicyStatement, timestreamDescribeEndpointsPolicyStatement],
    environment: {
      METRICS_DATABASE: metricsDatabase.databaseName,
      METRICS_TABLE: metricsTable.tableName,
    },
    timeout: 30,
  });

  worldStatisticsQueue.addConsumer(this, {
    function: saveWorldStatisticsLambda,
    consumerProps: {
      enabled: true,
      batchSize: 100,
      maxBatchingWindow: Duration.seconds(60),
    },
  });
}
