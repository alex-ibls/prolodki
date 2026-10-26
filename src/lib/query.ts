export async function readQuery(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
) {
  const raw = await searchParams;
  const one = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  return { raw, one };
}
