import { Secret } from "@senvar/secrets";

const dbPassword = new Secret("dbPassword");

export async function main() {
  const value = await dbPassword.get();

  console.log(`[secrets] loaded dbPassword (length=${value.length})`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Secrets SDK + SST example",
      retrievedAt: new Date().toISOString(),
      valueLength: value.length,
    }),
  };
}

