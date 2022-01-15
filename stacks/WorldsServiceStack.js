import { Stack, Cron, Function, Table, TableFieldType, Topic } from "@serverless-stack/resources";

const { VRCHAT_USERNAME, VRCHAT_PASSWORD } = process.env;

export default class WorldsServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

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
    });

    const getWorldDataLambda = new Function(this, "worlds-service-get-world-data-lambda", {
      functionName: this.node.root.logicalPrefixedName("worlds-service-get-world-data"),
      handler: "src/worlds-service/get-world-data.handler",
      permissions: [worldTopic],
      environment: {
        WORLD_TOPIC: worldTopic.topicArn,
        VRCHAT_USERNAME,
        VRCHAT_PASSWORD,
      }
    });
    
    new Cron(this, "schedule_1m", {
      schedule: "rate(1 minute)",
      job: getWorldDataLambda
    });
    
    this.worldTopic = worldTopic;
  }
}
