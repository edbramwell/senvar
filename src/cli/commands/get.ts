import kleur from "kleur";
import { Secret } from "../../api/secret";
import { Parameter } from "../../api/parameter";
import type { CliGlobalOptions } from "../context";
import { parseIdentifier } from "../context";

interface GetCommandOptions {
  secret?: boolean;
  app?: string;
  stage?: string;
  profile?: string;
  region?: string;
}

export async function handleGetCommand(name: string, opts: GetCommandOptions, globals: CliGlobalOptions) {
  const parsed = await parseIdentifier(name, globals, opts);
  const variable = opts.secret ? new Secret(parsed.name, parsed.options) : new Parameter(parsed.name, parsed.options);
  const value = await variable.get();
  console.log(kleur.cyan(value));
}

