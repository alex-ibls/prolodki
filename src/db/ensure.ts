import { sql } from "drizzle-orm";
import { db } from "./index";

export async function ensureSearch() {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION listings_search_vector_update()
    RETURNS trigger AS $$
    BEGIN
      NEW.search_vector := to_tsvector(
        'russian',
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.brand, '') || ' ' ||
        coalesce(NEW.model, '') || ' ' ||
        coalesce(NEW.description, '')
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS listings_search_vector_trg ON listings`);
  await db.execute(sql`
    CREATE TRIGGER listings_search_vector_trg
    BEFORE INSERT OR UPDATE OF title, brand, model, description
    ON listings
    FOR EACH ROW
    EXECUTE FUNCTION listings_search_vector_update()
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS listings_search_idx ON listings USING GIN (search_vector)
  `);
}
