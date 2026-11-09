export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL && !process.env.POSTGRESQL_HOST) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { ensureSearch } = await import("./db/ensure");
  await ensureSearch();
}
