import { Stack, Cron, Function, Topic } from "@serverless-stack/resources";

export default class WorldServiceStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const worldTopic = new Topic(this, "world-topic", {
      snsTopic: {
        topicName: "world",
      }
    });

    const getWorldDataLambda = new Function(this, "get-world-data-lambda", {
      handler: "src/get-world-data.handler",
      permissions: [worldTopic]
    });
    
    new Cron(this, "schedule_1m", {
      schedule: "rate(1 minute)",
      job: getWorldDataLambda
    });
  }
}
