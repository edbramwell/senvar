import type { SenvarVariableOptions } from "../api/types";
import { detectProjectConfig } from "../utils/config";

export interface CliGlobalOptions {
  app?: string;
  stage?: string;
  profile?: string;
  region?: string;
}

export interface ParsedIdentifier {
  name: string;
  options: SenvarVariableOptions;
  fullyQualified: boolean;
}

export async function buildOptions(
  globalOptions: CliGlobalOptions,
  overrides: Partial<CliGlobalOptions> = {},
): Promise<SenvarVariableOptions> {
  // Auto-detect from config files if not explicitly provided
  const detected = await detectProjectConfig();
  
  const app = overrides.app ?? globalOptions.app ?? detected.app;
  const stage = overrides.stage ?? globalOptions.stage ?? detected.stage;
  
  if (!app || !stage) {
    const suggestions: string[] = [];
    if (!app) {
      suggestions.push("Set app via: --app <name>, SENVAR_APP, or SST_APP env var");
      suggestions.push("Or create senvar.config.ts or sst.config.ts with app name");
    }
    if (!stage) {
      suggestions.push("Set stage via: --stage <name>, SENVAR_STAGE, or SST_STAGE env var");
      suggestions.push("Or create senvar.config.ts or sst.config.ts with stage");
    }
    
    throw new Error(
      `Missing required project configuration.\n` +
      `App: ${app || "not detected"}\n` +
      `Stage: ${stage || "not detected"}\n\n` +
      `To fix:\n${suggestions.map(s => `  - ${s}`).join("\n")}`
    );
  }
  
  return {
    app,
    stage,
    profile: overrides.profile ?? globalOptions.profile,
    region: overrides.region ?? globalOptions.region,
  };
}

export async function parseIdentifier(
  identifier: string,
  globalOptions: CliGlobalOptions,
  overrides: Partial<CliGlobalOptions> = {},
): Promise<ParsedIdentifier> {
  const options = await buildOptions(globalOptions, overrides);
  
  // Support path format: /senvar/app/stage/name
  if (identifier.startsWith("/senvar/")) {
    const parts = identifier.split("/").filter(Boolean);
    if (parts.length === 4 && parts[0] === "senvar" && parts[1] && parts[2] && parts[3]) {
      return {
        name: parts[3],
        options: {
          ...options,
          app: parts[1],
          stage: parts[2],
        },
        fullyQualified: true,
      };
    }
  }
  
  // Support legacy format: app-stage-name
  const parts = identifier.split("-");
  if (parts.length >= 3 && (!options.app || !options.stage)) {
    const [app, stage, ...rest] = parts;
    return {
      name: rest.join("-"),
      options: {
        ...options,
        app,
        stage,
      },
      fullyQualified: true,
    };
  }

  return {
    name: identifier,
    options,
    fullyQualified: false,
  };
}

