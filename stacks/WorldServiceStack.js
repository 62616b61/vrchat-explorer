import { Stack, Cron, Function, Topic } from "@serverless-stack/resources";

export default class WorldServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const worldTopic = new Topic(this, "world-topic");

    const getWorldDataLambda = new Function(this, "get-world-data-lambda", {
      functionName: this.node.root.logicalPrefixedName("world-service-get-world-data"),
      handler: "src/world-service/get-world-data.handler",
      permissions: [worldTopic],
      environment: {
        WORLD_TOPIC: worldTopic.topicArn,
      }
    });
    
    //new Cron(this, "schedule_1m", {
      //schedule: "rate(1 minute)",
      //job: getWorldDataLambda
    //});
    //
    
    this.worldTopic = worldTopic;
  }
}
