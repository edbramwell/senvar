#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binDir = path.join(process.cwd(), "node_modules", ".bin");
const secretsPkg = path.join(process.cwd(), "node_modules", "@senvar", "secrets");
const senvarTarget = path.join("..", "@senvar", "secrets", "src", "cli", "index.ts");
const senvarLink = path.join(binDir, "senvar");

if (fs.existsSync(secretsPkg)) {
  fs.mkdirSync(binDir, { recursive: true });
  try {
    if (fs.existsSync(senvarLink)) {
      fs.unlinkSync(senvarLink);
    }
    fs.symlinkSync(senvarTarget, senvarLink, "file");
    console.log("✓ Linked 'senvar' binary");
  } catch (error) {
    if (error.code !== "EEXIST") {
      console.error("Failed to create senvar symlink:", error.message);
      process.exit(1);
    }
  }
}

