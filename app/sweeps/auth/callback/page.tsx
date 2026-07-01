"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setAuthToken } from "@/lib/sweepsApi";

export default function SweepsAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    if (token) {
      setAuthToken(token);
    }
    router.replace("/sweeps");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-gray-600">Signing you in…</p>
    </main>
  );
}
