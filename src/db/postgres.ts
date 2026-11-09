export type PostgresCredentials =
  | { url: string }
  | { host: string; port: number; user: string; password: string; database: string; ssl: "require" };

export function postgresCredentials(): PostgresCredentials {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return { url };

  const host = process.env.POSTGRESQL_HOST?.trim() ?? "";
  const user = process.env.POSTGRESQL_USER?.trim() ?? "";
  const password = process.env.POSTGRESQL_PASSWORD ?? "";
  const database = process.env.POSTGRESQL_DBNAME?.trim() ?? "";
  const port = Number(process.env.POSTGRESQL_PORT || "5432");
  if (!host || !user || !password || !database) {
    throw new Error(
      "Задайте DATABASE_URL или POSTGRESQL_HOST, POSTGRESQL_PORT, POSTGRESQL_USER, POSTGRESQL_PASSWORD и POSTGRESQL_DBNAME",
    );
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("POSTGRESQL_PORT указан неверно");
  }
  return { host, port, user, password, database, ssl: "require" };
}
