import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { SenvarVariable } from "./base";
import type { RotationHandler } from "./types";

const ROTATION_DIR = path.resolve(process.cwd(), "secrets", "rotation");
const FILE_EXTENSIONS = [".ts", ".mts", ".js", ".mjs", ".cjs"];

async function tryImportHandler(filePath: string): Promise<RotationHandler | null> {
  const module = await import(pathToFileURL(filePath).href);
  if (typeof module.default === "function") return module.default as RotationHandler;
  if (typeof module.rotate === "function") return module.rotate as RotationHandler;
  if (typeof module.handler === "function") return module.handler as RotationHandler;
  if (module.rotationHandler && typeof module.rotationHandler === "function") {
    return module.rotationHandler as RotationHandler;
  }
  return null;
}

async function tryImportHandlerMap(
  filePath: string,
  variable: SenvarVariable,
): Promise<RotationHandler | null> {
  const module = await import(pathToFileURL(filePath).href);
  const handlers = module.rotationHandlers as Record<string, RotationHandler> | undefined;
  if (!handlers) return null;
  const handler = handlers[variable.fullName] ?? handlers[variable.name];
  return typeof handler === "function" ? handler : null;
}

function existingFile(basePath: string): string | null {
  for (const ext of FILE_EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export async function loadRotationHandler(variable: SenvarVariable): Promise<RotationHandler | null> {
  if (!fs.existsSync(ROTATION_DIR)) return null;

  const candidateNames = [
    path.join(ROTATION_DIR, variable.fullName),
    path.join(ROTATION_DIR, variable.name),
  ];

  for (const candidate of candidateNames) {
    const file = existingFile(candidate);
    if (file) {
      const handler = await tryImportHandler(file);
      if (handler) return handler;
    }
  }

  const mapCandidates = [path.join(ROTATION_DIR, "index"), path.join(ROTATION_DIR, "handlers")];

  for (const candidate of mapCandidates) {
    const file = existingFile(candidate);
    if (file) {
      const handler = await tryImportHandlerMap(file, variable);
      if (handler) return handler;
    }
  }

  return null;
}

