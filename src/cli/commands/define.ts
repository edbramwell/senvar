import kleur from "kleur";
import { Secret } from "../../api/secret";
import { Parameter } from "../../api/parameter";
import type { CliGlobalOptions } from "../context";
import { parseIdentifier } from "../context";

interface DefineCommandOptions {
  secret?: boolean;
  app?: string;
  stage?: string;
  profile?: string;
  region?: string;
}

export async function handleDefineCommand(name: string, opts: DefineCommandOptions, globals: CliGlobalOptions) {
  const parsed = await parseIdentifier(name, globals, opts);
  if (opts.secret) {
    const secret = new Secret(parsed.name, parsed.options);
    await secret.ensure();
    console.log(kleur.green(`Ensured secret ${secret.fullName}`));
  } else {
    const parameter = new Parameter(parsed.name, parsed.options);
    await parameter.ensure({ secure: true });
    console.log(kleur.green(`Ensured parameter ${parameter.fullName}`));
  }
}

