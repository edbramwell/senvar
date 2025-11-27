import kleur from "kleur";
import { Secret } from "../../api/secret";
import { Parameter } from "../../api/parameter";
import type { CliGlobalOptions } from "../context";
import { parseIdentifier } from "../context";
import { confirm } from "../prompts";

interface DeleteCommandOptions {
  secret?: boolean;
  force?: boolean;
  permanent?: boolean;
  app?: string;
  stage?: string;
  profile?: string;
  region?: string;
}

export async function handleDeleteCommand(name: string, opts: DeleteCommandOptions, globals: CliGlobalOptions) {
  const parsed = await parseIdentifier(name, globals, opts);
  const variable = opts.secret ? new Secret(parsed.name, parsed.options) : new Parameter(parsed.name, parsed.options);

  if (!opts.force) {
    const ok = await confirm(`Really delete ${variable.fullName}?`);
    if (!ok) {
      console.log(kleur.yellow("Cancelled."));
      return;
    }
  }

  if (variable instanceof Secret) {
    await variable.delete({ permanent: opts.permanent });
  } else {
    await variable.delete();
  }
  console.log(kleur.red(`Deleted ${variable.fullName}`));
}

