import { Stack, Cron, Function } from "@serverless-stack/resources";

export default class DummyServiceStack extends Stack {
  constructor(scope, service, props) {
    super(scope, service, props);

    const monitor = new Function(this, "monitor-lambda", {
      functionName: "monitor",
      handler: "src/dummy-service/monitor.handler",
    });

    const bench = new Function(this, "bench-lambda", {
      functionName: "bench",
      handler: "src/dummy-service/bench.handler",
      timeout: 900,
    });

    new Cron(this, "monitor", {
      schedule: "rate(1 minute)",
      job: {
        function: monitor,
      },
    });
  }
}
