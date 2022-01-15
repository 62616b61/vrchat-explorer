import WorldsServiceStack from "./WorldsServiceStack";
import MetricsServiceStack from "./MetricsServiceStack";
import { Tracing } from "aws-cdk-lib/aws-lambda";

export default function main(app) {
  // Set default runtime for all functions
  app.setDefaultFunctionProps({
    runtime: "nodejs14.x",
    memorySize: 128,
    tracing: Tracing.DISABLED,
  });

  const worldServiceStack = new WorldsServiceStack(app, "worlds-service");

  new MetricsServiceStack(app, "metrics-service", {
    worldTopic: worldServiceStack.worldTopic
  });

}
