import { sql } from "drizzle-orm";
import { db } from "./index";

const searchVersion = "cards-v1";

let ready: Promise<void> | null = null;

export function ensureSearch() {
  ready ??= installSearch()
    .then(() => undefined)
    .catch((error: unknown) => {
      ready = null;
      throw error;
    });
  return ready;
}

async function installSearch() {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(8412001)`);
    await tx.execute(sql`
      CREATE OR REPLACE FUNCTION search_fold(value text)
      RETURNS text
      LANGUAGE sql
      IMMUTABLE
      AS $$
        SELECT translate(
          replace(replace(coalesce(value, ''), 'Ё', 'е'), 'ё', 'е'),
          'ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
          'abcdefghijklmnopqrstuvwxyzабвгдежзийклмнопрстуфхцчшщъыьэюя'
        )
      $$
    `);
    await tx.execute(sql`
      CREATE OR REPLACE FUNCTION listing_search_tsvector(p listings)
      RETURNS tsvector
      LANGUAGE sql
      STABLE
      AS $$
        SELECT
          setweight(to_tsvector('russian', search_fold(concat_ws(' ', p.title, p.brand, p.model))), 'A')
          || setweight(to_tsvector('simple', search_fold(concat_ws(
            ' ',
            p.model,
            p.year::text,
            (SELECT n.sku FROM nomenclature n WHERE n.id = p.nomenclature_id)
          ))), 'A')
          || setweight(to_tsvector('russian', search_fold(concat_ws(
            ' ',
            p.city,
            (
              SELECT string_agg(concat_ws(' ', la.value_text, la.value_number::text), ' ')
              FROM listing_attributes la
              WHERE la.listing_id = p.id
            )
          ))), 'B')
          || setweight(to_tsvector('russian', search_fold(coalesce(p.description, ''))), 'C')
      $$
    `);
    await tx.execute(sql`
      CREATE OR REPLACE FUNCTION listings_search_query(raw text)
      RETURNS tsquery
      LANGUAGE plpgsql
      STABLE
      AS $$
      DECLARE
        cleaned text;
        words text[];
        word text;
        piece text;
        result tsquery;
      BEGIN
        cleaned := btrim(regexp_replace(search_fold(left(coalesce(raw, ''), 160)), '[^0-9a-zа-я.]+', ' ', 'g'));
        IF cleaned = '' THEN
          RETURN NULL;
        END IF;
        words := regexp_split_to_array(cleaned, ' +');
        words := words[1:12];
        result := NULL;
        FOREACH word IN ARRAY words LOOP
          IF char_length(word) < 2 THEN
            CONTINUE;
          END IF;
          SELECT string_agg(quote_literal(lexeme) || ':*', ' | ')
            INTO piece
          FROM (
            SELECT lexeme FROM unnest(to_tsvector('russian', word))
            UNION
            SELECT lexeme FROM unnest(to_tsvector('simple', word))
          ) lexemes
          WHERE char_length(lexeme) >= 2;
          IF piece IS NULL THEN
            CONTINUE;
          END IF;
          IF result IS NULL THEN
            result := piece::tsquery;
          ELSE
            result := result && piece::tsquery;
          END IF;
        END LOOP;
        RETURN result;
      END;
      $$
    `);
    await tx.execute(sql`
      CREATE OR REPLACE FUNCTION listings_search_vector_update()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        NEW.search_vector := listing_search_tsvector(NEW);
        RETURN NEW;
      END;
      $$
    `);
    await tx.execute(sql`
      CREATE OR REPLACE FUNCTION listings_refresh_search_vector()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      DECLARE
        target uuid;
      BEGIN
        target := COALESCE(NEW.listing_id, OLD.listing_id);
        UPDATE listings
        SET search_vector = listing_search_tsvector(listings)
        WHERE id = target;
        RETURN NULL;
      END;
      $$
    `);
    await tx.execute(sql`
      CREATE OR REPLACE FUNCTION nomenclature_refresh_search_vector()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.sku IS DISTINCT FROM OLD.sku THEN
          UPDATE listings
          SET search_vector = listing_search_tsvector(listings)
          WHERE nomenclature_id = NEW.id;
        END IF;
        RETURN NULL;
      END;
      $$
    `);
    await tx.execute(sql`DROP TRIGGER IF EXISTS listings_search_vector_trg ON listings`);
    await tx.execute(sql`
      CREATE TRIGGER listings_search_vector_trg
      BEFORE INSERT OR UPDATE OF title, brand, model, description, city, year, nomenclature_id
      ON listings
      FOR EACH ROW
      EXECUTE FUNCTION listings_search_vector_update()
    `);
    await tx.execute(sql`DROP TRIGGER IF EXISTS listing_attributes_search_trg ON listing_attributes`);
    await tx.execute(sql`
      CREATE TRIGGER listing_attributes_search_trg
      AFTER INSERT OR UPDATE OR DELETE
      ON listing_attributes
      FOR EACH ROW
      EXECUTE FUNCTION listings_refresh_search_vector()
    `);
    await tx.execute(sql`DROP TRIGGER IF EXISTS nomenclature_search_trg ON nomenclature`);
    await tx.execute(sql`
      CREATE TRIGGER nomenclature_search_trg
      AFTER UPDATE OF sku
      ON nomenclature
      FOR EACH ROW
      EXECUTE FUNCTION nomenclature_refresh_search_vector()
    `);
    const existing = await tx.execute<{ ready: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'listings_search_idx'
      ) AS ready
    `);
    const indexReady = existing[0]?.ready === true;
    if (!indexReady) {
      await tx.execute(sql`
        CREATE INDEX listings_search_idx ON listings USING GIN (search_vector)
      `);
    }
    const marked = await tx.execute<{ version: string | null }>(sql`
      SELECT obj_description('public.listing_search_tsvector(public.listings)'::regprocedure) AS version
    `);
    if (marked[0]?.version !== searchVersion) {
      await tx.execute(sql`
        UPDATE listings
        SET search_vector = listing_search_tsvector(listings)
      `);
      await tx.execute(sql`
        COMMENT ON FUNCTION listing_search_tsvector(listings) IS 'cards-v1'
      `);
    } else {
      await tx.execute(sql`
        UPDATE listings
        SET search_vector = listing_search_tsvector(listings)
        WHERE search_vector IS NULL
      `);
    }
  });
}
