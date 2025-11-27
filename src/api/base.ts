import type { SenvarVariableOptions, ValueOptions } from "./types";

export abstract class SenvarVariable {
  readonly name: string;
  readonly app: string;
  readonly stage: string;
  readonly region?: string;
  readonly profile?: string;
  readonly tags: Record<string, string>;

  protected constructor(name: string, options: SenvarVariableOptions = {}) {
    if (!name) throw new Error("Variable name is required.");
    this.name = name;
    this.app = options.app ?? process.env.SST_APP ?? "";
    this.stage = options.stage ?? process.env.SST_STAGE ?? "";

    if (!this.app) {
      throw new Error('Missing "app". Provide via options or SST_APP environment variable.');
    }
    if (!this.stage) {
      throw new Error('Missing "stage". Provide via options or SST_STAGE environment variable.');
    }

    this.region = options.region ?? process.env.AWS_REGION;
    this.profile = options.profile ?? process.env.AWS_PROFILE;
    this.tags = {
      app: this.app,
      stage: this.stage,
      ...options.tags,
    };
  }

  get fullName(): string {
    return `/senvar/${this.app}/${this.stage}/${this.name}`;
  }

  protected valueOptions(overrides?: ValueOptions): ValueOptions {
    return {
      region: overrides?.region ?? this.region,
      profile: overrides?.profile ?? this.profile,
    };
  }

  abstract get(options?: ValueOptions): Promise<string>;
  abstract set(value: string, options?: ValueOptions): Promise<void>;
  abstract delete(options?: ValueOptions & { permanent?: boolean }): Promise<void>;
}

