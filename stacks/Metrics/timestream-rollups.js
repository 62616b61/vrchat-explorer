import timestreamScheduledQuery from './lib/timestream-scheduled-query';

const MEASUREMENT_TARGETS = ['visits', 'favorites', 'popularity', 'heat', 'publicOccupants', 'privateOccupants'];

export default function timestreamRollups(scope, {
  metricsDatabase,
  metricsTableRaw,
  metricsTableRollup_1h,
  metricsTableRollup_24h,
  timestreamScheduledQueryErrorReportingBucket,
  timestreamScheduledQueryResultsTopic,
  timestreamScheduledQueryExecutionRole,
}) {
  // 1 hour rollups
  for (const target of MEASUREMENT_TARGETS) {
    const options = {
      id: `metrics-service-scheduled-query-1h-${target}`,
      bucket: timestreamScheduledQueryErrorReportingBucket,
      topic: timestreamScheduledQueryResultsTopic,
      role: timestreamScheduledQueryExecutionRole,
      databaseName: metricsDatabase.databaseName,
      sourceTableName: metricsTableRaw.tableName,
      destinationTableName: metricsTableRollup_1h.tableName,
      rollupTarget: target,
      rollupPeriod: '1h',
      rollupAgo: '1h',
      scheduleExpression: 'rate(15 minutes)',
    };

    const { scheduledQuery } = timestreamScheduledQuery(scope, options);
    scheduledQuery.node.addDependency(metricsTableRaw);
  }

  // 24 hour rollups
  for (const target of MEASUREMENT_TARGETS) {
    const options = {
      id: `metrics-service-scheduled-query-24h-${target}`,
      bucket: timestreamScheduledQueryErrorReportingBucket,
      topic: timestreamScheduledQueryResultsTopic,
      role: timestreamScheduledQueryExecutionRole,
      databaseName: metricsDatabase.databaseName,
      sourceTableName: metricsTableRaw.tableName,
      destinationTableName: metricsTableRollup_24h.tableName,
      rollupTarget: target,
      rollupPeriod: '24h',
      rollupAgo: '24h',
      scheduleExpression: 'rate(12 hours)',
    };

    const { scheduledQuery } = timestreamScheduledQuery(scope, options);
    scheduledQuery.node.addDependency(metricsTableRaw);
  }
}
