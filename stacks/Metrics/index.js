import { Stack } from "@serverless-stack/resources";

import s3 from './s3';
import sns from './sns';
import sqs from './sqs';
import iam from './iam';
import timestream from './timestream';
import timestreamRollups from './timestream-rollups';
import lambda from './lambda';

const { IS_LOCAL } = process.env;

export default class MetricsServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const { worldsTopic } = props;

    // S3
    const { timestreamScheduledQueryErrorReportingBucket } = s3(this);

    // SNS
    const { timestreamScheduledQueryResultsTopic } = sns(this);

    //SQS
    const { worldStatisticsQueue } = sqs(this, { worldsTopic });

    // TIMESTREAM
    const {
      metricsDatabase,
      metricsTableRaw,
      metricsTableRollup_1h,
      metricsTableRollup_24h,
    } = timestream(this);

    // IAM
    const {
      timestreamScheduledQueryExecutionRole,
      timestreamDescribeEndpointsPolicyStatement,
      timestreamWriteRecordsPolicyStatement,
    } = iam(this, {
      timestreamScheduledQueryErrorReportingBucket,
      timestreamScheduledQueryResultsTopic,
      metricsDatabase,
      metricsTableRaw,
      metricsTableRollup_1h,
      metricsTableRollup_24h,
    });

    if (!IS_LOCAL) {
      // TIMESTREAM ROLLUPS
      timestreamRollups(this, {
        metricsDatabase,
        metricsTableRaw,
        metricsTableRollup_1h,
        metricsTableRollup_24h,
        timestreamScheduledQueryErrorReportingBucket,
        timestreamScheduledQueryResultsTopic,
        timestreamScheduledQueryExecutionRole,
      });
    }

    // LAMBDA
    lambda(this, {
      timestreamDescribeEndpointsPolicyStatement,
      timestreamWriteRecordsPolicyStatement,
      metricsDatabase,
      metricsTableRaw,
      worldStatisticsQueue,
    });
  }
}
