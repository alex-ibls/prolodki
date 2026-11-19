import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config();

if (!process.env.DATABASE_URL?.trim()) {
  const host = process.env.POSTGRESQL_HOST?.trim() ?? "";
  const user = process.env.POSTGRESQL_USER?.trim() ?? "";
  const password = process.env.POSTGRESQL_PASSWORD ?? "";
  const database = process.env.POSTGRESQL_DBNAME?.trim() ?? "";
  const port = process.env.POSTGRESQL_PORT?.trim() || "5432";
  if (host && user && password && database) {
    const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
    process.env.DATABASE_URL = `postgresql://${auth}@${host}:${port}/${database}?sslmode=require`;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
