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

    // REPROCESS WORLDS QUEUE
    const reprocessWorldsDLQ = new Queue(this, "worlds-service-reprocess-worlds-queue-dlq", {
      sqsQueue: {
        retentionPeriod: Duration.seconds(1209600),
      },
    });

    const reprocessWorldsQueue = new Queue(this, "worlds-service-reprocess-worlds-queue", {
      sqsQueue: {
        visibilityTimeout: Duration.seconds(30 * 3),
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: reprocessWorldsDLQ.sqsQueue
        },
      },
    });

    worldTopic.addSubscribers(this, [{
      queue: reprocessWorldsQueue,
      subscriberProps: {
        filterPolicy: {
          type: SubscriptionFilter.stringFilter({
            whitelist: ["world-reprocess"],
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
      reservedConcurrentExecutions: 1,
    });

    discoveredWorldsQueue.addConsumer(this, {
      function: processWorldsLambda,
      consumerProps: {
        enabled: true,
        batchSize: 1,
      },
    });

    reprocessWorldsQueue.addConsumer(this, {
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
        reservedConcurrentExecutions: 1,
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

      // Save world images and thumbnails
      const saveWorldPreviewImageLambda = new Function(this, "worlds-service-save-world-preview-image-lambda", {
        functionName: this.node.root.logicalPrefixedName("worlds-service-save-world-preview-image"),
        handler: "src/worlds-service/save-world-preview-image.handler",
        permissions: [worldImagesBucket],
        environment: {
          WORLD_IMAGES_BUCKET: worldImagesBucket.bucketName,
        },
        reservedConcurrentExecutions: 1,
      });

      saveWorldPreviewQueue.addConsumer(this, {
        function: saveWorldPreviewImageLambda,
        consumerProps: {
          enabled: true,
          batchSize: 1,
        },
      });
    }

    // Periodically trigger inspection of worlds
    const triggerWorldReprocessLambda = new Function(this, "worlds-service-trigger-world-reprocess-lambda", {
      functionName: this.node.root.logicalPrefixedName("worlds-service-trigger-world-reprocess"),
      handler: "src/worlds-service/trigger-world-reprocess.handler",
      permissions: [worldsTable, worldTopic],
      environment: {
        PUBLISH_BATCH_SIZE: "25",
        WORLDS_TABLE: worldsTable.tableName,
        WORLD_TOPIC: worldTopic.topicArn,
      },
      timeout: 600,
    });

    if (!IS_LOCAL) {
      // Trigger world reprocess with 24h schedule
      new Cron(this, "world-reprocess-24h-trigger", {
        schedule: "rate(24 hours)",
        job: {
          function: triggerWorldReprocessLambda,
          jobProps: {
            event: RuleTargetInput.fromObject({
              releaseStatus: 'public',
              status: 'enabled',
              schedule: '24h',
            }),
          },
        },
      });

      // Trigger world reprocess with 6h schedule
      new Cron(this, "world-reprocess-6h-trigger", {
        schedule: "rate(6 hours)",
        job: {
          function: triggerWorldReprocessLambda,
          jobProps: {
            event: RuleTargetInput.fromObject({
              releaseStatus: 'public',
              status: 'enabled',
              schedule: '6h',
            }),
          },
        },
      });

      // Trigger world reprocess with 1h schedule
      new Cron(this, "world-reprocess-1h-trigger", {
        schedule: "rate(1 hour)",
        job: {
          function: triggerWorldReprocessLambda,
          jobProps: {
            event: RuleTargetInput.fromObject({
              releaseStatus: 'public',
              status: 'enabled',
              schedule: '1h',
            }),
          },
        },
      });

      // Trigger world reprocess with 10m schedule
      new Cron(this, "world-reprocess-10m-trigger", {
        schedule: "rate(10 minutes)",
        job: {
          function: triggerWorldReprocessLambda,
          jobProps: {
            event: RuleTargetInput.fromObject({
              releaseStatus: 'public',
              status: 'enabled',
              schedule: '10m',
            }),
          },
        },
      });
    }
    
    this.worldTopic = worldTopic;
  }
}
