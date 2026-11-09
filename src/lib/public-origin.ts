export function isLoopbackHost(value: string) {
  let host = value.trim().toLowerCase();
  if (host.startsWith("[")) host = host.slice(1, host.indexOf("]"));
  else host = host.replace(/:\d+$/, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function publicAuthUrl() {
  const raw = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (isLoopbackHost(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function useRequestHostForAuth() {
  if (process.env.NODE_ENV !== "production") return;
  for (const key of ["AUTH_URL", "NEXTAUTH_URL"] as const) {
    const value = process.env[key];
    if (!value) continue;
    try {
      if (isLoopbackHost(new URL(value).hostname)) delete process.env[key];
    } catch {
      delete process.env[key];
    }
  }
}
