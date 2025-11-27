import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface ProjectConfig {
  app?: string;
  stage?: string;
}

/**
 * Detects project configuration from config files and environment variables.
 * Checks in order:
 * 1. senvar.config.ts (or senvar.config.js)
 * 2. SENVAR_APP / SENVAR_STAGE environment variables
 * 3. sst.config.ts (or sst.config.js)
 * 4. SST_APP / SST_STAGE environment variables
 */
export async function detectProjectConfig(cwd: string = process.cwd()): Promise<ProjectConfig> {
  const config: ProjectConfig = {};

  // 1. Try senvar.config.ts
  const senvarConfigPath = findConfigFile(cwd, "senvar.config");
  if (senvarConfigPath) {
    try {
      const senvarConfig = await loadConfigFile(senvarConfigPath);
      if (senvarConfig) {
        config.app = senvarConfig.app ?? config.app;
        config.stage = senvarConfig.stage ?? config.stage;
      }
    } catch (error) {
      // Silently fail - config file might not be importable
    }
  }

  // 2. Check SENVAR_* environment variables
  if (process.env.SENVAR_APP) config.app = process.env.SENVAR_APP;
  if (process.env.SENVAR_STAGE) config.stage = process.env.SENVAR_STAGE;

  // 3. Try sst.config.ts
  const sstConfigPath = findConfigFile(cwd, "sst.config");
  if (sstConfigPath && (!config.app || !config.stage)) {
    try {
      const sstConfig = await loadSstConfig(sstConfigPath);
      if (sstConfig) {
        config.app = config.app ?? sstConfig.name;
        // SST stage comes from CLI, not config file, so we check env var
      }
    } catch (error) {
      // Silently fail - config file might not be importable
    }
  }

  // 4. Check SST_* environment variables (fallback)
  if (!config.app && process.env.SST_APP) config.app = process.env.SST_APP;
  if (!config.stage && process.env.SST_STAGE) config.stage = process.env.SST_STAGE;

  return config;
}

function findConfigFile(cwd: string, baseName: string): string | null {
  const extensions = [".ts", ".js", ".mts", ".mjs"];
  for (const ext of extensions) {
    const filePath = path.join(cwd, `${baseName}${ext}`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

async function loadConfigFile(filePath: string): Promise<ProjectConfig | null> {
  try {
    // Try to import as ES module
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    const module = await import(pathToFileURL(absolutePath).href);
    const config = module.default ?? module;
    
    // Support both { app, stage } and config() function patterns
    if (typeof config === "function") {
      const result = config();
      return {
        app: result?.app ?? result?.name,
        stage: result?.stage,
      };
    }
    
    return {
      app: config.app ?? config.name,
      stage: config.stage,
    };
  } catch (error) {
    return null;
  }
}

async function loadSstConfig(filePath: string): Promise<{ name?: string } | null> {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    const module = await import(pathToFileURL(absolutePath).href);
    const config = module.default ?? module;
    
    // SST config has a config() function that returns { name, region }
    if (typeof config === "function") {
      const result = config();
      return { name: result?.name };
    }
    
    if (config.config && typeof config.config === "function") {
      const result = config.config();
      return { name: result?.name };
    }
    
    return { name: config.name };
  } catch (error) {
    return null;
  }
}


