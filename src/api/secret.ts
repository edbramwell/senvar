import { SenvarVariable } from "./base";
import type { SenvarVariableOptions, RotationHandler, ValueOptions } from "./types";
import { deleteSecret, ensureSecret, getSecretValue, setSecretValue } from "../providers/secretsManager";

export class Secret extends SenvarVariable {
  constructor(name: string, options: SenvarVariableOptions = {}) {
    super(name, options);
  }

  static fromName(fullName: string, options: SenvarVariableOptions = {}): Secret {
    // Support both path format (/senvar/app/stage/name) and legacy format (app-stage-name)
    if (fullName.startsWith("/senvar/")) {
      const parts = fullName.split("/").filter(Boolean);
      if (parts.length !== 4 || parts[0] !== "senvar" || !parts[1] || !parts[2] || !parts[3]) {
        throw new Error(`Full secret name "${fullName}" must follow /senvar/app/stage/name format.`);
      }
      return new Secret(parts[3], { ...options, app: parts[1], stage: parts[2] });
    } else {
      // Legacy format support
      const [app, stage, ...rest] = fullName.split("-");
      if (rest.length === 0 || !app || !stage) {
        throw new Error(`Full secret name "${fullName}" must follow /senvar/app/stage/name or app-stage-var format.`);
      }
      return new Secret(rest.join("-"), { ...options, app, stage });
    }
  }

  async ensure(options?: ValueOptions): Promise<void> {
    await ensureSecret(this.fullName, {
      ...this.valueOptions(options),
      tags: this.tags,
    });
  }

  async get(options?: ValueOptions): Promise<string> {
    return getSecretValue(this.fullName, this.valueOptions(options));
  }

  async set(value: string, options?: ValueOptions): Promise<void> {
    // Ensure secret exists first (create if it doesn't)
    try {
      await this.ensure(options);
    } catch (error) {
      // If ensure fails for any reason other than already exists, try to set anyway
      // (the set operation might work if secret was just created)
    }
    
    // Now set the value
    await setSecretValue(this.fullName, value, this.valueOptions(options));
  }

  async rotate(handler: RotationHandler, options?: ValueOptions): Promise<string> {
    const currentValue = await this.safeGet(options);
    const nextValue = await handler(currentValue);
    await this.set(nextValue, options);
    return nextValue;
  }

  async delete(options?: ValueOptions & { permanent?: boolean }): Promise<void> {
    await deleteSecret(this.fullName, {
      ...this.valueOptions(options),
      force: options?.permanent ?? false,
    });
  }

  private async safeGet(options?: ValueOptions): Promise<string | null> {
    try {
      return await this.get(options);
    } catch (error) {
      if ((error as Error).name === "ResourceNotFoundException") {
        return null;
      }
      throw error;
    }
  }
}

