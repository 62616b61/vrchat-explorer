import { CfnDatabase, CfnTable } from "aws-cdk-lib/aws-timestream";

export default function timestream(scope) {
  const metricsDatabase = new CfnDatabase(scope, 'metrics-service-timestream-database-metrics', {
    databaseName: scope.node.root.logicalPrefixedName("metrics-service-metrics"),
  });

  const metricsTableRaw = new CfnTable(scope, 'metrics-service-timestream-table-metrics', {
    tableName: "world-metrics",
    databaseName: metricsDatabase.databaseName,
    retentionProperties: {
      MemoryStoreRetentionPeriodInHours: "1",
      MagneticStoreRetentionPeriodInDays: "3",
    },
  });

  const metricsTableRollup_1h = new CfnTable(scope, 'metrics-service-timestream-table-metrics-1h', {
    tableName: "world-metrics-rollup-1h",
    databaseName: metricsDatabase.databaseName,
    retentionProperties: {
      MemoryStoreRetentionPeriodInHours: "3",
      MagneticStoreRetentionPeriodInDays: "90",
    },
  });

  const metricsTableRollup_24h = new CfnTable(scope, 'metrics-service-timestream-table-metrics-24h', {
    tableName: "world-metrics-rollup-24h",
    databaseName: metricsDatabase.databaseName,
    retentionProperties: {
      MemoryStoreRetentionPeriodInHours: "1",
      MagneticStoreRetentionPeriodInDays: "365",
    },
  });

  metricsTableRaw.node.addDependency(metricsDatabase);
  metricsTableRollup_1h.node.addDependency(metricsDatabase);
  metricsTableRollup_24h.node.addDependency(metricsDatabase);

  return {
    metricsDatabase,
    metricsTableRaw,
    metricsTableRollup_1h,
    metricsTableRollup_24h,
  };
}
