# Senvar - Secure ENvironment VARiables

**Website:** [senvar.dev](https://senvar.dev)

TypeScript + Bun toolkit for defining, storing, retrieving, rotating, and scaffolding secrets that live in AWS SSM Parameter Store and AWS Secrets Manager.

## Installation

```bash
bun add @senvar/secrets
```

## Programmatic API

```ts
import { Secret, Parameter } from "@senvar/secrets";

const dbPassword = new Secret("dbPassword", { app: "billing", stage: "prod" });
const featureFlag = new Parameter("featureFlag"); // defaults to SST_APP/SST_STAGE

await dbPassword.set("super-secret");
const value = await dbPassword.get();

await featureFlag.set("enabled");
```

## CLI

The CLI is available via the `senvar` binary. When installed in a project, you can run:

```bash
bunx senvar --help
# or from node_modules/.bin after installation:
./node_modules/.bin/senvar --help
```

### Secrets (AWS Secrets Manager - supports rotation)

```bash
senvar secret define <name>
senvar secret get <name>
senvar secret set <name> [value]
senvar secret rotate <name> [--auto]
senvar secret delete <name> [--force] [--permanent]
senvar secret list [prefix]
```

### Parameters (AWS SSM Parameter Store)

```bash
senvar parameter define <name>
senvar parameter get <name>
senvar parameter set <name> [value]
senvar parameter delete <name> [--force]
senvar parameter list [prefix]
```

### Pulumi Scaffolding

```bash
senvar pulumi:generate [--force]
```

Global flags: `--app`, `--stage`, `--region`, `--profile`. The CLI automatically detects app/stage from `senvar.config.ts`, `SENVAR_APP`/`SENVAR_STAGE`, `sst.config.ts`, or `SST_APP`/`SST_STAGE`.

## SST Example

An end-to-end sample that wires the SDK into an SST v3 Lambda lives under `src/examples/aws-sst-lambda`. Follow the README in that directory to provision secrets and run `bun dev`.
