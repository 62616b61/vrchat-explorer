import { Stack, Cron, Function, Table, TableFieldType, Topic, Queue } from "@serverless-stack/resources";
import { RuleTargetInput } from "aws-cdk-lib/aws-events";
import { RemovalPolicy } from "aws-cdk-lib";
import { SubscriptionFilter } from "aws-cdk-lib/aws-sns";
import { Duration } from "aws-cdk-lib";

const { IS_LOCAL } = process.env;

export default class WorldsServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const { vrchatAuthApi } = props;

    // SNS
    const worldTopic = new Topic(this, "worlds-service-world-topic");

    // SQS
    const discoveredWorldsDLQ = new Queue(this, "worlds-service-discovered-worlds-queue-dlq", {
      sqsQueue: {
        retentionPeriod: Duration.seconds(1209600),
      },
    });

    const discoveredWorldsQueue = new Queue(this, "worlds-service-discovered-worlds-queue", {
      sqsQueue: {
        visibilityTimeout: Duration.seconds(30 * 3),
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: discoveredWorldsDLQ.sqsQueue
        },
      },
    });

    worldTopic.addSubscribers(this, [{
      queue: discoveredWorldsQueue,
      subscriberProps: {
        filterPolicy: {
          type: SubscriptionFilter.stringFilter({
            whitelist: ["world-discovery"],
          }),
        },
      }
    }]);

    // DYNAMO
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

    // LAMBDAS
    // Discover worlds
    const discoverWorldsLambda = new Function(this, "worlds-service-discover-worlds-lambda", {
      functionName: this.node.root.logicalPrefixedName("worlds-service-discover-worlds"),
      handler: "src/worlds-service/discover-worlds.handler",
      permissions: [vrchatAuthApi, worldTopic],
      environment: {
        VRCHAT_AUTH_API_URL: vrchatAuthApi.url,
        WORLD_TOPIC: worldTopic.topicArn,
        BATCH_SIZE: "10",
      },
      timeout: 300,
    });

    // Process discovered worlds
    const processWorldsLambda = new Function(this, "worlds-service-process-lambda", {
      functionName: this.node.root.logicalPrefixedName("worlds-service-process-worlds"),
      handler: "src/worlds-service/process-worlds.handler",
      permissions: [vrchatAuthApi, worldsTable],
      environment: {
        VRCHAT_AUTH_API_URL: vrchatAuthApi.url,
        WORLDS_TABLE: worldsTable.tableName,
      },
      timeout: 30,
    });

    discoveredWorldsQueue.addConsumer(this, {
      function: processWorldsLambda,
      consumerProps: {
        enabled: true,
        batchSize: 1,
      },
    });

    // Inspect worlds
    const inspectWorldsLambda = new Function(this, "worlds-service-inspect-lambda-lambda", {
      functionName: this.node.root.logicalPrefixedName("worlds-service-inspect-worlds"),
      handler: "src/worlds-service/inspect-worlds.handler",
      permissions: [vrchatAuthApi, worldTopic],
      environment: {
        VRCHAT_AUTH_API_URL: vrchatAuthApi.url,
        WORLD_TOPIC: worldTopic.topicArn,
      },
    });

    // Periodically trigger inspection of worlds
    //const triggerInspectWorldsLambda = new Function(this, "worlds-service-trigger-inspect-lambda", {
      //functionName: this.node.root.logicalPrefixedName("worlds-service-trigger-inspect"),
      //handler: "src/worlds-service/trigger-inspect.handler",
      //permissions: [worldsTable],
      //environment: {
        //WORLDS_TABLE: worldsTable.tableName,
      //}
    //});
    
    // LAMBDA SCHEDULED TRIGGERS
    if (!IS_LOCAL) {
      new Cron(this, "schedule_inspect_world_1m", {
        schedule: "rate(1 minute)",
        job: {
          function: inspectWorldsLambda,
        },
      });

      //new Cron(this, "trigger-discover-worlds-HOT-24h", {
        //schedule: "rate(24 hours)",
        //job: {
          //function: discoverWorldsLambda,
          //jobProps: {
            //event: RuleTargetInput.fromObject({
              //featured: 'false',
              //sort: 'heat',
              //user: undefined,
              //userId: undefined,
              //n: 5,
              //order: 'descending',
              //offset: 0,
              //search: undefined,
              //tag: 'system_approved',
              //notag: undefined,
              //releaseStatus: 'public',
              //maxUnityVersion: '2019.4.31f1',
              //minUnityVersion: undefined,
              //platform: undefined,
            //}),
          //},
        //},
      //});
    }
    
    this.worldTopic = worldTopic;
  }
}
