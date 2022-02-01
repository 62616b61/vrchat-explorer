import { Bucket } from "@serverless-stack/resources";
import { BucketAccessControl } from "aws-cdk-lib/aws-s3";

export default function s3(scope) {
  const timestreamScheduledQueryErrorReportingBucket = new Bucket(scope, "metrics-service-timestream-scheduled-query-error-reporting", {
    s3Bucket: {
      accessControl: BucketAccessControl.PRIVATE,
    },
  });

  return { timestreamScheduledQueryErrorReportingBucket };
}
