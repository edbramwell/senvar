# Product Requirements Document (PRD)

Senvar Secrets SDK  
TypeScript (Bun) package providing creation, retrieval, rotation, and management of secrets in AWS SSM & AWS Secrets Manager.

---

## 1. Purpose

Provide a consistent API, CLI, and Pulumi scaffolding to define, store, retrieve, and rotate secrets and parameters used by Senvar applications across environments.

The SDK must abstract AWS details while allowing:

- Declarative definition of configuration variables
- Distinguishing between plain parameters vs true secrets
- Two AWS backends: Parameter Store (SSM) and Secrets Manager (SM)
- Simple, app-driven secret rotation

## 2. Out of Scope

- AWS-native rotation Lambdas (can be added later)
- Secret value caching
- Owner tags
- Local mock stores
- Automated IAM role attachment

## 3. Core Concepts

### 3.1 Variable Types

| Type      | Backend         | Encrypted                 | Rotation           | Use case             |
|-----------|-----------------|---------------------------|--------------------|----------------------|
| Parameter | SSM             | Optional (SecureString)   | No                 | Config values        |
| Secret    | Secrets Manager | Yes                       | Yes (app-driven)   | Passwords/API keys   |

### 3.2 Naming Convention

`$app-$stage-$var`

Examples:

- `billing-prod-stripeSecretKey`
- `app-dev-dbPassword`

### 3.3 Tags

- `app`
- `stage`

### 3.4 Class-based Resources

- SDK exposes `Secret` and `Parameter` classes (both extend a shared `SenvarVariable` base) to encapsulate naming, backend selection, and API calls.
- Each instance composes the canonical name as `${app}-${stage}-${var}`.
- `app` and `stage` default to `process.env.SST_APP` and `process.env.SST_STAGE`; constructors accept overrides for explicit control (e.g., cross-stage operations).
- Instances carry metadata (backend, encryption mode, tags) to keep API calls terse and self-documenting.

## 4. User Personas

### Developer (Local)

- Creates secrets
- Sets/updates via CLI
- Reads secrets during local dev

### Application Runtime (AWS Lambda/ECS/etc)

- Uses programmatic API to fetch secrets at cold start
- Relies on IAM roles (no local credentials)

### DevOps / Infra Engineer

- Uses Pulumi integration to create placeholder resources
- Uses CLI to seed initial values

## 5. Functional Requirements

### 5.1 Programmatic API (TypeScript)

The SDK must expose a strongly typed, class-based API.

#### 5.1.1 Define Variables

```ts
const dbPassword = new Secret("dbPassword"); // uses SST_APP/SST_STAGE by default
const featureFlag = new Parameter("featureFlag", { app: "billing", stage: "prod" });
```

Constructors accept:

- `name` (variable key without app/stage prefix)
- Optional `app`, `stage`
- Optional AWS config overrides (`region`, credential source)

#### 5.1.2 Get Values

```ts
const val = await dbPassword.get();
```

`Secret.get()` and `Parameter.get()` resolve to Secrets Manager or SSM respectively.

#### 5.1.3 Set Values

```ts
await featureFlag.set("enabled");
```

`set` automatically encrypts when targeting Secrets Manager. Both classes expose static helpers (`Secret.fromName("billing-prod-dbPassword")`) for situations where app/stage-prefixed names already exist.

#### 5.1.4 Rotate Secrets (App-driven)

Two supported rotation methods:

1. Instance method with user-provided function

```ts
await dbPassword.rotate(async old => generateNewApiKey(old));
```

2. Interactive/manual (CLI): user enters the new value manually, which internally calls `Secret.rotateInteractive()`.

Attempting to rotate a `Parameter` instance must throw.

#### 5.1.5 Delete Resources

```ts
await dbPassword.delete({ permanent: true });
```

CLI: `secrets delete name --force` or interactive confirm.

### 5.2 CLI Requirements

#### Commands

- `secrets define <name> [--secret]`
- `secrets get <name>`
- `secrets set <name> <value>`
- `secrets rotate <name> [--auto]`
- `secrets delete <name> (--force | confirm)`
- `secrets list [prefix]`
- `secrets pulumi:generate`

#### Behavior Notes

- `--secret` → use Secrets Manager
- `rotate`: no flag → ask user for new value; `--auto` → call rotation function exported by the user’s project
- CLI may accept: `--profile`, `--region`, `--stage`

### 5.3 Pulumi Integration

#### 5.3.1 Pulumi Component Generator

CLI command: `secrets pulumi:generate`

Creates:

```
/infra/
  secrets/
    variables.ts      # Definitions using the SDK API
    resources.ts      # Pulumi SSM/SM resources
```

Behavior:

- Create placeholder SSM parameters & Secrets Manager secrets
- Does NOT set values
- Tags: `{ app, stage }`

#### 5.3.2 Developer Flow

Pulumi creates placeholders → Developer runs `secrets set billing-prod-dbPassword`

## 6. Non-Functional Requirements

### 6.1 Security

- Use AWS-managed KMS keys for encryption
- Never log secret values
- Use HTTPS AWS SDK calls only
- Respect IAM permissions (no auto-modification)

### 6.2 Reliability

- Retry with exponential backoff (5 attempts, jitter)

### 6.3 Performance

- No caching behavior required in first version
- Avoid SDK reinitialization repeatedly

### 6.4 Compatibility

- Node ≥ 20 and Bun ≥ 1.0
- AWS SDK v3

### 6.5 Developer Experience

- Auto-complete & type-safe definitions where possible
- Helpful error messages
- Clear CLI UX

## 7. Architecture

### 7.1 Package Structure

```
/src
  /api
    define.ts
    get.ts
    set.ts
    rotate.ts
    delete.ts
    types.ts
  /providers
    ssm.ts
    secretsManager.ts
  /cli
    index.ts
    commands/*.ts
  /pulumi
    generator.ts
  index.ts
```

### 7.2 Backend Selection

- `defineSecret` → always Secrets Manager
- `defineParameter` → SSM Parameter Store

### 7.3 Storage Metadata

- Secrets Manager and SSM parameters store metadata natively
- Optional metadata stored in tags

## 8. Rotation Mechanics

### 8.1 App-driven Rotation Flow

1. Fetch current value
2. Compute new value via user-provided rotate function or manual entry
3. Write using `set`
4. Return new version ARN / version number

### 8.2 Rotation Function Discovery

If user enables `--auto`, CLI attempts to import:

- `/secrets/rotation/<name>.ts`, or
- A user-defined map:

```ts
export const rotationHandlers = {
  "billing-prod-apiKey": async old => generate()
};
```

## 9. Edge Cases

- Attempting to rotate a non-secret → error
- Setting a secret in SSM without `--secret` → warn + confirm
- Rotating secrets with no previous value → allow
- Deleting without `--force` → interactive confirm

## 10. Roadmap (Future)

- AWS-native auto-rotation integration
- Local caching layer
- Secret-schema validation
- GitOps mode (export definitions → import to Pulumi)
- Custom KMS key support
- Local persistence for offline dev

## 11. Open Questions

- None blocking implementation. All prior answers incorporated.

