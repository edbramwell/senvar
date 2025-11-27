import {
  AddTagsToResourceCommand,
  DeleteParameterCommand,
  DescribeParametersCommand,
  GetParameterCommand,
  ParameterType,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import { getSsmClient, type AwsClientConfig } from "./aws";
import { retry } from "../utils/backoff";

export interface PutParameterOptions extends AwsClientConfig {
  secure?: boolean;
  overwrite?: boolean;
  tags?: Record<string, string>;
}

export async function putParameter(name: string, value: string, options: PutParameterOptions = {}): Promise<void> {
  const client = getSsmClient(options);
  const overwrite = options.overwrite ?? true;
  
  await retry(async () => {
    // SSM doesn't allow setting tags when overwrite=true, so we need to handle them separately
    const tagsToSet = options.tags
      ? Object.entries(options.tags).map(([Key, Value]) => ({ Key, Value }))
      : undefined;

    await client.send(
      new PutParameterCommand({
        Name: name,
        Value: value,
        Type: options.secure ? ParameterType.SECURE_STRING : ParameterType.STRING,
        Overwrite: overwrite,
        // Only set tags if not overwriting (creating new parameter)
        Tags: overwrite ? undefined : tagsToSet,
      }),
    );

    // If overwriting and tags are provided, add them separately
    if (overwrite && tagsToSet && tagsToSet.length > 0) {
      await client.send(
        new AddTagsToResourceCommand({
          ResourceType: "Parameter",
          ResourceId: name,
          Tags: tagsToSet,
        }),
      );
    }
  });
}

export async function getParameter(name: string, options: AwsClientConfig = {}): Promise<string> {
  const client = getSsmClient(options);
  const result = await retry(() =>
    client.send(
      new GetParameterCommand({
        Name: name,
        WithDecryption: true,
      }),
    ),
  );

  if (!result.Parameter?.Value) {
    throw new Error(`Parameter "${name}" is empty or missing a value.`);
  }

  return result.Parameter.Value;
}

export function deleteParameter(name: string, options: AwsClientConfig = {}): Promise<void> {
  const client = getSsmClient(options);
  return retry(async () => {
    await client.send(
      new DeleteParameterCommand({
        Name: name,
      }),
    );
  });
}

export interface ListParametersOptions extends AwsClientConfig {
  prefix?: string;
  tags?: Record<string, string>;
}

export async function listParameters(options: ListParametersOptions = {}): Promise<string[]> {
  const client = getSsmClient(options);
  const filters: Array<{ Key: string; Option: string; Values: string[] }> = [];

  // Prefer path-based filtering (more reliable than tags)
  if (options.prefix) {
    filters.push({
      Key: "Name",
      Option: "BeginsWith",
      Values: [options.prefix],
    });
  } else if (options.tags) {
    // Fallback to tag filtering if no prefix
    for (const [key, value] of Object.entries(options.tags)) {
      filters.push({
        Key: `tag:${key}`,
        Option: "Equals",
        Values: [value],
      });
    }
  }

  const response = await retry(() =>
    client.send(
      new DescribeParametersCommand({
        ParameterFilters: filters.length > 0 ? filters : undefined,
        MaxResults: 50,
      }),
    ),
  );
  const names = (response.Parameters ?? []).map(param => param.Name!).filter(Boolean);
  return names;
}

