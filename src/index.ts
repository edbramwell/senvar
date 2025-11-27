import { Secret } from "./api/secret";
import { Parameter } from "./api/parameter";
import type { SenvarVariableOptions } from "./api/types";

export { SenvarVariable } from "./api/base";
export { Secret } from "./api/secret";
export { Parameter } from "./api/parameter";
export type { SenvarVariableOptions, RotationHandler, ValueOptions } from "./api/types";
export { loadRotationHandler } from "./api/rotation";
export { generatePulumiScaffolding } from "./pulumi/generator";

export const defineSecret = (name: string, options?: SenvarVariableOptions): Secret => new Secret(name, options);

export const defineParameter = (name: string, options?: SenvarVariableOptions): Parameter =>
  new Parameter(name, options);

