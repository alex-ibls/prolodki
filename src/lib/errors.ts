export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export function isNextNavigation(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  return String((error as { digest?: string }).digest).startsWith("NEXT_");
}
