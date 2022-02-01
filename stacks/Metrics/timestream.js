import { CfnDatabase, CfnTable } from "aws-cdk-lib/aws-timestream";

export default function timestream(scope) {
  const timestreamDatabaseName = scope.node.root.logicalPrefixedName("metrics-service-metrics");
  const timestreamTableName = "world-metrics";

  const metricsDatabase = new CfnDatabase(scope, 'metrics-service-timestream-database-metrics', {
    databaseName: timestreamDatabaseName,
  });

  const metricsTable = new CfnTable(scope, 'metrics-service-timestream-table-metrics', {
    tableName: timestreamTableName,
    databaseName: timestreamDatabaseName,
    retentionProperties: {
      MemoryStoreRetentionPeriodInHours: "1",
      MagneticStoreRetentionPeriodInDays: "2",
    },
  });

  metricsTable.node.addDependency(metricsDatabase);

  return {
    metricsDatabase,
    metricsTable,
  };
}
