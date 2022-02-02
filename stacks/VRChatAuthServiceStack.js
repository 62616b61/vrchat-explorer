import { ApiAuthorizationType, Api, Stack, Cron, Function, Table, TableFieldType } from "@serverless-stack/resources";
import { RemovalPolicy } from "aws-cdk-lib";

const { VRCHAT_USERNAME, VRCHAT_PASSWORD, IS_LOCAL } = process.env;

export default class VRChatAuthServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const credentialsTable = new Table(this, "vrchat-auth-service-credentials", {
      fields: {
        PK: TableFieldType.STRING,
        SK: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "PK", sortKey: "SK" },
      dynamodbTable: {
        timeToLiveAttribute: "TTL",

        // IF LOCAL TABLE
        ...( IS_LOCAL && {
          pointInTimeRecovery: false,
          removalPolicy: RemovalPolicy.DESTROY
        }),
      },
    });

    const createSessionLambda = new Function(this, "vrchat-auth-service-create-session-lambda", {
      functionName: this.node.root.logicalPrefixedName("vrchat-auth-service-create-session"),
      handler: "src/vrchat-auth-service/create-session.handler",
      permissions: [credentialsTable],
      environment: {
        CREDENTIALS_TABLE: credentialsTable.tableName,
        VRCHAT_USERNAME,
        VRCHAT_PASSWORD,
      },
    });

    const getSessionLambda = new Function(this, "vrchat-auth-service-get-session-lambda", {
      functionName: this.node.root.logicalPrefixedName("vrchat-auth-service-get-session"),
      handler: "src/vrchat-auth-service/get-session.handler",
      permissions: [credentialsTable],
      environment: {
        CREDENTIALS_TABLE: credentialsTable.tableName,
      },
    });

    const vrchatAuthApi = new Api(this, "vrchat-auth-service-api", {
      ...(!IS_LOCAL && { defaultAuthorizationType: ApiAuthorizationType.AWS_IAM }),
      accessLog: false,
      routes: {
        "GET /session": getSessionLambda,
      },
    });

    if (!IS_LOCAL) {
      // Create new session every 6 hours
      new Cron(this, "create-session-6h-trigger", {
        schedule: "rate(6 hours)",
        job: {
          function: createSessionLambda,
        },
      });
    }
    
    this.vrchatAuthApi = vrchatAuthApi;
  }
}
