import { Bucket, Stack, Cron, Function, Table, TableFieldType, Topic, Queue } from "@serverless-stack/resources";
import { RuleTargetInput } from "aws-cdk-lib/aws-events";
import { RemovalPolicy } from "aws-cdk-lib";
import { SubscriptionFilter } from "aws-cdk-lib/aws-sns";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { Duration } from "aws-cdk-lib";

const { IS_LOCAL } = process.env;

export default class WorldsServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const { vrchatAuthApi } = props;

    // SNS
    const worldTopic = new Topic(this, "worlds-service-world-topic");

    // SQS
    // DISCOVERED WORLDS QUEUE
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

    // WORLD PREVIEWS QUEUE
    const saveWorldPreviewDLQ = new Queue(this, "worlds-service-save-world-preview-dlq", {
      sqsQueue: {
        retentionPeriod: Duration.seconds(1209600),
      },
    });

    const saveWorldPreviewQueue = new Queue(this, "worlds-service-save-world-preview-queue", {
      sqsQueue: {
        visibilityTimeout: Duration.seconds(30 * 3),
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: saveWorldPreviewDLQ.sqsQueue
        },
      },
    });

    worldTopic.addSubscribers(this, [{
      queue: saveWorldPreviewQueue,
      subscriberProps: {
        filterPolicy: {
          type: SubscriptionFilter.stringFilter({ whitelist: ["world-version"] }),
          previewHasChanged: SubscriptionFilter.stringFilter({ whitelist: ["true"] }),
        },
      },
    }]);

    // S3
    const worldImagesBucket = new Bucket(this, "worlds-service-world-images", {
      s3Bucket: {
        accessControl: BucketAccessControl.PUBLIC_READ,
      },
    });

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
      localIndexes: {
        LSI1: { sortKey: "SK2" },
      },
      // Enable DynamoDB stream
      //stream: StreamViewType.KEYS_ONLY,
      ...(
        IS_LOCAL
          ? { dynamodbTable: { removalPolicy: RemovalPolicy.DESTROY } }
          : { stream: StreamViewType.KEYS_ONLY }
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
      },
      timeout: 300,
    });

    // Process discovered worlds
    const processWorldsLambda = new Function(this, "worlds-service-process-lambda", {
      functionName: this.node.root.logicalPrefixedName("worlds-service-process-worlds"),
      handler: "src/worlds-service/process-worlds.handler",
      permissions: [vrchatAuthApi, worldsTable, worldTopic],
      environment: {
        VRCHAT_AUTH_API_URL: vrchatAuthApi.url,
        WORLDS_TABLE: worldsTable.tableName,
        WORLD_TOPIC: worldTopic.topicArn,
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

    if (!IS_LOCAL) {
      // Process Worlds table DynamoDB stream
      // Count total worlds and total worlds count by author
      const processWorldsTableStreamLambda = new Function(this, "worlds-service-process-worlds-table-stream-lambda", {
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
          function: processWorldsTableStreamLambda,
          consumerProps: {
            batchSize: 100,
            retryAttempts: 5,
            maxBatchingWindow: Duration.seconds(30),
            startingPosition: StartingPosition.LATEST,
          },
        },
      });
    }

    // Save world images and thumbnails
    const saveWorldPreviewImageLambda = new Function(this, "worlds-service-save-world-preview-image-lambda", {
      functionName: this.node.root.logicalPrefixedName("worlds-service-save-world-preview-image"),
      handler: "src/worlds-service/save-world-preview-image.handler",
      permissions: [worldImagesBucket],
      environment: {
        WORLD_IMAGES_BUCKET: worldImagesBucket.bucketName,
      },
    });

    saveWorldPreviewQueue.addConsumer(this, {
      function: saveWorldPreviewImageLambda,
      consumerProps: {
        enabled: true,
        batchSize: 1,
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
      // Discover NEW worlds every hour
      new Cron(this, "discover-worlds-NEW-1h-trigger", {
        schedule: "rate(1 hour)",
        job: {
          function: discoverWorldsLambda,
          jobProps: {
            event: RuleTargetInput.fromObject({
              batching: {
                FETCH_LIMIT: 100,
                FETCH_BATCH_SIZE: 100,
                PUBLISH_BATCH_SIZE: 25,
              },
              filters: {
                featured: 'false',
                sort: 'publicationDate',
                order: 'descending',
                tag: 'system_approved',
                releaseStatus: 'public',
                maxUnityVersion: '2019.4.31f1',
              },
            }),
          },
        },
      });

      // Discover RECENTLY UPDATED worlds every hour
      new Cron(this, "discover-worlds-RECENTLY-UPDATED-1h-trigger", {
        schedule: "rate(1 hour)",
        job: {
          function: discoverWorldsLambda,
          jobProps: {
            event: RuleTargetInput.fromObject({
              batching: {
                FETCH_LIMIT: 100,
                FETCH_BATCH_SIZE: 100,
                PUBLISH_BATCH_SIZE: 25,
              },
              filters: {
                featured: 'false',
                sort: 'updated',
                order: 'descending',
                tag: 'system_approved',
                releaseStatus: 'public',
                maxUnityVersion: '2019.4.31f1',
              },
            }),
          },
        },
      });

      // Discover HOT worlds every day at 12:00 UTC
      //new Cron(this, "discover-worlds-hot-24h-trigger", {
        //schedule: "cron(0 12 * * ? *)",
        //job: {
          //function: discoverWorldsLambda,
          //jobProps: {
            //event: RuleTargetInput.fromObject({
              //batching: {
                //FETCH_LIMIT: 500,
                //FETCH_BATCH_SIZE: 100,
                //PUBLISH_BATCH_SIZE: 25,
              //},
              //filters: {
                //featured: 'false',
                //sort: 'heat',
                //order: 'descending',
                //tag: 'system_approved',
                //releaseStatus: 'public',
                //maxUnityVersion: '2019.4.31f1',
              //},
            //}),
          //},
        //},
      //});

      //// Discover RANDOM worlds every day at 13:00 UTC
      //new Cron(this, "discover-worlds-random-24h-trigger", {
        //schedule: "cron(0 13 * * ? *)",
        //job: {
          //function: discoverWorldsLambda,
          //jobProps: {
            //event: RuleTargetInput.fromObject({
              //batching: {
                //FETCH_LIMIT: 1000,
                //FETCH_BATCH_SIZE: 100,
                //PUBLISH_BATCH_SIZE: 25,
              //},
              //filters: {
                //featured: 'false',
                //sort: 'shuffle',
                //order: 'descending',
                //tag: 'system_approved',
                //releaseStatus: 'public',
                //maxUnityVersion: '2019.4.31f1',
              //},
            //}),
          //},
        //},
      //});
    }
    
    this.worldTopic = worldTopic;
  }
}
