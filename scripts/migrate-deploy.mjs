import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import postgres from "postgres";
import { applyDatabaseUrl } from "./database-url.mjs";

applyDatabaseUrl();

const require = createRequire(import.meta.url);
const cli = require.resolve("prisma/build/index.js");

function runMigrate() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, "migrate", "deploy"], {
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";
    const forward = (chunk, stream) => {
      const text = chunk.toString();
      output += text;
      stream.write(chunk);
    };
    child.stdout.on("data", (chunk) => forward(chunk, process.stdout));
    child.stderr.on("data", (chunk) => forward(chunk, process.stderr));
    child.on("exit", (code) => resolve({ code: code ?? 1, output }));
  });
}

function needsReplacement(output) {
  return /P3005|database schema is not empty/i.test(output);
}

async function replacePublicSchema() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await sql.unsafe("CREATE SCHEMA public");
    await sql.unsafe("GRANT ALL ON SCHEMA public TO CURRENT_USER");
    await sql.unsafe("GRANT ALL ON SCHEMA public TO public");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const first = await runMigrate();
if (first.code === 0 || !needsReplacement(first.output)) {
  process.exit(first.code);
}

console.error("База уже заполнена и не содержит истории Prisma. Текущие миграции заменят схему public и данные в ней.");
try {
  await replacePublicSchema();
} catch (error) {
  const message = String(error?.message || error).replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://…");
  console.error(`Не удалось заменить схему: ${message}`);
  process.exit(first.code);
}

const second = await runMigrate();
process.exit(second.code);
