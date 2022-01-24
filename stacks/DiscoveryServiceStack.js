import { Stack, Cron, Function } from "@serverless-stack/resources";
import { RuleTargetInput } from "aws-cdk-lib/aws-events";

const { IS_LOCAL } = process.env;

export default class DiscoveryServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const { vrchatAuthApi, worldTopic } = props;

    // LAMBDAS
    // Discover worlds
    const discoverWorldsLambda = new Function(this, "discovery-service-discover-worlds-lambda", {
      functionName: this.node.root.logicalPrefixedName("discovery-service-discover-worlds"),
      handler: "src/discovery-service/discover-worlds.handler",
      permissions: [vrchatAuthApi, worldTopic],
      environment: {
        VRCHAT_AUTH_API_URL: vrchatAuthApi.url,
        WORLD_TOPIC: worldTopic.topicArn,
      },
      timeout: 30,
    });

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
  }
}
