import { PolicyStatement, PolicyDocument, ServicePrincipal, Effect, Role } from "aws-cdk-lib/aws-iam";

export default function iam(scope, {
  timestreamScheduledQueryErrorReportingBucket,
  timestreamScheduledQueryResultsTopic,
  metricsDatabase,
  metricsTableRaw,
  metricsTableRollup_1h,
  metricsTableRollup_24h,
}) {
  // Lambda stuff
  const timestreamDescribeEndpointsPolicyStatement = new PolicyStatement({
    actions: ["timestream:DescribeEndpoints"],
    effect: Effect.ALLOW,
    resources: ["*"],
  });

  const timestreamWriteRecordsPolicyStatement = new PolicyStatement({
    actions: ["timestream:WriteRecords"],
    effect: Effect.ALLOW,
    resources: [metricsTableRaw.attrArn],
  });

  // Scheduled query stuff
  const s3PolicyStatement = new PolicyStatement({
    actions: ["s3:*"],
    resources: [
      timestreamScheduledQueryErrorReportingBucket.bucketArn,
      `${timestreamScheduledQueryErrorReportingBucket.bucketArn}/*`
    ],
  });

  const snsPolicyStatement = new PolicyStatement({
    actions: ["sns:*"],
    resources: [timestreamScheduledQueryResultsTopic.topicArn],
  });

  const timestreamPolicyStatement = new PolicyStatement({
    actions: ["timestream:*"],
    resources: [
      metricsDatabase.attrArn,
      metricsTableRaw.attrArn,
      metricsTableRollup_1h.attrArn,
      metricsTableRollup_24h.attrArn,
    ],
  });

  const timestreamScheduledQueryExecutionPolicyDocument = new PolicyDocument({
    statements: [s3PolicyStatement, snsPolicyStatement, timestreamPolicyStatement],
  });

  const timestreamScheduledQueryExecutionRole = new Role(scope, 'metrics-service-scheduled-query-execution-role', {
    assumedBy: new ServicePrincipal('timestream.amazonaws.com'),
    description: 'Execution role for AWS TimeStream Scheduled Queries',
    inlinePolicies: [timestreamScheduledQueryExecutionPolicyDocument],
  });

  return {
    timestreamDescribeEndpointsPolicyStatement,
    timestreamWriteRecordsPolicyStatement,
    timestreamScheduledQueryExecutionRole,
  };
}
