import VRChatAuthServiceStack from "./VRChatAuthServiceStack";
import WorldsServiceStack from "./WorldsServiceStack";
import DiscoveryServiceStack from "./DiscoveryServiceStack";
import MetricsServiceStack from "./Metrics";
import { Tracing } from "aws-cdk-lib/aws-lambda";

export default function main(app) {
  // Set default runtime for all functions
  app.setDefaultFunctionProps({
    timeout: 10,
    runtime: "nodejs14.x",
    memorySize: 128,
    tracing: Tracing.DISABLED,
    environment: {
       NODE_OPTIONS: "--enable-source-maps",
    },
  });

  const { vrchatAuthApi } = new VRChatAuthServiceStack(app, "vrchat-auth-service");
  const { worldTopic } = new WorldsServiceStack(app, "worlds-service", { vrchatAuthApi });
  const discoveryServiceStack = new DiscoveryServiceStack(app, "discovery-service", { vrchatAuthApi, worldTopic });
  const metricsServiceStack = new MetricsServiceStack(app, "metrics-service", { worldTopic });
}
