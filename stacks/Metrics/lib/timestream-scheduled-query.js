import { CfnScheduledQuery } from "aws-cdk-lib/aws-timestream";

export default function timestreamScheduledQuery(scope, {
  id,
  bucket,
  topic,
  role,
  databaseName,
  sourceTableName,
  destinationTableName,
  rollupTarget,
  rollupPeriod,
  rollupAgo,
  scheduleExpression,
}) {
  const errorReportConfiguration = {
    s3Configuration: {
      bucketName: bucket.bucketName,
      objectKeyPrefix: 'errors',
      encryptionOption: 'SSE_S3',
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
      ROUND(AVG(measure_value::bigint)) AS avg,
      MAX(measure_value::bigint) AS max,
      MIN(measure_value::bigint) AS min
    FROM "${databaseName}"."${sourceTableName}"
    WHERE measure_name = '${rollupTarget}' AND time >= bin(ago(${rollupAgo}), ${rollupPeriod})
    GROUP BY id, authorId, bin(time, ${rollupPeriod})
   `;

  const scheduleConfiguration = { scheduleExpression };

  const targetConfiguration = {
    timestreamConfiguration: {
      databaseName: databaseName,
      tableName: destinationTableName,
      timeColumn: 'binned_time',

      dimensionMappings: [{
        name: 'id',
        dimensionValueType: 'VARCHAR',
      }, {
        name: 'authorId',
        dimensionValueType: 'VARCHAR',
      }],

      multiMeasureMappings: {
        targetMultiMeasureName: rollupTarget,

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
    }, {
      key: 'target',
      value: rollupTarget,
    }],
  });

  return { scheduledQuery };
}
