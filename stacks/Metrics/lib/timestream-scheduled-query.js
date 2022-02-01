import { CfnScheduledQuery } from "aws-cdk-lib/aws-timestream";

export default function timestreamScheduledQuery(scope, {
  id,
  bucket,
  topic,
  role,
  timestreamDatabaseName,
  timestreamTableName,
  rollupPeriod,
  rollupAgo,
  scheduleExpression,
}) {
  const errorReportConfiguration = {
    s3Configuration: {
      bucketName: bucket.bucketName,

      // the properties below are optional
      //encryptionOption: 'encryptionOption',
      //objectKeyPrefix: 'objectKeyPrefix',
    },
  };

  const notificationConfiguration = {
    snsConfiguration: {
      topicArn: topic.topicArn,
    },
  };

  const queryString = `
    SELECT
       bin(time, ${rollupPeriod}) as binned_time,
       id,
       authorId,
       measure_name as measure,
       ROUND(AVG(measure_value::bigint)) AS avg,
       MAX(measure_value::bigint) AS max,
       MIN(measure_value::bigint) AS min
     FROM "${timestreamDatabaseName}"."${timestreamTableName}"
     WHERE time >= ago(${rollupAgo})
     GROUP BY id, authorId, measure_name, bin(time, ${rollupPeriod})
     ORDER BY id
   `;

  const scheduleConfiguration = { scheduleExpression };

  const targetConfiguration = {
    timestreamConfiguration: {
      databaseName: timestreamDatabaseName,
      tableName: timestreamTableName,
      timeColumn: 'binned_time',

      dimensionMappings: [{
        name: 'id',
        dimensionValueType: 'VARCHAR',
      }, {
        name: 'authorId',
        dimensionValueType: 'VARCHAR',
      }, {
        name: 'measure',
        dimensionValueType: 'VARCHAR',
      }],

      multiMeasureMappings: {
        multiMeasureAttributeMappings: [{
          measureValueType: 'DOUBLE',
          sourceColumn: 'avg',
        }, {
          measureValueType: 'BIGINT',
          sourceColumn: 'min',
        }, {
          measureValueType: 'BIGINT',
          sourceColumn: 'max',
        }],

        targetMultiMeasureName: `target-${rollupPeriod}`,
      },
    },
  };

  const scheduledQuery = new CfnScheduledQuery(scope, id, {
    errorReportConfiguration,
    notificationConfiguration,

    queryString: queryString.replace(/\s+/g, ' ').trim(),
    scheduleConfiguration,
    scheduledQueryExecutionRoleArn: role.roleArn,

    scheduledQueryName: id,
    targetConfiguration,

    tags: [{
      key: 'period',
      value: rollupPeriod,
    }],
  });

  return { scheduledQuery };
}
