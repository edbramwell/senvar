import { SSTConfig } from "sst";
import { StackContext, Function as SSTFunction } from "sst/constructs";

const config: SSTConfig = {
  config() {
    return {
      name: "senvar",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function SecretsStack({ stack }: StackContext) {
      stack.setDefaultFunctionProps({
        runtime: "nodejs20.x",
        environment: {
          SST_APP: app.name,
          SST_STAGE: app.stage,
        },
      });

      new SSTFunction(stack, "SecretsDemo", {
        handler: "functions/handler.main",
      });
    });
  },
};

export default config;

