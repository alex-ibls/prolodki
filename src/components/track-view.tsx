"use client";

import { useEffect } from "react";
import { recordViewAction } from "@/actions/activity";

export function TrackView({ listingId, slug }: { listingId: string; slug: string }) {
  useEffect(() => {
    void recordViewAction(listingId, slug);
  }, [listingId, slug]);
  return null;
}
