#!/usr/bin/env bun
import { Command } from "commander";
import kleur from "kleur";
import { handleDefineCommand } from "./commands/define";
import { handleGetCommand } from "./commands/get";
import { handleSetCommand } from "./commands/set";
import { handleRotateCommand } from "./commands/rotate";
import { handleDeleteCommand } from "./commands/delete";
import { handleListCommand } from "./commands/list";
import { handlePulumiGenerateCommand } from "./commands/pulumi";
import type { CliGlobalOptions } from "./context";

const VERSION = process.env.npm_package_version ?? "0.0.0";

const program = new Command();
program
  .name("senvar")
  .description("Secure ENvironment VARiables - Manage secrets and parameters")
  .version(VERSION)
  .option("--app <app>", "App name override")
  .option("--stage <stage>", "Stage/environment override")
  .option("--region <region>", "AWS region override")
  .option("--profile <profile>", "AWS profile override");

const getGlobals = (command: Command): CliGlobalOptions =>
  (command.parent ?? command).opts<CliGlobalOptions>();

// Secret subcommand
const secretCommand = program
  .command("secret")
  .description("Manage secrets (stored in AWS Secrets Manager, supports rotation)");

secretCommand
  .command("define")
  .description("Ensure a secret exists without setting a value")
  .argument("<name>", "Secret identifier")
  .action(async (name: string, options, command: Command) => {
    await handleDefineCommand(name, { secret: true }, getGlobals(command));
  });

secretCommand
  .command("get")
  .description("Fetch the value of a secret")
  .argument("<name>", "Secret identifier")
  .action(async (name: string, options, command: Command) => {
    await handleGetCommand(name, { secret: true }, getGlobals(command));
  });

secretCommand
  .command("set")
  .description("Set the value of a secret")
  .argument("<name>", "Secret identifier")
  .argument("[value]", "Value to set (prompts if omitted)")
  .action(async (name: string, value: string | undefined, options, command: Command) => {
    await handleSetCommand(name, value, { secret: true }, getGlobals(command));
  });

secretCommand
  .command("rotate")
  .description("Rotate a secret value, either interactively or via registered handler")
  .argument("<name>", "Secret identifier")
  .option("--auto", "Invoke user-defined rotation handler")
  .action(async (name: string, options, command: Command) => {
    await handleRotateCommand(name, { ...options, secret: true }, getGlobals(command));
  });

secretCommand
  .command("delete")
  .description("Delete a secret")
  .argument("<name>", "Secret identifier")
  .option("--force", "Skip confirmation")
  .option("--permanent", "Permanently delete (irreversible)")
  .action(async (name: string, options, command: Command) => {
    await handleDeleteCommand(name, { ...options, secret: true }, getGlobals(command));
  });

secretCommand
  .command("list")
  .description("List secrets (defaults to current app/stage prefix)")
  .argument("[prefix]", "Custom prefix")
  .option("--force-show", "Show actual secret values (not obscured)")
  .action(async (prefix: string | undefined, options: { forceShow?: boolean }, command: Command) => {
    await handleListCommand({ ...options, prefix, secret: true, forceShow: options.forceShow }, getGlobals(command));
  });

// Parameter subcommand
const parameterCommand = program
  .command("parameter")
  .description("Manage parameters (stored in AWS SSM Parameter Store)");

parameterCommand
  .command("define")
  .description("Ensure a parameter exists without setting a value")
  .argument("<name>", "Parameter identifier")
  .action(async (name: string, options, command: Command) => {
    await handleDefineCommand(name, { secret: false }, getGlobals(command));
  });

parameterCommand
  .command("get")
  .description("Fetch the value of a parameter")
  .argument("<name>", "Parameter identifier")
  .action(async (name: string, options, command: Command) => {
    await handleGetCommand(name, { secret: false }, getGlobals(command));
  });

parameterCommand
  .command("set")
  .description("Set the value of a parameter")
  .argument("<name>", "Parameter identifier")
  .argument("[value]", "Value to set (prompts if omitted)")
  .action(async (name: string, value: string | undefined, options, command: Command) => {
    await handleSetCommand(name, value, { secret: false }, getGlobals(command));
  });

parameterCommand
  .command("delete")
  .description("Delete a parameter")
  .argument("<name>", "Parameter identifier")
  .option("--force", "Skip confirmation")
  .action(async (name: string, options, command: Command) => {
    await handleDeleteCommand(name, { ...options, secret: false }, getGlobals(command));
  });

parameterCommand
  .command("list")
  .description("List parameters (defaults to current app/stage prefix)")
  .argument("[prefix]", "Custom prefix")
  .action(async (prefix: string | undefined, options, command: Command) => {
    await handleListCommand({ ...options, prefix, secret: false }, getGlobals(command));
  });

// Top-level list command (lists both secrets and parameters)
program
  .command("list")
  .description("List both secrets and parameters (defaults to current app/stage prefix)")
  .argument("[prefix]", "Custom prefix")
  .action(async (prefix: string | undefined, options, command: Command) => {
    await handleListCommand({ ...options, prefix }, getGlobals(command));
  });

// Pulumi generation (works for both)
program
  .command("pulumi:generate")
  .description("Create Pulumi scaffolding for secrets and parameters")
  .option("--force", "Overwrite existing files")
  .action(async (options, command: Command) => {
    await handlePulumiGenerateCommand(options, getGlobals(command));
  });

program.configureOutput({
  outputError: str => console.error(kleur.red(str)),
});

program.parseAsync().catch(error => {
  console.error(kleur.red(error.message));
  process.exitCode = 1;
});

