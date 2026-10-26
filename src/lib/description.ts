import { DomainError } from "@/lib/errors";

export const listingDescriptionLimit = 400;

export function readListingDescription(raw: string) {
  const description = raw.trim();
  if (description.length > listingDescriptionLimit) {
    throw new DomainError(`Описание — не больше ${listingDescriptionLimit} символов`);
  }
  return description;
}
