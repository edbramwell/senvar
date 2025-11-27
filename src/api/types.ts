import type { AwsClientConfig } from "../providers/aws";

export interface SenvarVariableOptions extends AwsClientConfig {
  app?: string;
  stage?: string;
  tags?: Record<string, string>;
}

export interface ValueOptions extends AwsClientConfig {}

export type RotationHandler = (currentValue: string | null) => Promise<string>;

