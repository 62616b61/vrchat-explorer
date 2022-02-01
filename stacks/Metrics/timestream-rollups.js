import timestreamScheduledQuery from './lib/timestream-scheduled-query';

export default function timestreamRollups(scope, {
  metricsDatabase,
  metricsTable,
  timestreamScheduledQueryErrorReportingBucket,
  timestreamScheduledQueryResultsTopic,
  timestreamScheduledQueryExecutionRole,
}) {
  const { scheduledQuery: scheduledQuery_1h } = timestreamScheduledQuery(scope, {
    id: 'metrics-service-rollup-1h',
    bucket: timestreamScheduledQueryErrorReportingBucket,
    topic: timestreamScheduledQueryResultsTopic,
    role: timestreamScheduledQueryExecutionRole,
    timestreamDatabaseName: metricsDatabase.databaseName,
    timestreamTableName: metricsTable.tableName,
    rollupPeriod: '1h',
    rollupAgo: '2h',
    scheduleExpression: 'rate(10 minutes)',
  });

  const { scheduledQuery: scheduledQuery_24h } = timestreamScheduledQuery(scope, {
    id: 'metrics-service-rollup-24h',
    bucket: timestreamScheduledQueryErrorReportingBucket,
    topic: timestreamScheduledQueryResultsTopic,
    role: timestreamScheduledQueryExecutionRole,
    timestreamDatabaseName: metricsDatabase.databaseName,
    timestreamTableName: metricsTable.tableName,
    rollupPeriod: '24h',
    rollupAgo: '24h',
    scheduleExpression: 'rate(12 hours)',
  });

  scheduledQuery_1h.node.addDependency(metricsTable);
  scheduledQuery_24h.node.addDependency(metricsTable);
}
