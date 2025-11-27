import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  PutSecretValueCommand,
  ResourceExistsException,
  type DeleteSecretCommandInput,
  type Filter,
} from "@aws-sdk/client-secrets-manager";
import { getSecretsManagerClient, type AwsClientConfig } from "./aws";
import { retry } from "../utils/backoff";

export interface EnsureSecretOptions extends AwsClientConfig {
  tags?: Record<string, string>;
}

export async function ensureSecret(name: string, options: EnsureSecretOptions = {}): Promise<void> {
  const client = getSecretsManagerClient(options);
  await retry(async () => {
    try {
      await client.send(
        new CreateSecretCommand({
          Name: name,
          SecretString: "PLACEHOLDER_VALUE_REPLACE_ME",
          Tags:
            options.tags &&
            Object.entries(options.tags).map(([Key, Value]) => ({
              Key,
              Value,
            })),
        }),
      );
    } catch (error) {
      if (error instanceof ResourceExistsException) return;
      throw error;
    }
  });
}

export async function setSecretValue(name: string, value: string, options: AwsClientConfig = {}): Promise<void> {
  const client = getSecretsManagerClient(options);
  await retry(async () => {
    await client.send(
      new PutSecretValueCommand({
        SecretId: name,
        SecretString: value,
      }),
    );
  });
}

export async function getSecretValue(name: string, options: AwsClientConfig = {}): Promise<string> {
  const client = getSecretsManagerClient(options);
  const result = await retry(() =>
    client.send(
      new GetSecretValueCommand({
        SecretId: name,
      }),
    ),
  );
  if (!result.SecretString) {
    throw new Error(`Secret "${name}" is empty or missing a value.`);
  }
  return result.SecretString;
}

export async function deleteSecret(name: string, options: AwsClientConfig & { force?: boolean } = {}): Promise<void> {
  const client = getSecretsManagerClient(options);
  const input: DeleteSecretCommandInput = {
    SecretId: name,
  };

  if (options.force ?? false) {
    input.ForceDeleteWithoutRecovery = true;
  } else {
    input.RecoveryWindowInDays = 7;
  }

  await retry(() =>
    client.send(
      new DeleteSecretCommand(input),
    ),
  );
}

export interface ListSecretsOptions extends AwsClientConfig {
  prefix?: string;
  tags?: Record<string, string>;
}

export async function listSecrets(options: ListSecretsOptions = {}): Promise<string[]> {
  const client = getSecretsManagerClient(options);
  const filters: Filter[] = [];

  // For Secrets Manager, we use tag-key filters to narrow down, then filter client-side
  // because Secrets Manager doesn't support exact tag key-value pair matching in filters
  if (options.tags) {
    const tagKeys = Object.keys(options.tags);
    if (tagKeys.length > 0) {
      // Filter by tag keys first (more efficient than fetching all)
      filters.push({
        Key: "tag-key",
        Values: tagKeys,
      } as Filter);
    }
  }

  const response = await retry(() =>
    client.send(
      new ListSecretsCommand({
        Filters: filters.length > 0 ? filters : undefined,
        MaxResults: 50,
      }),
    ),
  );
  
  let secrets = response.SecretList ?? [];
  
  // Client-side filtering for exact tag key-value matches
  if (options.tags) {
    secrets = secrets.filter(secret => {
      const secretTags = (secret.Tags ?? []).reduce((acc, tag) => {
        if (tag.Key && tag.Value) acc[tag.Key] = tag.Value;
        return acc;
      }, {} as Record<string, string>);
      
      return Object.entries(options.tags!).every(([key, value]) => secretTags[key] === value);
    });
  }
  
  const names = secrets.map(secret => secret.Name!).filter(Boolean);
  
  // Additional prefix filtering
  if (options.prefix) {
    return names.filter(name => name.startsWith(options.prefix!));
  }
  
  return names;
}

