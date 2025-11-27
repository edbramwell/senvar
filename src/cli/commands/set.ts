import { Secret } from "../../api/secret";
import { Parameter } from "../../api/parameter";
import type { CliGlobalOptions } from "../context";
import { parseIdentifier } from "../context";
import { promptForValue } from "../prompts";

interface SetCommandOptions {
  secret?: boolean;
  app?: string;
  stage?: string;
  profile?: string;
  region?: string;
}

export async function handleSetCommand(name: string, maybeValue: string | undefined, opts: SetCommandOptions, globals: CliGlobalOptions) {
  const parsed = await parseIdentifier(name, globals, opts);
  const variable = opts.secret ? new Secret(parsed.name, parsed.options) : new Parameter(parsed.name, parsed.options);
  const value = maybeValue ?? (await promptForValue(`Enter value for ${variable.fullName}`));
  await variable.set(value);
  console.log(`Updated ${variable.fullName}`);
}

