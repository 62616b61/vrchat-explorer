import { Tracing } from "aws-cdk-lib/aws-lambda";

import VRChatAuthServiceStack from "./VRChatAuth";
import DiscoveryServiceStack from "./Discovery";
import DiscordServiceStack from "./Discord";
import WorldsServiceStack from "./Worlds";
import MetricsServiceStack from "./Metrics";

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
  const { worldsTopic } = new WorldsServiceStack(app, "worlds-service", { vrchatAuthApi });
  const discoveryServiceStack = new DiscoveryServiceStack(app, "discovery-service", { vrchatAuthApi, worldsTopic });
  const discordServiceStack = new DiscordServiceStack(app, "discord-service", { worldsTopic });
  const metricsServiceStack = new MetricsServiceStack(app, "metrics-service", { worldsTopic });
}
