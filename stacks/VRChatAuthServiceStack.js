import { ApiAuthorizationType, Api, Stack, Cron, Function, Table, TableFieldType, Topic } from "@serverless-stack/resources";
import { RemovalPolicy } from "aws-cdk-lib";

const { VRCHAT_USERNAME, VRCHAT_PASSWORD, IS_LOCAL } = process.env;

export default class VRChatAuthServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const credentialsTable = new Table(this, "vrchat-auth-service-credentials", {
      fields: {
        PK: TableFieldType.STRING,
        SK: TableFieldType.STRING,
        GSI1PK: TableFieldType.STRING,
        GSI1SK: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "PK", sortKey: "SK" },
      globalIndexes: {
        GSI1: { partitionKey: "GSI1PK", sortKey: "GSI1SK" },
      },
      ...(
        IS_LOCAL
          ? { dynamodbTable: { removalPolicy: RemovalPolicy.DESTROY } }
          : {}
      ),
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
      //defaultAuthorizationType: ApiAuthorizationType.AWS_IAM,
      routes: {
        "GET /session": getSessionLambda,
      },
    });

    //if (!IS_LOCAL) {
      //new Cron(this, "schedule_inspect_world_1m", {
        //schedule: "rate(1 minute)",
        //job: inspectWorldLambda
      //});
    //}
    
    this.vrchatAuthApi = vrchatAuthApi;
  }
}
