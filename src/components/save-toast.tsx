"use client";

import { useEffect, useState } from "react";

export function SaveToast({ message }: { message: string }) {
  const [open, setOpen] = useState(Boolean(message));

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setOpen(false), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!open || !message) return null;
  return (
    <p className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-md bg-deep px-4 py-3 text-sm text-white shadow md:bottom-6" role="status">
      {message}
    </p>
  );
}
