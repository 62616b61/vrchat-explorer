import { Stack, Function, Queue } from "@serverless-stack/resources";
import { CfnDatabase, CfnTable } from "aws-cdk-lib/aws-timestream";
import * as IAM from "aws-cdk-lib/aws-iam";
import { SubscriptionFilter } from "aws-cdk-lib/aws-sns";
import { Duration } from "aws-cdk-lib";

export default class MetricsServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const { worldTopic } = props;

    //SQS
    const worldStatisticsDLQ = new Queue(this, "metrics-service-world-statistics-queue-dlq", {
      sqsQueue: {
        retentionPeriod: Duration.seconds(1209600),
      },
    });

    const worldStatisticsQueue = new Queue(this, "metrics-service-world-statistics-queue", {
      sqsQueue: {
        visibilityTimeout: Duration.seconds(30 * 3),
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: worldStatisticsDLQ.sqsQueue
        },
      },
    });

    worldTopic.addSubscribers(this, [{
      queue: worldStatisticsQueue,
      subscriberProps: {
        filterPolicy: {
          type: SubscriptionFilter.stringFilter({
            whitelist: ["world-statistics"],
          }),
        },
      }
    }]);

    // TIMESTREAM DATABASE
    const timestreamDatabaseName = this.node.root.logicalPrefixedName("metrics-service-metrics");
    const metricsDatabase = new CfnDatabase(this, 'metrics-service-timestream-database-metrics', {
      databaseName: timestreamDatabaseName,
    });

    const timestreamTableName = "world-metrics";
    const worldMetricsTable = new CfnTable(this, 'metrics-service-timestream-table-metrics', {
      tableName: timestreamTableName,
      databaseName: timestreamDatabaseName,
      retentionProperties: {
        MemoryStoreRetentionPeriodInHours: "2",
        MagneticStoreRetentionPeriodInDays: "2",
      },
    });

    worldMetricsTable.node.addDependency(metricsDatabase);

    const timestreamDescribeEndpointsPolicyStatement = new IAM.PolicyStatement({
      actions: ["timestream:DescribeEndpoints"],
      effect: IAM.Effect.ALLOW,
      resources: ["*"],
    });

    const timestreamWriteRecordsPolicyStatement = new IAM.PolicyStatement({
      actions: ["timestream:WriteRecords"],
      effect: IAM.Effect.ALLOW,
      resources: [worldMetricsTable.attrArn],
    });

    // LAMBDA
    const saveWorldStatisticsLambda = new Function(this, "metrics-service-save-world-statistics-lambda", {
      functionName: this.node.root.logicalPrefixedName("metrics-service-save-world-statistics"),
      handler: "src/metrics-service/save-world-statistics.handler",
      permissions: [timestreamWriteRecordsPolicyStatement, timestreamDescribeEndpointsPolicyStatement],
      environment: {
        METRICS_DATABASE: timestreamDatabaseName,
        METRICS_TABLE: timestreamTableName,
      },
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
}
