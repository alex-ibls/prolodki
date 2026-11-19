import { config } from "dotenv";

config();

export function applyDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return;
  const host = process.env.POSTGRESQL_HOST?.trim() ?? "";
  const user = process.env.POSTGRESQL_USER?.trim() ?? "";
  const password = process.env.POSTGRESQL_PASSWORD ?? "";
  const database = process.env.POSTGRESQL_DBNAME?.trim() ?? "";
  const port = process.env.POSTGRESQL_PORT?.trim() || "5432";
  if (!host || !user || !password || !database) {
    console.error("Задайте DATABASE_URL или POSTGRESQL_HOST, POSTGRESQL_USER, POSTGRESQL_PASSWORD и POSTGRESQL_DBNAME.");
    process.exit(1);
  }
  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
  process.env.DATABASE_URL = `postgresql://${auth}@${host}:${port}/${database}?sslmode=require`;
}
