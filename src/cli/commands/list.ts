import kleur from "kleur";
import type { CliGlobalOptions } from "../context";
import { buildOptions, parseIdentifier } from "../context";
import { listParameters } from "../../providers/ssm";
import { listSecrets } from "../../providers/secretsManager";
import { Secret } from "../../api/secret";
import { Parameter } from "../../api/parameter";

interface ListCommandOptions {
  prefix?: string;
  app?: string;
  stage?: string;
  profile?: string;
  region?: string;
  secret?: boolean;
  forceShow?: boolean;
}

export async function handleListCommand(opts: ListCommandOptions, globals: CliGlobalOptions) {
  const options = await buildOptions(globals, opts);
  
  // Use path-based prefix filtering (more reliable than tags)
  // Automatically filter to only show project-relevant resources
  const prefix = opts.prefix ?? `/senvar/${options.app}/${options.stage}/`;

  // Also build tags for Secrets Manager (which doesn't support path filtering as well)
  const tags: Record<string, string> | undefined =
    options.app || options.stage
      ? {
          ...(options.app && { app: options.app }),
          ...(options.stage && { stage: options.stage }),
        }
      : undefined;

  // Show what we're filtering by
  if (options.app && options.stage && !opts.prefix) {
    console.log(kleur.dim(`Filtering by project: ${options.app}/${options.stage}`));
  }

  // Helper function to fetch and display a secret with obscured value
  const displaySecret = async (fullName: string, forceShow: boolean = false): Promise<void> => {
    try {
      const parsed = await parseIdentifier(fullName, globals, opts);
      const secret = new Secret(parsed.name, parsed.options);
      const value = await secret.get();
      if (forceShow) {
        console.log(` - ${kleur.cyan(fullName)}: ${kleur.green(value)}`);
      } else {
        console.log(` - ${kleur.cyan(fullName)}: ${kleur.dim("****")}`);
      }
    } catch (error) {
      // If we can't fetch the value, just show the name
      console.log(` - ${kleur.cyan(fullName)}: ${kleur.red("(error fetching value)")}`);
    }
  };

  // Helper function to fetch and display a parameter with its value
  const displayParameter = async (fullName: string): Promise<void> => {
    try {
      const parsed = await parseIdentifier(fullName, globals, opts);
      const parameter = new Parameter(parsed.name, parsed.options);
      const value = await parameter.get();
      console.log(` - ${kleur.cyan(fullName)}: ${kleur.green(value)}`);
    } catch (error) {
      // If we can't fetch the value, just show the name
      console.log(` - ${kleur.cyan(fullName)}: ${kleur.red("(error fetching value)")}`);
    }
  };

  // Filter based on whether we're listing secrets or parameters
  if (opts.secret === true) {
    // List only secrets
    const secrets = await listSecrets({ ...options, prefix, tags });
    if (secrets.length === 0) {
      console.log(kleur.yellow("No secrets found."));
      if (options.app && options.stage) {
        console.log(kleur.dim(`Filtered to: /senvar/${options.app}/${options.stage}/`));
      }
      return;
    }
    console.log(kleur.bold().underline("Secrets"));
    for (const name of secrets) {
      await displaySecret(name, opts.forceShow ?? false);
    }
  } else if (opts.secret === false) {
    // List only parameters
    const params = await listParameters({ ...options, prefix });
    if (params.length === 0) {
      console.log(kleur.yellow("No parameters found."));
      if (options.app && options.stage) {
        console.log(kleur.dim(`Filtered to: /senvar/${options.app}/${options.stage}/`));
      }
      return;
    }
    console.log(kleur.bold().underline("Parameters"));
    for (const name of params) {
      await displayParameter(name);
    }
  } else {
    // List both (for backwards compatibility or if called directly)
    const [params, secrets] = await Promise.all([
      listParameters({ ...options, prefix }),
      listSecrets({ ...options, prefix, tags }),
    ]);

    if (params.length === 0 && secrets.length === 0) {
      console.log(kleur.yellow("No parameters or secrets found."));
      if (options.app && options.stage) {
        console.log(kleur.dim(`Filtered to: /senvar/${options.app}/${options.stage}/`));
      } else if (prefix) {
        console.log(kleur.dim(`Filtered by prefix: ${prefix}`));
      }
      return;
    }

    if (params.length > 0) {
      console.log(kleur.bold().underline("Parameters"));
      for (const name of params) {
        await displayParameter(name);
      }
    }

    if (secrets.length > 0) {
      if (params.length > 0) console.log();
      console.log(kleur.bold().underline("Secrets"));
      for (const name of secrets) {
        await displaySecret(name, opts.forceShow ?? false);
      }
    }
  }
}

