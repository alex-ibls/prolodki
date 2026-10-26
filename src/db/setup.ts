import "dotenv/config";
import { client } from "./index";
import { ensureCatalogStructure } from "./catalog-baseline";
import { ensureSearch } from "./ensure";
import { seed } from "./seed";

async function main() {
  await ensureSearch();
  await seed();
  await ensureCatalogStructure();
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
