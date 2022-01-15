import { Stack, Function, Queue } from "@serverless-stack/resources";
import { CfnDatabase, CfnTable } from "aws-cdk-lib/aws-timestream";

export default class MetricsServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const { worldTopic } = props;

    const saveWorldDataLambda = new Function(this, "save-world-data-lambda", {
      functionName: this.node.root.logicalPrefixedName("metrics-service-save-world-data"),
      handler: "src/metrics-service/save-world-data.handler",
      permissions: [worldTopic]
    });

    const metricsServiceWorldQueue = new Queue(this, "metrics-service-world-queue", {
      consumer: {
        function: saveWorldDataLambda,
        timeout: 30
      },
    });

    worldTopic.addSubscribers(this, [{
      queue: metricsServiceWorldQueue,
    }]);

    const timestreamDatabaseName = this.node.root.logicalPrefixedName("metrics-service-metrics");
    const metricsDatabase = new CfnDatabase(this, 'metrics-service-timestream-database-metrics', {
      databaseName: timestreamDatabaseName,
    });

    const worldMetricsTable = new CfnTable(this, 'metrics-service-timestream-table-metrics', {
      tableName: "world-metrics",
      databaseName: timestreamDatabaseName,
    });

    worldMetricsTable.node.addDependency(metricsDatabase);
  }
}
