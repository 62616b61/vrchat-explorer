import { Stack, Cron, Function, Table, TableFieldType, Topic } from "@serverless-stack/resources";
import { RemovalPolicy } from "aws-cdk-lib";

const { IS_LOCAL } = process.env;

export default class WorldsServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const { vrchatAuthApi } = props;

    const worldTopic = new Topic(this, "worlds-service-world-topic");

    const worldsTable = new Table(this, "worlds-service-worlds", {
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

    const inspectWorldLambda = new Function(this, "worlds-service-inspect-world-lambda", {
      functionName: this.node.root.logicalPrefixedName("worlds-service-inspect-world"),
      handler: "src/worlds-service/inspect-world.handler",
      permissions: [worldTopic, vrchatAuthApi],
      environment: {
        VRCHAT_AUTH_API_URL: vrchatAuthApi.url,
        WORLD_TOPIC: worldTopic.topicArn,
      }
    });

    if (!IS_LOCAL) {
      new Cron(this, "schedule_inspect_world_1m", {
        schedule: "rate(1 minute)",
        job: inspectWorldLambda
      });
    }
    
    this.worldTopic = worldTopic;
  }
}
