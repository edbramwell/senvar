import { fromIni } from "@aws-sdk/credential-providers";
import type { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { SSMClient } from "@aws-sdk/client-ssm";

export interface AwsClientConfig {
  region?: string;
  profile?: string;
}

function createCredentialsProvider(profile?: string): AwsCredentialIdentityProvider | undefined {
  if (!profile) return undefined;
  return fromIni({ profile });
}

function buildClientKey(prefix: string, config: AwsClientConfig): string {
  const region = config.region ?? process.env.AWS_REGION ?? "default";
  const profile = config.profile ?? process.env.AWS_PROFILE ?? "default";
  return `${prefix}:${region}:${profile}`;
}

const secretsManagerClients = new Map<string, SecretsManagerClient>();
const ssmClients = new Map<string, SSMClient>();

export function getSecretsManagerClient(config: AwsClientConfig = {}): SecretsManagerClient {
  const key = buildClientKey("sm", config);
  if (!secretsManagerClients.has(key)) {
    secretsManagerClients.set(
      key,
      new SecretsManagerClient({
        region: config.region ?? process.env.AWS_REGION,
        credentials: createCredentialsProvider(config.profile ?? process.env.AWS_PROFILE),
      }),
    );
  }
  return secretsManagerClients.get(key)!;
}

export function getSsmClient(config: AwsClientConfig = {}): SSMClient {
  const key = buildClientKey("ssm", config);
  if (!ssmClients.has(key)) {
    ssmClients.set(
      key,
      new SSMClient({
        region: config.region ?? process.env.AWS_REGION,
        credentials: createCredentialsProvider(config.profile ?? process.env.AWS_PROFILE),
      }),
    );
  }
  return ssmClients.get(key)!;
}

