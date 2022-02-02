import { Bucket } from "@serverless-stack/resources";
import { BlockPublicAccess, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";

const { IS_LOCAL } = process.env;

export default function s3(scope) {
  const timestreamScheduledQueryErrorReportingBucket = new Bucket(scope, "metrics-service-timestream-scheduled-query-error-reporting", {
    s3Bucket: {
      //accessControl: BucketAccessControl.PRIVATE,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,

      ...(IS_LOCAL && {
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }),
    },
  });

  return { timestreamScheduledQueryErrorReportingBucket };
}
