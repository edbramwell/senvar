import kleur from "kleur";
import type { CliGlobalOptions } from "../context";
import { generatePulumiScaffolding } from "../../pulumi/generator";

interface PulumiCommandOptions {
  force?: boolean;
  app?: string;
  stage?: string;
}

export async function handlePulumiGenerateCommand(opts: PulumiCommandOptions, globals: CliGlobalOptions) {
  const result = await generatePulumiScaffolding({
    force: opts.force,
    app: opts.app ?? globals.app,
    stage: opts.stage ?? globals.stage,
  });

  result.created.forEach(file => console.log(kleur.green(`Created ${file}`)));
  result.skipped.forEach(file => console.log(kleur.yellow(`Skipped ${file} (exists)`)));
}

