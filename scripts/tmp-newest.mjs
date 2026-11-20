import postgres from "postgres";
import { applyDatabaseUrl } from "./database-url.mjs";

applyDatabaseUrl();
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const rows = await sql`
    select title, price_kopeks, created_at
    from listings
    where status = 'published'
    order by created_at desc, id desc
    limit 8
  `;
  console.log(rows.map((row) => `${row.created_at.toISOString()} ${row.price_kopeks / 100} ${row.title}`).join("\n"));
} finally {
  await sql.end({ timeout: 5 });
}
