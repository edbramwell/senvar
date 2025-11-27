import path from "node:path";
import fs from "node:fs";
import fsExtra from "fs-extra";

export interface PulumiGeneratorOptions {
  root?: string;
  force?: boolean;
  app?: string;
  stage?: string;
}

const variablesTemplate = (app: string, stage: string) => `import { Secret, Parameter } from "@senvar/secrets";

const base = { app: "${app}", stage: "${stage}" };

export const dbPassword = new Secret("dbPassword", base);
export const featureFlag = new Parameter("featureFlag", base);

export const variables = {
  dbPassword,
  featureFlag,
};
`;

const resourcesTemplate = `import * as aws from "@pulumi/aws";
import { variables } from "./variables";

export function createSecretResources() {
  const resources = [];

  resources.push(
    new aws.secretsmanager.Secret("dbPassword", {
      name: variables.dbPassword.fullName,
      tags: {
        app: variables.dbPassword.app,
        stage: variables.dbPassword.stage,
      },
    }),
  );

  resources.push(
    new aws.ssm.Parameter("featureFlag", {
      name: variables.featureFlag.fullName,
      type: "SecureString",
      tags: {
        app: variables.featureFlag.app,
        stage: variables.featureFlag.stage,
      },
    }),
  );

  return resources;
}
`;

export interface PulumiGeneratorResult {
  created: string[];
  skipped: string[];
}

export async function generatePulumiScaffolding(
  options: PulumiGeneratorOptions = {},
): Promise<PulumiGeneratorResult> {
  const root = options.root ?? process.cwd();
  const targetDir = path.join(root, "infra", "secrets");
  await fsExtra.ensureDir(targetDir);

  const app = options.app ?? process.env.SST_APP ?? "app";
  const stage = options.stage ?? process.env.SST_STAGE ?? "dev";

  const files = [
    {
      path: path.join(targetDir, "variables.ts"),
      content: variablesTemplate(app, stage),
    },
    {
      path: path.join(targetDir, "resources.ts"),
      content: resourcesTemplate,
    },
  ];

  const result: PulumiGeneratorResult = { created: [], skipped: [] };

  for (const file of files) {
    if (fs.existsSync(file.path) && !options.force) {
      result.skipped.push(file.path);
      continue;
    }
    await fsExtra.writeFile(file.path, file.content, "utf8");
    result.created.push(file.path);
  }

  return result;
}

