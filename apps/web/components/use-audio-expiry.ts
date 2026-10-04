"use client";
import { useEffect } from "react";

// Re-arm bounded waits without relying on a rerender of an unchanged session.
// A single 30-day timeout overflows the browser's signed 32-bit timer delay.
export function useAudioExpiry(
  expiresAt: string | undefined,
  onExpire: () => void,
) {
  useEffect(() => {
    if (!expiresAt) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      if (cancelled) return;
      const remaining = Date.parse(expiresAt) - Date.now();
      if (remaining <= 0) {
        onExpire();
        return;
      }
      timer = setTimeout(check, Math.min(remaining, 86400000));
    };
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expiresAt, onExpire]);
}
