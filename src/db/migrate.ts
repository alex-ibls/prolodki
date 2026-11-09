import "dotenv/config";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { client, db } from "./index";
import { ensureSearch } from "./ensure";

const migrationsFolder = "drizzle";

async function stampBaseline() {
  const [baseline] = readMigrationFiles({ migrationsFolder });
  if (!baseline) return;
  const [listing] = await client<{ exists: string | null }[]>`
    select to_regclass('public.listings')::text as exists
  `;
  if (!listing?.exists) return;

  await client`create schema if not exists drizzle`;
  await client`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;
  const [last] = await client<{ created_at: string | null }[]>`
    select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1
  `;
  if (last && Number(last.created_at) >= baseline.folderMillis) return;
  await client`
    insert into drizzle.__drizzle_migrations (hash, created_at)
    values (${baseline.hash}, ${baseline.folderMillis})
  `;
}

async function main() {
  await client`set client_min_messages to warning`;
  await stampBaseline();
  await migrate(db, { migrationsFolder });
  await ensureSearch();
  const [applied] = await client<{ count: number }[]>`
    select count(*)::int as count from drizzle.__drizzle_migrations
  `;
  console.log(`Миграции применены: ${applied?.count ?? 0}`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
