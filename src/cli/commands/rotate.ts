import kleur from "kleur";
import { Secret } from "../../api/secret";
import { Parameter } from "../../api/parameter";
import type { CliGlobalOptions } from "../context";
import { parseIdentifier } from "../context";
import { promptForValue } from "../prompts";
import { loadRotationHandler } from "../../api/rotation";

interface RotateCommandOptions {
  auto?: boolean;
  secret?: boolean;
  app?: string;
  stage?: string;
  profile?: string;
  region?: string;
}

export async function handleRotateCommand(name: string, opts: RotateCommandOptions, globals: CliGlobalOptions) {
  const parsed = await parseIdentifier(name, globals, opts);

  if (!opts.secret) {
    throw new Error("Rotation is only supported for secrets. Use --secret to target Secrets Manager.");
  }

  const secret = new Secret(parsed.name, parsed.options);
  const handler =
    opts.auto
      ? await loadRotationHandler(secret)
      : async (current: string | null) => promptForValue(`Enter new value for ${secret.fullName}`, current ?? undefined);

  if (!handler) {
    throw new Error(
      `No rotation handler found for ${secret.fullName}. Create secrets/rotation/${secret.fullName}.ts or export rotationHandlers.`,
    );
  }

  await secret.rotate(handler);
  console.log(kleur.green(`Rotated ${secret.fullName}`));
}

