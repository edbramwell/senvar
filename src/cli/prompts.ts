import prompts from "prompts";

export async function promptForValue(message: string, initial?: string): Promise<string> {
  const { value } = await prompts({
    type: "password",
    name: "value",
    message,
    initial,
    validate: (v: string) => (v && v.length > 0 ? true : "Value is required"),
  });

  if (typeof value !== "string") {
    throw new Error("Input cancelled.");
  }

  return value;
}

export async function confirm(message: string): Promise<boolean> {
  const { ok } = await prompts({
    type: "confirm",
    name: "ok",
    message,
    initial: false,
  });
  return Boolean(ok);
}

