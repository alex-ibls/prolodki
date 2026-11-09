import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { postgresCredentials } from "./src/db/postgres";

const db = postgresCredentials();

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: "url" in db ? { url: db.url } : {
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
    ssl: db.ssl,
  },
});
