import { PolicyStatement, PolicyDocument, ServicePrincipal, Effect, Role } from "aws-cdk-lib/aws-iam";

export default function iam(scope, {
  timestreamScheduledQueryErrorReportingBucket,
  timestreamScheduledQueryResultsTopic,
  metricsDatabase,
  metricsTable,
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
    resources: [metricsTable.attrArn],
  });

  // Scheduled query stuff
  const s3PolicyStatement = new PolicyStatement({
    actions: ['s3:*'],
    resources: [timestreamScheduledQueryErrorReportingBucket.bucketArn],
  });

  const snsPolicyStatement = new PolicyStatement({
    actions: ['sns:*'],
    resources: [timestreamScheduledQueryResultsTopic.topicArn],
  });

  const timestreamPolicyStatement = new PolicyStatement({
    actions: ['timestream:*'],
    resources: [metricsDatabase.attrArn, metricsTable.attrArn],
  });

  const timestreamScheduledQueryExectionPolicyDocument = new PolicyDocument({
    statements: [s3PolicyStatement, snsPolicyStatement, timestreamPolicyStatement],
  });

  const timestreamScheduledQueryExecutionRole = new Role(scope, 'metrics-service-scheduled-query-execution-role', {
    assumedBy: new ServicePrincipal('timestream.amazonaws.com'),
    description: 'Execution role for AWS TimeStream Scheduled Queries',
    inlinePolicies: [timestreamScheduledQueryExectionPolicyDocument],
  });

  return {
    timestreamDescribeEndpointsPolicyStatement,
    timestreamWriteRecordsPolicyStatement,
    timestreamScheduledQueryExecutionRole,
  };
}
