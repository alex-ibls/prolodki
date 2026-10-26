"use client";

import { useEffect } from "react";
import { recordViewAction } from "@/actions/activity";

export function TrackView({ listingId, slug }: { listingId: string; slug: string }) {
  useEffect(() => {
    const key = `prolodki-view:${listingId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void recordViewAction(listingId, slug);
  }, [listingId, slug]);
  return null;
}
