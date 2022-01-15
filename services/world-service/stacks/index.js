import WorldServiceStack from "./WorldServiceStack";

export default function main(app) {
  // Set default runtime for all functions
  app.setDefaultFunctionProps({
    runtime: "nodejs14.x",
    bundle: false
  });

  new WorldServiceStack(app, "world-service");

  // Add more stacks
}
