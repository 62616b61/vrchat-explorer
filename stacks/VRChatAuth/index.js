import { ApiAuthorizationType, Api, Script, Stack, Cron, Function, Table, TableFieldType } from "@serverless-stack/resources";
import { RemovalPolicy } from "aws-cdk-lib";
import { RuleTargetInput } from "aws-cdk-lib/aws-events";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

const { IS_LOCAL } = process.env;

export default class VRChatAuthServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    // DYNAMO
    const credentialsTable = new Table(this, "vrchat-auth-service-credentials-table", {
      dynamodbTable: {
        tableName: this.node.root.logicalPrefixedName("vrchat-auth-service-credentials"),
        removalPolicy: IS_LOCAL ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
        pointInTimeRecovery: !IS_LOCAL,
        timeToLiveAttribute: "TTL",
      },
      fields: {
        PK: TableFieldType.STRING,
        SK: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "PK", sortKey: "SK" },
    });

    // SSM
    const accountCredentialsParameter00 = StringParameter.fromSecureStringParameterAttributes(this, "vrchat-auth-service-account-credentials-00-ssm", {
      parameterName: '/vrchat/credentials/account00',
    });

    const accountCredentialsParameter01 = StringParameter.fromSecureStringParameterAttributes(this, "vrchat-auth-service-account-credentials-01-ssm", {
      parameterName: '/vrchat/credentials/account01',
    });

    // IAM
    const secretsManagerPolicy = new PolicyStatement({
      actions: ["ssm:GetParameter"],
      effect: Effect.ALLOW,
      resources: [
        accountCredentialsParameter00.parameterArn,
        accountCredentialsParameter01.parameterArn,
      ],
    });

    // LAMBDA
    const createSessionLambda = new Function(this, "vrchat-auth-service-create-session-lambda", {
      functionName: this.node.root.logicalPrefixedName("vrchat-auth-service-create-session"),
      handler: "src/vrchat-auth-service/create-session.handler",
      permissions: [credentialsTable, secretsManagerPolicy],
      environment: {
        CREDENTIALS_TABLE: credentialsTable.tableName,
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

    const suspendSessionLambda = new Function(this, "vrchat-auth-service-suspend-session-lambda", {
      functionName: this.node.root.logicalPrefixedName("vrchat-auth-service-suspend-session"),
      handler: "src/vrchat-auth-service/suspend-session.handler",
      permissions: [credentialsTable],
      environment: {
        CREDENTIALS_TABLE: credentialsTable.tableName,
      },
    });

    const vrchatAuthApi = new Api(this, "vrchat-auth-service-api", {
      ...(!IS_LOCAL && { defaultAuthorizationType: ApiAuthorizationType.AWS_IAM }),
      accessLog: false,
      routes: {
        "GET  /session": getSessionLambda,
        "POST /session/{account}/{id}/suspend": suspendSessionLambda,
      },
    });

    // SCRIPT
    if (IS_LOCAL) {
      const createSessionLambdaScript = new Function(this, "vrchat-auth-service-create-session-lambda-script", {
        enableLiveDev: false,
        functionName: this.node.root.logicalPrefixedName("vrchat-auth-service-create-session-script"),
        handler: "src/vrchat-auth-service/create-session.handler",
        permissions: [credentialsTable, secretsManagerPolicy],
        environment: {
          CREDENTIALS_TABLE: credentialsTable.tableName,
        },
      });

      new Script(this, "vrchat-auth-service-create-session-script", {
        onCreate: createSessionLambdaScript,
        onUpdate: createSessionLambdaScript,
      });
    }

    // SCHEDULE
    if (!IS_LOCAL) {
      // Create new session every 6 hours
      new Cron(this, "create-account00-session-6h-trigger", {
        schedule: "rate(6 hours)",
        job: {
          function: createSessionLambda,
          jobProps: {
            event: RuleTargetInput.fromObject({
              account: 'account00',
            }),
          },
        },
      });

      new Cron(this, "create-account01-session-6h-trigger", {
        schedule: "rate(6 hours)",
        job: {
          function: createSessionLambda,
          jobProps: {
            event: RuleTargetInput.fromObject({
              account: 'account01',
            }),
          },
        },
      });
    }
    
    this.vrchatAuthApi = vrchatAuthApi;
  }
}
