# AWS SST Lambda Example

This example shows how to combine Senvar (Secure ENvironment VARiables) with an [SST v3](https://sst.dev) application. A single Lambda function loads a `Secret` at cold start, proving out the class-based runtime ergonomics.

## Project Layout

```
src/examples/aws-sst-lambda/
  functions/
    handler.ts        # Lambda that reads a secret value
  sst.config.ts       # SST app + stack definition
  tsconfig.json
  package.json
```

`SST_APP` and `SST_STAGE` are injected automatically so the SDK can compose fully qualified names without extra boilerplate.

## Prerequisites

- Bun ≥ 1.0
- Node ≥ 20
- AWS credentials with permission to read/write SSM parameters and Secrets Manager entries

## Setup

```bash
cd src/examples/aws-sst-lambda
bun install
```

The example depends on the workspace version of `@senvar/secrets` via a local file reference. When you publish the package, replace the dependency with the public version.

## Provision the Secret

Use the CLI provided by this repo to create a placeholder secret. Because the example stack uses `SST_APP=senvar` and `SST_STAGE=dev`, export those values (or inline them) before running `define`.

```bash
cd /Users/edbramwell/Projects/senvar/secrets
SST_APP=senvar SST_STAGE=dev bunx senvar secret define dbPassword
SST_APP=senvar SST_STAGE=dev bunx senvar secret set dbPassword
```

The `senvar secret` commands automatically use Secrets Manager (which supports rotation). Use `senvar parameter` commands for SSM Parameter Store.

## Run the Sample

```bash
cd src/examples/aws-sst-lambda
bun dev    # runs `sst dev`
```

The SST dev server will deploy the stack, invoke the Lambda, and stream logs. Each invocation calls `dbPassword.get()` and logs the secret length (without revealing the value).

To deploy to AWS, run:

```bash
bun deploy
```

## How It Works

1. `sst.config.ts` creates a single stack with default Lambda environment variables (`SST_APP`, `SST_STAGE`) and declares the handler.
2. `functions/handler.ts` instantiates `new Secret("dbPassword")` and uses `await secret.get()` during the request.
3. The CLI commands above ensure the backing Secrets Manager entry exists prior to deployment.

Feel free to expand the example by adding more secrets, rotation handlers (`secrets/rotation/*.ts`), or parameters.

