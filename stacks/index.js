import WorldServiceStack from "./WorldServiceStack";
import MetricsServiceStack from "./MetricsServiceStack";

export default function main(app) {
  // Set default runtime for all functions
  app.setDefaultFunctionProps({
    runtime: "nodejs14.x",
  });

  const worldServiceStack = new WorldServiceStack(app, "world-service");

  new MetricsServiceStack(app, "metrics-service", {
    worldTopic: worldServiceStack.worldTopic
  });

}
