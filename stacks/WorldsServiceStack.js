import { Stack, Cron, Function, Table, TableFieldType, Topic, Queue } from "@serverless-stack/resources";
import { RuleTargetInput } from "aws-cdk-lib/aws-events";
import { RemovalPolicy } from "aws-cdk-lib";
import { SubscriptionFilter } from "aws-cdk-lib/aws-sns";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { StreamViewType } from "aws-cdk-lib/aws-dynamodb";
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
      // Enable DynamoDB stream
      stream: StreamViewType.KEYS_ONLY,
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
        FETCH_BATCH_SIZE: "100",
        PUBLISH_BATCH_SIZE: "25",
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

    // Process Worlds table DynamoDB stream
    // Count total worlds and total worlds count by author
    const processWorldsTableStream = new Function(this, "worlds-service-process-worlds-table-stream-lambda", {
      functionName: this.node.root.logicalPrefixedName("worlds-service-process-worlds-table-stream"),
      handler: "src/worlds-service/process-worlds-table-stream.handler",
      permissions: [worldsTable],
      environment: {
        WORLDS_TABLE: worldsTable.tableName,
      },
      timeout: 30,
    });

    worldsTable.addConsumers(this, {
      consumer1: {
        function: processWorldsTableStream,
        consumerProps: {
          batchSize: 100,
          retryAttempts: 5,
          maxBatchingWindow: Duration.seconds(30),
          startingPosition: StartingPosition.LATEST,
        },
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
      // Discover HOT worlds every day at 12:00 UTC
      new Cron(this, "discover-worlds-hot-24h-trigger", {
        schedule: "cron(0 12 * * ? *)",
        job: {
          function: discoverWorldsLambda,
          jobProps: {
            event: RuleTargetInput.fromObject({
              featured: 'false',
              sort: 'heat',
              order: 'descending',
              tag: 'system_approved',
              releaseStatus: 'public',
              maxUnityVersion: '2019.4.31f1',
            }),
          },
        },
      });

      // Discover RANDOM worlds every day at 13:00 UTC
      new Cron(this, "discover-worlds-random-24h-trigger", {
        schedule: "cron(0 13 * * ? *)",
        job: {
          function: discoverWorldsLambda,
          jobProps: {
            event: RuleTargetInput.fromObject({
              featured: 'false',
              sort: 'shuffle',
              order: 'descending',
              tag: 'system_approved',
              releaseStatus: 'public',
              maxUnityVersion: '2019.4.31f1',
            }),
          },
        },
      });
    }
    
    this.worldTopic = worldTopic;
  }
}
