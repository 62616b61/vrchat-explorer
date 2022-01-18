import { Stack, Function, Queue } from "@serverless-stack/resources";
import { CfnDatabase, CfnTable } from "aws-cdk-lib/aws-timestream";
import * as IAM from "aws-cdk-lib/aws-iam";
import { SubscriptionFilter } from "aws-cdk-lib/aws-sns";

export default class MetricsServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const { worldTopic } = props;

    // TIMESTREAM DATABASE
    const timestreamDatabaseName = this.node.root.logicalPrefixedName("metrics-service-metrics");
    const metricsDatabase = new CfnDatabase(this, 'metrics-service-timestream-database-metrics', {
      databaseName: timestreamDatabaseName,
    });

    const timestreamTableName = "world-metrics";
    const worldMetricsTable = new CfnTable(this, 'metrics-service-timestream-table-metrics', {
      tableName: timestreamTableName,
      databaseName: timestreamDatabaseName,
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
    const saveWorldDataLambda = new Function(this, "metrics-service-save-world-data-lambda", {
      functionName: this.node.root.logicalPrefixedName("metrics-service-save-world-data"),
      handler: "src/metrics-service/save-world-data.handler",
      permissions: [timestreamWriteRecordsPolicyStatement, timestreamDescribeEndpointsPolicyStatement],
      environment: {
        METRICS_DATABASE: timestreamDatabaseName,
        METRICS_TABLE: timestreamTableName,
      },
    });

    // QUEUE
    const metricsServiceWorldQueue = new Queue(this, "metrics-service-world-queue", {
      consumer: {
        function: saveWorldDataLambda,
      },
    });

    worldTopic.addSubscribers(this, [{
      queue: metricsServiceWorldQueue,
      subscriberProps: {
        filterPolicy: {
          type: SubscriptionFilter.stringFilter({
            whitelist: ["world-statistics"],
          }),
        },
      }
    }]);
  }
}
