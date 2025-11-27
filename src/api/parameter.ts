import { SenvarVariable } from "./base";
import type { SenvarVariableOptions, ValueOptions } from "./types";
import { deleteParameter, getParameter, putParameter } from "../providers/ssm";

export class Parameter extends SenvarVariable {
  constructor(name: string, options: SenvarVariableOptions = {}) {
    super(name, options);
  }

  static fromName(fullName: string, options: SenvarVariableOptions = {}): Parameter {
    // Support both path format (/senvar/app/stage/name) and legacy format (app-stage-name)
    if (fullName.startsWith("/senvar/")) {
      const parts = fullName.split("/").filter(Boolean);
      if (parts.length !== 4 || parts[0] !== "senvar" || !parts[1] || !parts[2] || !parts[3]) {
        throw new Error(`Full parameter name "${fullName}" must follow /senvar/app/stage/name format.`);
      }
      return new Parameter(parts[3], { ...options, app: parts[1], stage: parts[2] });
    } else {
      // Legacy format support
      const [app, stage, ...rest] = fullName.split("-");
      if (rest.length === 0 || !app || !stage) {
        throw new Error(`Full parameter name "${fullName}" must follow /senvar/app/stage/name or app-stage-var format.`);
      }
      return new Parameter(rest.join("-"), { ...options, app, stage });
    }
  }

  async ensure(options?: ValueOptions & { secure?: boolean }): Promise<void> {
    try {
      await putParameter(this.fullName, "", {
        ...this.valueOptions(options),
        secure: options?.secure ?? true,
        overwrite: false,
        tags: this.tags,
      });
    } catch (error) {
      if ((error as Error).name === "ParameterAlreadyExists") return;
      throw error;
    }
  }

  async get(options?: ValueOptions): Promise<string> {
    return getParameter(this.fullName, this.valueOptions(options));
  }

  async set(value: string, options?: ValueOptions & { secure?: boolean }): Promise<void> {
    const valueOpts = this.valueOptions(options);
    const secure = options?.secure ?? true;
    
    // Try to set with overwrite:false first (creates new parameter with tags)
    // If it already exists, this will fail and we'll retry with overwrite:true
    try {
      await putParameter(this.fullName, value, {
        ...valueOpts,
        secure,
        overwrite: false,
        tags: this.tags,
      });
    } catch (error) {
      const err = error as Error;
      // If parameter already exists, update it (tags will be added separately)
      if (err.name === "ParameterAlreadyExists" || err.message?.includes("already exists")) {
        await putParameter(this.fullName, value, {
          ...valueOpts,
          secure,
          overwrite: true,
          tags: this.tags, // Tags will be added via AddTagsToResource in putParameter
        });
      } else {
        throw error;
      }
    }
  }

  async delete(options?: ValueOptions): Promise<void> {
    await deleteParameter(this.fullName, this.valueOptions(options));
  }
}

