"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Reloads the tracking page's data every 20 seconds, so a status change shows without tapping anything.
export default function Refresh({ label }: { label: string }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(timer);
  }, [router]);
  return <p style={{ color: "var(--muted, #666)", fontSize: "0.9rem", textAlign: "center" }}>{label}</p>;
}
